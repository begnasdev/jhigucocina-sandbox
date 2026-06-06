import { useEffect, useState, useRef } from "react";
import {
  subscribeToOrders,
  updateOrderStatus,
  ORDER_FLOW,
} from "../../services/orderService";

import { DEFAULT_PROVIDER_ID } from "../../config/providerConfig";
import Navbar from "../../components/Navbar";

const getTimeAgo = (seconds) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

function OrdersPage() {
  const [orders, setOrders] = useState([]);
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

  const getPriorityLabel = (seconds) => {
    const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
    if (minutes >= 10) return "High priority";
    if (minutes >= 5) return "Medium priority";
    return "Fresh";
  };

  const nextStatus = (status) => {
    const index = ORDER_FLOW.indexOf(status);
    return index >= 0 ? ORDER_FLOW[index + 1] : null;
  };

  const renderOrderCard = (order) => {
    const next = nextStatus(order.status);

    return (
    <div
      key={order.id}
      className="card food-card"
    >
      <div className="row">
        <h3>Order #{order.id}</h3>
        <span className="pill warning">{getPriorityLabel(order.timeline?.placedAt?.seconds || 0)}</span>
      </div>

      <p>
        <strong>Placed:</strong>{" "}
        {order.timeline?.placedAt?.seconds
          ? getTimeAgo(order.timeline.placedAt.seconds)
          : "Unknown"}
      </p>

      <span className={`status-pill ${order.status}`}>{order.status}</span>

      <div>
        {order.items?.map((item, index) => (
          <div className="row" key={`${order.id}-${index}`}>
            <span>{item.name}</span>
            <strong>x{item.quantity}</strong>
          </div>
        ))}
      </div>

      <div className="row">
        <strong>Total</strong>
        <span className="price">${Number(order.pricing?.total || 0).toFixed(2)}</span>
      </div>

      {next && (
        <button className="button" onClick={() => handleStatusChange(order.id, next)}>
          Move to {next}
        </button>
      )}
    </div>
    );
  };

  const activeStatuses = ORDER_FLOW.filter((status) => status !== "completed");

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

        <section className="status-board">
          {activeStatuses.map((status) => {
            const statusOrders = orders.filter((order) => order.status === status);

            return (
              <div className="status-column" key={status}>
                <h2>{status} ({statusOrders.length})</h2>
                <div className="grid">
                  {statusOrders.length > 0 ? statusOrders.map(renderOrderCard) : (
                    <div className="empty-state">No orders in this lane.</div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </>
  );
}

export default OrdersPage;
