import { useEffect, useState, useRef } from "react";
import {
  subscribeToOrders,
  updateOrderStatus,
} from "../../services/orderService";

import { DEFAULT_PROVIDER_ID } from "../../config/providerConfig";

const getTimeAgo = (seconds) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
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
    }
  };

  const getOrderPriority = (seconds) => {
    const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
    if (minutes >= 10) return "#ffdddd";
    if (minutes >= 5) return "#fff3cd";
    return "#ddffdd";
  };

  const getPriorityLabel = (seconds) => {
    const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
    if (minutes >= 10) return "🔴 High Priority";
    if (minutes >= 5) return "🟡 Medium Priority";
    return "🟢 Fresh";
  };

  const renderOrderCard = (order) => (
    <div
      key={order.id}
      style={{
        border: "1px solid #ccc",
        padding: "15px",
        marginBottom: "15px",
        borderRadius: "8px",
        backgroundColor: getOrderPriority(
          order.timeline?.placedAt?.seconds || 0
        ),
      }}
    >
      <h3>Order #{order.id}</h3>

      <p>
        <strong>Placed:</strong>{" "}
        {order.timeline?.placedAt?.seconds
          ? getTimeAgo(order.timeline.placedAt.seconds)
          : "Unknown"}
      </p>

      <p>
        <strong>Priority:</strong>{" "}
        {getPriorityLabel(order.timeline?.placedAt?.seconds || 0)}
      </p>

      <p>
        <strong>Status:</strong>{" "}
        <span
          style={{
            marginLeft: "10px",
            padding: "5px 10px",
            borderRadius: "20px",
            color: "white",
            backgroundColor:
              order.status === "placed"
                ? "#f39c12"
                : order.status === "accepted"
                ? "#3498db"
                : order.status === "preparing"
                ? "#e67e22"
                : order.status === "ready"
                ? "#27ae60"
                : "#7f8c8d",
          }}
        >
          {order.status?.toUpperCase()}
        </span>
      </p>

      {order.status === "placed" && (
        <button onClick={() => handleStatusChange(order.id, "accepted")}>
          Accept Order
        </button>
      )}

      {order.status === "accepted" && (
        <button onClick={() => handleStatusChange(order.id, "preparing")}>
          Start Preparing
        </button>
      )}

      {order.status === "preparing" && (
        <button onClick={() => handleStatusChange(order.id, "ready")}>
          Mark Ready
        </button>
      )}

      {order.status === "ready" && (
        <button onClick={() => handleStatusChange(order.id, "completed")}>
          Complete Order
        </button>
      )}

      <p>
        <strong>Total:</strong> ${order.pricing?.total || 0}
      </p>

      <p>
        <strong>Items Count:</strong> {order.items?.length || 0}
      </p>
    </div>
  );

  const placedOrders = orders.filter((o) => o.status === "placed");
  const acceptedOrders = orders.filter((o) => o.status === "accepted");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");
  const completedOrders = orders.filter((o) => o.status === "completed");

  return (
    <div style={{ padding: "20px" }}>
      <h1>Kitchen Orders Dashboard</h1>

      <h2>🟡 New ({placedOrders.length})</h2>
      {placedOrders.map(renderOrderCard)}

      <h2>🔵 Accepted ({acceptedOrders.length})</h2>
      {acceptedOrders.map(renderOrderCard)}

      <h2>🟠 Preparing ({preparingOrders.length})</h2>
      {preparingOrders.map(renderOrderCard)}

      <h2>🟢 Ready ({readyOrders.length})</h2>
      {readyOrders.map(renderOrderCard)}

      <button onClick={() => setShowCompleted(!showCompleted)}>
        {showCompleted ? "Hide Completed" : "Show Completed"}
      </button>

      {showCompleted && (
        <>
          <h2>⚫ Completed ({completedOrders.length})</h2>
          {completedOrders.map(renderOrderCard)}
        </>
      )}
    </div>
  );
}

export default OrdersPage;