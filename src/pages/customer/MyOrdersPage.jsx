import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { formatNPR } from "../../utils/format";

import {
  getUserOrders,
  getUserOrderHistory,
  ORDER_FLOW,
} from "../../services/orderService";

const getTimeAgo = (seconds) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return `${Math.floor(diff / 86400)} days ago`;
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

  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    setLoading(true);

    const loadOrders = async () => {
      try {
        const [orders, history] = await Promise.all([
          getUserOrders(user.uid),
          getUserOrderHistory(user.uid),
        ]);

        if (!isMounted) return;
        setActiveOrders(orders);
        setHistoryOrders(history);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="empty-state">Please login to see your orders.</div>
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
            <p className="eyebrow">Customer order tracking</p>
            <h1>My Orders</h1>
          </div>
          <span className="pill">
            {activeOrders.length} active • {historyOrders.length} past
          </span>
        </div>

        {loading && <div className="empty-state">Loading your orders…</div>}

        <section className="section">
          <h2>Active Orders</h2>

          {activeOrders.length === 0 ? (
            <div className="empty-state">No active orders.</div>
          ) : (
            <div className="grid cards">
              {activeOrders.map((order) => (
                <article className="card food-card" key={order.id}>
                  <div className="row">
                    <h3>Order #{order.id}</h3>
                    <span className={`status-pill ${order.status}`}>{order.status}</span>
                  </div>

                  <div
                    className="progress-steps"
                    aria-label={`Order is ${order.status}`}
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
                        title={status}
                      />
                    ))}
                  </div>

                  <div className="row">
                    <span className="muted">Total</span>
                    <strong>{formatNPR(order.pricing?.total)}</strong>
                  </div>
                  <div className="row">
                    <span className="muted">Placed</span>
                    <span>
                      {order.timeline?.placedAt?.seconds
                        ? getTimeAgo(order.timeline.placedAt.seconds)
                        : "Unknown"}
                    </span>
                  </div>
                  <div className="row">
                    <span className="muted">Items</span>
                    <span>{order.items?.length || 0}</span>
                  </div>

                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setSelected(order)}
                  >
                    View details
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <h2>Order History</h2>

          {historyOrders.length === 0 ? (
            <div className="empty-state">No completed orders yet.</div>
          ) : (
            <div className="grid cards">
              {historyOrders.map((order) => (
                <article className="card" key={order.id}>
                  <span className="status-pill completed">Completed</span>
                  <h3 style={{ marginTop: 10 }}>Order #{order.id}</h3>
                  <div className="row">
                    <span className="muted">Total</span>
                    <strong>{formatNPR(order.pricing?.total)}</strong>
                  </div>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setSelected(order)}
                    style={{ marginTop: 10 }}
                  >
                    View details
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <OrderDetailModal order={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function OrderDetailModal({ order, onClose }) {
  const timeline = order.timeline || {};
  const events = [
    { key: "placedAt", label: "Placed" },
    { key: "acceptedAt", label: "Accepted" },
    { key: "preparingAt", label: "Preparing" },
    { key: "readyAt", label: "Ready" },
    { key: "completedAt", label: "Completed" },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-lg"
        role="dialog"
        aria-modal="true"
        aria-label={`Order ${order.id} details`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="row" style={{ alignItems: "start" }}>
          <div>
            <span className={`status-pill ${order.status}`}>{order.status}</span>
            <h3 style={{ margin: "8px 0 4px" }}>Order #{order.id}</h3>
            <p className="muted" style={{ fontSize: ".88rem" }}>
              Placed {fmtDateTime(timeline.placedAt?.seconds)}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <h4 style={{ marginTop: 18 }}>Items</h4>
        <div className="table-list" style={{ marginBottom: 12 }}>
          {order.items?.map((item, i) => (
            <div className="row" key={`${order.id}-i-${i}`}>
              <span>
                <strong>{item.name}</strong>
                <span className="muted" style={{ marginLeft: 8 }}>× {item.quantity}</span>
              </span>
              <span>{formatNPR(Number(item.price || 0) * item.quantity)}</span>
            </div>
          )) || <p className="muted">No items recorded.</p>}
        </div>

        <hr />

        <div className="row">
          <span className="muted">Total</span>
          <span className="price">{formatNPR(order.pricing?.total)}</span>
        </div>

        <h4 style={{ marginTop: 18 }}>Timeline</h4>
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
                  <strong>{ev.label}</strong>
                  <div className="muted" style={{ fontSize: ".85rem" }}>
                    {ts ? fmtDateTime(ts) : "Pending"}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="actions" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button className="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default MyOrdersPage;
