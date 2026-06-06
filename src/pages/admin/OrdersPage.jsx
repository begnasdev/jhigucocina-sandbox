import { useEffect, useState, useRef } from "react";
import {
  subscribeToOrders,
  updateOrderStatus,
  getAllOrderHistory,
  ORDER_FLOW,
} from "../../services/orderService";

import { DEFAULT_PROVIDER_ID } from "../../config/providerConfig";
import Navbar from "../../components/Navbar";
import { formatNPR } from "../../utils/format";

const getTimeAgo = (seconds) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

const getPriorityLevel = (seconds) => {
  const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
  if (minutes >= 10) return "high";
  if (minutes >= 5) return "medium";
  return "fresh";
};

const PRIORITY_LABEL = {
  high: "High priority",
  medium: "Medium priority",
  fresh: "Fresh",
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

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [, setClock] = useState(Date.now());

  const audioRef = useRef(null);
  const prevOrderIdsRef = useRef(new Set());
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // LOAD AUDIO
  useEffect(() => {
    audioRef.current = new Audio("/notification.mp3");
    audioRef.current.volume = 1;
  }, []);

  // UNLOCK AUDIO (browser requirement)
  useEffect(() => {
    const unlockAudio = () => {
      setAudioUnlocked(true);

      if (audioRef.current) {
        audioRef.current
          .play()
          .then(() => {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          })
          .catch(() => {});
      }

      window.removeEventListener("click", unlockAudio);
    };

    window.addEventListener("click", unlockAudio);

    return () => window.removeEventListener("click", unlockAudio);
  }, []);

  // REAL-TIME ORDERS
  useEffect(() => {
    const unsubscribe = subscribeToOrders(
      (data) => {
        const sorted = [...data].sort(
          (a, b) =>
            (b.timeline?.placedAt?.seconds || 0) -
            (a.timeline?.placedAt?.seconds || 0)
        );

        const prevIds = prevOrderIdsRef.current;

        const newOrders = sorted.filter(
          (o) =>
            o.status === "placed" &&
            !prevIds.has(o.id)
        );

        if (newOrders.length > 0 && audioUnlocked && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        prevOrderIdsRef.current = new Set(sorted.map((o) => o.id));

        setOrders(sorted);
      },
      DEFAULT_PROVIDER_ID // ✅ FIXED: provider scope added
    );

    const clockInterval = setInterval(() => {
      setClock(Date.now());
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(clockInterval);
    };
  }, [audioUnlocked]);

  // COMPLETED HISTORY (polled; service unchanged)
  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const data = await getAllOrderHistory(DEFAULT_PROVIDER_ID);
        if (!cancelled) setHistory(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadHistory();
    const historyInterval = setInterval(loadHistory, 60000);

    return () => {
      cancelled = true;
      clearInterval(historyInterval);
    };
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus, DEFAULT_PROVIDER_ID);
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
    { key: "new", label: "New", orders: newOrders },
    { key: "preparing", label: "Preparing", orders: preparingOrders },
    { key: "ready", label: "Ready", orders: readyOrders },
    { key: "completed", label: "Completed", orders: completedToday },
  ];

  const metrics = [
    { key: "new", label: "New Orders", value: newOrders.length },
    { key: "preparing", label: "Preparing", value: preparingOrders.length },
    { key: "ready", label: "Ready", value: readyOrders.length },
    { key: "completed", label: "Completed Today", value: completedToday.length },
  ];

  const renderOrderCard = (order) => {
    const next = nextStatus(order.status);
    const placedSeconds = order.timeline?.placedAt?.seconds || 0;
    const level = getPriorityLevel(placedSeconds);
    const count = itemCount(order);

    return (
      <article className="kds-card" key={order.id}>
        <header className="kds-card-head">
          <span className="kds-order-id">#{order.id}</span>
          <span className={`kds-priority ${level}`}>{PRIORITY_LABEL[level]}</span>
        </header>

        {(order.room || order.floor) && (
          <div className="kds-room">
            ROOM {order.room ?? "—"}
            {order.floor ? ` · F${order.floor}` : ""}
          </div>
        )}

        <div className="kds-card-meta">
          <span className="kds-elapsed">
            {placedSeconds ? getTimeAgo(placedSeconds) : "Unknown"}
          </span>
          <span className="kds-itemcount">
            {count} item{count === 1 ? "" : "s"}
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
              Move to {next}
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
        <div className="section-header">
          <div>
            <p className="eyebrow">Prep-line operations</p>
            <h1>Kitchen Orders</h1>
          </div>
          <span className="pill">{orders.length} active</span>
        </div>

        <section className="kds-metrics" aria-label="Kitchen metrics">
          {metrics.map((metric) => (
            <div className={`kds-metric kds-metric-${metric.key}`} key={metric.key}>
              <span className="kds-metric-value">{metric.value}</span>
              <span className="kds-metric-label">{metric.label}</span>
            </div>
          ))}
        </section>

        <section className="kds-board">
          {columns.map((column) => (
            <div className={`kds-column kds-col-${column.key}`} key={column.key}>
              <header className="kds-column-head">
                <h2>{column.label}</h2>
                <span className="kds-column-count">{column.orders.length}</span>
              </header>
              <div className="kds-column-body">
                {column.orders.length > 0 ? (
                  column.orders.map(renderOrderCard)
                ) : (
                  <div className="empty-state">No orders in this lane.</div>
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
