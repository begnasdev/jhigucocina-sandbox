import { useCallback, useEffect, useRef, useState } from "react";
import {
  subscribeToOrders,
  updateOrderStatus,
  getAllOrderHistory,
  ORDER_FLOW,
} from "../../services/orderService";

import { DEFAULT_PROVIDER_ID } from "../../config/providerConfig";
import Navbar from "../../components/Navbar";
import { useConfirm } from "../../context/ConfirmContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatNPR } from "../../utils/format";

// Final-state transitions require a confirmation dialog (translated at call time).
// Earlier transitions remain one-click.
const CONFIRM_KEYS = {
  ready: {
    title: "kds.confirmReadyTitle",
    body: "kds.confirmReadyBody",
    confirmLabel: "kds.confirmReadyLabel",
  },
  completed: {
    title: "kds.confirmCompletedTitle",
    body: "kds.confirmCompletedBody",
    confirmLabel: "kds.confirmCompletedLabel",
  },
};

const ALERT_TTL_MS = 30000;

const getTimeAgo = (seconds, t) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);

  if (diff < 60) return t("time.secondsAgo", { n: diff });
  if (diff < 3600) return t("time.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("time.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("time.daysAgo", { n: Math.floor(diff / 86400) });
};

const getPriorityLevel = (seconds) => {
  const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
  if (minutes >= 10) return "high";
  if (minutes >= 5) return "medium";
  return "fresh";
};

const PRIORITY_KEY = {
  high: "kds.priorityHigh",
  medium: "kds.priorityMedium",
  fresh: "kds.priorityFresh",
};

const isToday = (seconds) => {
  if (!seconds) return false;
  const d = new Date(seconds * 1000);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const itemCount = (order) =>
  (order.items || []).reduce((total, item) => total + (item.quantity || 0), 0);

// Derive a short, kitchen-friendly ticket from the Firestore doc id.
// Display only — does not change persisted data.
const shortTicket = (id) => {
  if (!id) return "----";
  const cleaned = String(id).replace(/[^a-zA-Z0-9]/g, "");
  const tail = cleaned.slice(-4) || cleaned;
  return tail.toUpperCase().padStart(4, "0");
};

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [, setClock] = useState(() => Date.now());

  const audioRef = useRef(null);
  const prevOrderIdsRef = useRef(new Set());
  const bootstrappedRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const confirm = useConfirm();
  const { t } = useLanguage();

  // Lane refs for mobile quick-nav (Task 1).
  const newLaneRef = useRef(null);
  const preparingLaneRef = useRef(null);
  const readyLaneRef = useRef(null);
  const completedLaneRef = useRef(null);
  const laneRefs = {
    new: newLaneRef,
    preparing: preparingLaneRef,
    ready: readyLaneRef,
    completed: completedLaneRef,
  };

  const scrollToLane = useCallback((ref) => {
    ref.current?.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }, []);

  // LOAD AUDIO
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 1;
    audioRef.current.preload = "auto";
  }, []);

  // Try to play the notification. If the browser still has audio locked
  // (e.g. policy revoked mid-session), self-heal by surfacing the banner.
  const playNotification = useCallback(() => {
    if (!audioUnlockedRef.current || !audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      const result = audioRef.current.play();
      if (result && typeof result.then === "function") {
        result.catch(() => {
          audioUnlockedRef.current = false;
          setAudioUnlocked(false);
        });
      }
    } catch {
      audioUnlockedRef.current = false;
      setAudioUnlocked(false);
    }
  }, []);

  // Explicit, user-initiated unlock from the banner button.
  // Only flips to "unlocked" after .play() actually resolves — otherwise
  // the banner stays visible so the user can try again.
  const enableAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio("/notification.mp3");
      audioRef.current.volume = 1;
    }
    const el = audioRef.current;
    const onSuccess = () => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        // pause/reset is best-effort; ignore
      }
      audioUnlockedRef.current = true;
      setAudioUnlocked(true);
    };
    try {
      const result = el.play();
      if (result && typeof result.then === "function") {
        result.then(onSuccess).catch((error) => {
          console.error("Audio unlock failed:", error);
        });
      } else {
        // Older browsers — play() returns void
        onSuccess();
      }
    } catch (error) {
      console.error("Audio unlock failed:", error);
    }
  }, []);

  // Add new-order visual alerts (auto-pruned by the TTL interval below).
  const pushAlerts = useCallback((newOrders) => {
    if (!newOrders.length) return;
    const expiresAt = Date.now() + ALERT_TTL_MS;
    setRecentAlerts((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const additions = newOrders
        .filter((o) => !existingIds.has(o.id))
        .map((o) => ({
          id: o.id,
          room: o.room || null,
          floor: o.floor || null,
          expiresAt,
        }));
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, []);

  // REAL-TIME ORDERS — subscription mounts once. Audio unlock state is read
  // via ref inside playNotification, so we never re-subscribe on unlock.
  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (data) => {
        const sorted = [...data].sort(
          (a, b) =>
            (b.timeline?.placedAt?.seconds || 0) -
            (a.timeline?.placedAt?.seconds || 0)
        );

        const prevIds = prevOrderIdsRef.current;

        // BOOTSTRAP: the first snapshot establishes the baseline of "already
        // seen" orders. We must NOT alert on existing data at page load.
        if (!bootstrappedRef.current) {
          bootstrappedRef.current = true;
          prevOrderIdsRef.current = new Set(sorted.map((o) => o.id));
          setOrders(sorted);
          return;
        }

        const newPlacedOrders = sorted.filter(
          (o) => o.status === "placed" && !prevIds.has(o.id)
        );

        if (newPlacedOrders.length > 0) {
          playNotification();
          pushAlerts(newPlacedOrders);
        }

        prevOrderIdsRef.current = new Set(sorted.map((o) => o.id));
        setOrders(sorted);
      },
      DEFAULT_PROVIDER_ID
    );

    const clockInterval = setInterval(() => {
      setClock(Date.now());
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(clockInterval);
    };
  }, [playNotification, pushAlerts]);

  // Prune expired alert chips — runs every 2s but only writes state on change.
  useEffect(() => {
    const tick = setInterval(() => {
      setRecentAlerts((prev) => {
        if (prev.length === 0) return prev;
        const now = Date.now();
        const next = prev.filter((a) => a.expiresAt > now);
        return next.length === prev.length ? prev : next;
      });
    }, 2000);
    return () => clearInterval(tick);
  }, []);

  const dismissAlert = useCallback((id) => {
    setRecentAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // COMPLETED HISTORY loader — hoisted so handleStatusChange can trigger
  // an immediate refresh on "completed" without altering the 60s poll.
  const loadHistory = useCallback(async () => {
    try {
      const data = await getAllOrderHistory(DEFAULT_PROVIDER_ID);
      setHistory(data);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    const historyInterval = setInterval(loadHistory, 60000);
    return () => clearInterval(historyInterval);
  }, [loadHistory]);

  const handleStatusChange = async (orderId, newStatus) => {
    // Final-state confirmation (Task 4).
    const confirmKeys = CONFIRM_KEYS[newStatus];
    if (confirmKeys) {
      const ok = await confirm({
        title: t(confirmKeys.title),
        body: t(confirmKeys.body),
        confirmLabel: t(confirmKeys.confirmLabel),
        cancelLabel: t("common.cancel"),
      });
      if (!ok) return;
    }

    try {
      await updateOrderStatus(orderId, newStatus, DEFAULT_PROVIDER_ID);
      // Task 2 — immediate history refresh on completion. Polling unchanged.
      if (newStatus === "completed") {
        loadHistory();
      }
    } catch (error) {
      console.error(error);
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
    }
  };

  const nextStatus = (status) => {
    const index = ORDER_FLOW.indexOf(status);
    return index >= 0 ? ORDER_FLOW[index + 1] : null;
  };

  // COLUMN MODEL (UI grouping only — Firestore status flow unchanged)
  const newOrders = orders.filter(
    (o) => o.status === "placed" || o.status === "accepted"
  );
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const completedToday = history.filter((o) =>
    isToday(o.timeline?.completedAt?.seconds)
  );

  const columns = [
    { key: "new", label: t("kds.colNew"), orders: newOrders },
    { key: "preparing", label: t("kds.colPreparing"), orders: preparingOrders },
    { key: "ready", label: t("kds.colReady"), orders: readyOrders },
    { key: "completed", label: t("kds.colCompleted"), orders: completedToday },
  ];

  const metrics = [
    { key: "new", label: t("kds.metricNew"), value: newOrders.length },
    { key: "preparing", label: t("kds.metricPreparing"), value: preparingOrders.length },
    { key: "ready", label: t("kds.metricReady"), value: readyOrders.length },
    { key: "completed", label: t("kds.metricCompleted"), value: completedToday.length },
  ];

  const renderOrderCard = (order) => {
    const next = nextStatus(order.status);
    const placedSeconds = order.timeline?.placedAt?.seconds || 0;
    const level = getPriorityLevel(placedSeconds);
    const count = itemCount(order);

    const ticket = shortTicket(order.id);

    return (
      <article
        className={`kds-card is-${level}`}
        key={order.id}
      >
        <header className="kds-card-head">
          <span
            className="kds-order-id"
            title={`Order #${order.id}`}
            aria-label={`Order #${order.id}`}
          >
            <span className="kds-ticket">#{ticket}</span>
            <span className="kds-order-full">{order.id}</span>
          </span>
          <span className={`kds-priority ${level}`}>{t(PRIORITY_KEY[level])}</span>
        </header>

        {(order.room || order.floor) && (
          <div className="kds-room">
            {t("room.room").toUpperCase()} {order.room ?? "—"}
            {order.floor ? ` · F${order.floor}` : ""}
          </div>
        )}

        <div className="kds-card-meta">
          <span className="kds-elapsed">
            {placedSeconds ? getTimeAgo(placedSeconds, t) : t("time.unknown")}
          </span>
          <span className="kds-itemcount">
            {t("kds.itemCount", { count })}
          </span>
        </div>

        <ul className="kds-items">
          {(order.items || []).map((item, index) => (
            <li className="kds-item" key={`${order.id}-${index}`}>
              <span className="kds-item-name">{item.name}</span>
              <span className="kds-item-qty">×{item.quantity}</span>
            </li>
          ))}
        </ul>

        <footer className="kds-card-foot">
          <span className="kds-total">{formatNPR(order.pricing?.total)}</span>
          {next && (
            <button
              className="button"
              onClick={() => handleStatusChange(order.id, next)}
            >
              {t("kds.moveTo", { status: t(`status.${next}`) })}
            </button>
          )}
        </footer>
      </article>
    );
  };

  return (
    <>
      <Navbar />
      <main className="page">
        {!audioUnlocked && (
          <button
            type="button"
            className="kds-audio-banner"
            onClick={enableAudio}
            aria-label={t("kds.audioAria")}
          >
            <span className="kds-audio-icon" aria-hidden="true">🔊</span>
            <span className="kds-audio-text">
              <strong>{t("kds.audioTitle")}</strong>
              <small>{t("kds.audioSub")}</small>
            </span>
          </button>
        )}

        {recentAlerts.length > 0 && (
          <div
            className="kds-alerts"
            role="status"
            aria-live="polite"
            aria-label={t("kds.newOrder")}
          >
            {recentAlerts.map((alert) => (
              <div className="kds-alert" key={`alert-${alert.id}`}>
                <span className="kds-alert-label">{t("kds.newOrder")}</span>
                {alert.room ? (
                  <span className="kds-alert-room">
                    {t("room.room")} {alert.room}
                    {alert.floor ? ` · F${alert.floor}` : ""}
                  </span>
                ) : (
                  <span className="kds-alert-room muted">{t("kds.noRoom")}</span>
                )}
                <button
                  type="button"
                  className="kds-alert-dismiss"
                  onClick={() => dismissAlert(alert.id)}
                  aria-label={t("kds.dismissAlert")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="section-header">
          <div>
            <p className="eyebrow">{t("kds.eyebrow")}</p>
            <h1>{t("kds.title")}</h1>
          </div>
          <span className="pill">{t("kds.activeCount", { count: orders.length })}</span>
        </div>

        <section className="kds-metrics" aria-label={t("kds.title")}>
          {metrics.map((metric) => (
            <div className={`kds-metric kds-metric-${metric.key}`} key={metric.key}>
              <span className="kds-metric-value">{metric.value}</span>
              <span className="kds-metric-label">{metric.label}</span>
            </div>
          ))}
        </section>

        <div className="kds-sound-status" aria-live="polite">
          {audioUnlocked ? (
            <span
              className="pill kds-sound-pill is-on"
              title={t("kds.soundOnTitle")}
            >
              <span aria-hidden="true">🟢</span> {t("kds.soundOn")}
            </span>
          ) : (
            <span
              className="pill kds-sound-pill is-off"
              title={t("kds.soundOffTitle")}
            >
              <span aria-hidden="true">🟠</span> {t("kds.soundOff")}
            </span>
          )}
        </div>

        <nav
          className="kds-tabs"
          aria-label={t("kds.jumpAria")}
        >
          {columns.map((column) => (
            <button
              key={`tab-${column.key}`}
              type="button"
              className={`kds-tab kds-tab-${column.key}`}
              onClick={() => scrollToLane(laneRefs[column.key])}
              aria-label={t("kds.tabAria", { label: column.label, count: column.orders.length })}
            >
              <span className="kds-tab-label">{column.label}</span>
              <span className="kds-tab-count">{column.orders.length}</span>
            </button>
          ))}
        </nav>

        <section className="kds-board">
          {columns.map((column) => (
            <div
              className={`kds-column kds-col-${column.key}`}
              key={column.key}
              ref={laneRefs[column.key]}
            >
              <header className="kds-column-head">
                <h2>{column.label}</h2>
                <span className="kds-column-count">{column.orders.length}</span>
              </header>
              <div className="kds-column-body">
                {column.orders.length > 0 ? (
                  column.orders.map(renderOrderCard)
                ) : (
                  <div className="empty-state">{t("kds.emptyLane")}</div>
                )}
              </div>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}

export default OrdersPage;
