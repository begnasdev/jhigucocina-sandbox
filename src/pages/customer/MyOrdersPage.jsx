import { useCallback, useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatNPR } from "../../utils/format";

import {
  getUserOrders,
  getUserOrderHistory,
  ORDER_FLOW,
} from "../../services/orderService";

const getTimeAgo = (seconds, t) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return t("time.secondsAgo", { n: diff });
  if (diff < 3600) return t("time.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("time.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("time.daysAgo", { n: Math.floor(diff / 86400) });
};

const fmtDateTime = (seconds) => {
  if (!seconds) return "—";
  try {
    return new Date(seconds * 1000).toLocaleString();
  } catch {
    return "—";
  }
};

function MyOrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return { orders: [], history: [] };
    const [orders, history] = await Promise.all([
      getUserOrders(user.uid),
      getUserOrderHistory(user.uid),
    ]);
    return { orders, history };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);

    (async () => {
      try {
        const { orders, history } = await fetchOrders();
        if (!isMounted) return;
        setActiveOrders(orders);
        setHistoryOrders(history);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, fetchOrders]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const { orders, history } = await fetchOrders();
      setActiveOrders(orders);
      setHistoryOrders(history);
      toast.success(t("orders.refreshed"));
    } catch (err) {
      console.error("Refresh failed:", err);
      toast.error(t("orders.refreshFailed"));
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="empty-state">{t("orders.pleaseLogin")}</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("orders.eyebrow")}</p>
            <h1>{t("orders.title")}</h1>
          </div>
          <div className="actions">
            <span className="pill">
              {t("orders.summary", { active: activeOrders.length, past: historyOrders.length })}
            </span>
            <button
              type="button"
              className="button ghost"
              onClick={handleRefresh}
              disabled={loading || refreshing}
              aria-label={t("common.refresh")}
            >
              {refreshing ? t("common.refreshing") : t("common.refresh")}
            </button>
          </div>
        </div>

        <section className="section">
          <h2>{t("orders.activeTitle")}</h2>

          {loading ? (
            <div className="grid cards" aria-busy="true" aria-label={t("common.loading")}>
              {[0, 1].map((i) => (
                <article className="skeleton-card" key={`skel-active-${i}`}>
                  <span className="skeleton-pill" />
                  <span className="skeleton-text lg w-50" />
                  <span className="skeleton-text w-90" />
                  <span className="skeleton-text w-70" />
                </article>
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="empty-state">{t("orders.noActive")}</div>
          ) : (
            <div className="grid cards">
              {activeOrders.map((order) => (
                <article className="card food-card" key={order.id}>
                  <div className="row">
                    <h3>{t("orders.orderNum", { id: order.id })}</h3>
                    <span className={`status-pill ${order.status}`}>
                      {t(`status.${order.status}`)}
                    </span>
                  </div>

                  <div
                    className="progress-steps"
                    aria-label={t(`status.${order.status}`)}
                  >
                    {ORDER_FLOW.map((status) => (
                      <span
                        className={`step${
                          ORDER_FLOW.indexOf(status) <=
                          ORDER_FLOW.indexOf(order.status)
                            ? " active"
                            : ""
                        }`}
                        key={status}
                        title={t(`status.${status}`)}
                      />
                    ))}
                  </div>

                  <div className="row">
                    <span className="muted">{t("orders.total")}</span>
                    <strong>{formatNPR(order.pricing?.total)}</strong>
                  </div>
                  <div className="row">
                    <span className="muted">{t("orders.placed")}</span>
                    <span>
                      {order.timeline?.placedAt?.seconds
                        ? getTimeAgo(order.timeline.placedAt.seconds, t)
                        : t("time.unknown")}
                    </span>
                  </div>
                  <div className="row">
                    <span className="muted">{t("orders.items")}</span>
                    <span>{order.items?.length || 0}</span>
                  </div>

                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setSelected(order)}
                  >
                    {t("orders.viewDetails")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h2>{t("orders.historyTitle")}</h2>

          {loading ? (
            <div className="grid cards" aria-busy="true" aria-label={t("common.loading")}>
              {[0, 1].map((i) => (
                <article className="skeleton-card" key={`skel-history-${i}`}>
                  <span className="skeleton-pill" />
                  <span className="skeleton-text lg w-50" />
                  <span className="skeleton-text w-90" />
                </article>
              ))}
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="empty-state">{t("orders.noHistory")}</div>
          ) : (
            <div className="grid cards">
              {historyOrders.map((order) => (
                <article className="card" key={order.id}>
                  <span className="status-pill completed">{t("status.completed")}</span>
                  <h3 style={{ marginTop: 10 }}>{t("orders.orderNum", { id: order.id })}</h3>
                  <div className="row">
                    <span className="muted">{t("orders.total")}</span>
                    <strong>{formatNPR(order.pricing?.total)}</strong>
                  </div>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setSelected(order)}
                    style={{ marginTop: 10 }}
                  >
                    {t("orders.viewDetails")}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} t={t} />
      )}
    </>
  );
}

function OrderDetailModal({ order, onClose, t }) {
  const timeline = order.timeline || {};
  const events = [
    { key: "placedAt", labelKey: "status.placed" },
    { key: "acceptedAt", labelKey: "status.accepted" },
    { key: "startedPreparingAt", labelKey: "status.preparing" },
    { key: "readyAt", labelKey: "status.ready" },
    { key: "completedAt", labelKey: "status.completed" },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-label={t("orders.orderNum", { id: order.id })}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ alignItems: "start" }}>
          <div>
            <span className={`status-pill ${order.status}`}>{t(`status.${order.status}`)}</span>
            <h3 style={{ margin: "8px 0 4px" }}>{t("orders.orderNum", { id: order.id })}</h3>
            <p className="muted" style={{ fontSize: ".88rem" }}>
              {t("orders.placed")} {fmtDateTime(timeline.placedAt?.seconds)}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>

        <h4 style={{ marginTop: 18 }}>{t("orders.detailItems")}</h4>
        <div className="table-list" style={{ marginBottom: 12 }}>
          {order.items?.map((item, i) => (
            <div className="row" key={`${order.id}-i-${i}`}>
              <span className="order-item-label">
                {item.imageUrl ? (
                  <span className="order-thumb">
                    <img src={item.imageUrl} alt="" loading="lazy" />
                  </span>
                ) : null}
                <span>
                  <strong>{item.name}</strong>
                  <span className="muted" style={{ marginLeft: 8 }}>× {item.quantity}</span>
                </span>
              </span>
              <span>{formatNPR(Number(item.price || 0) * item.quantity)}</span>
            </div>
          )) || <p className="muted">{t("orders.noItemsRecorded")}</p>}
        </div>

        <hr />

        {order.pricing?.deliveryFee ? (
          <div className="row">
            <span className="muted">{t("cart.roomDeliveryFee")}</span>
            <span>{formatNPR(order.pricing.deliveryFee)}</span>
          </div>
        ) : null}
        <div className="row">
          <span className="muted">{t("orders.total")}</span>
          <span className="price">{formatNPR(order.pricing?.total)}</span>
        </div>

        <h4 style={{ marginTop: 18 }}>{t("orders.timeline")}</h4>
        <ul className="timeline">
          {events.map((ev) => {
            const ts = timeline[ev.key]?.seconds;
            return (
              <li
                key={ev.key}
                className={`timeline-item${ts ? " done" : ""}`}
              >
                <span className="timeline-dot" aria-hidden="true" />
                <div>
                  <strong>{t(ev.labelKey)}</strong>
                  <div className="muted" style={{ fontSize: ".85rem" }}>
                    {ts ? fmtDateTime(ts) : t("orders.pending")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="actions" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="button" onClick={onClose}>{t("common.close")}</button>
        </div>
      </div>
    </div>
  );
}

export default MyOrdersPage;
