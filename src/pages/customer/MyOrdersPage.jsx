import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

import {
  subscribeToUserOrders,
  getUserOrderHistory,
} from "../../services/orderService";

const getStatusColor = (status) => {
  switch (status) {
    case "placed":
      return "#f39c12";
    case "accepted":
      return "#3498db";
    case "preparing":
      return "#e67e22";
    case "ready":
      return "#27ae60";
    case "completed":
      return "#7f8c8d";
    default:
      return "#999";
  }
};

const getTimeAgo = (seconds) => {
  const diff = Math.floor(Date.now() / 1000 - seconds);

  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;

  return `${Math.floor(diff / 86400)} days ago`;
};

function MyOrdersPage() {
  const { user } = useAuth();

  const [activeOrders, setActiveOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToUserOrders(
      user.uid,
      async (orders) => {
        console.log(
          "ACTIVE:",
          orders.map((o) => ({
            id: o.id,
            status: o.status,
          }))
        );

        setActiveOrders(orders);

        const history = await getUserOrderHistory(user.uid);

        console.log("HISTORY:", history);

        setHistoryOrders(history);

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return (
      <div>
        <Navbar />
        <h2>Please Login</h2>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div style={{ padding: "20px" }}>
        <h1>My Orders</h1>

        {loading && <p>Loading...</p>}

        {/* ACTIVE ORDERS */}
        <h2>Active Orders</h2>

        {activeOrders.length === 0 ? (
          <p>No active orders.</p>
        ) : (
          activeOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "8px",
              }}
            >
              <h3>Order #{order.id}</h3>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    background: getStatusColor(order.status),
                    color: "white",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    marginLeft: "10px",
                  }}
                >
                  {order.status?.toUpperCase()}
                </span>
              </p>

              <p>
                <strong>Total:</strong> ${order.pricing?.total}
              </p>

              <p>
                <strong>Placed:</strong>{" "}
                {order.timeline?.placedAt?.seconds
                  ? getTimeAgo(order.timeline.placedAt.seconds)
                  : "Unknown"}
              </p>

              <h4>Items</h4>

              {order.items?.map((item, index) => (
                <div key={index}>
                  {item.name} × {item.quantity}
                </div>
              ))}
            </div>
          ))
        )}

        {/* HISTORY ORDERS */}
        <h2>Order History</h2>

        {historyOrders.length === 0 ? (
          <p>No completed orders yet.</p>
        ) : (
          historyOrders.map((order) => (
            <div
              key={order.id}
              style={{
                border: "1px solid #ddd",
                padding: "15px",
                marginBottom: "15px",
                borderRadius: "8px",
                background: "#fafafa",
              }}
            >
              <h3>Order #{order.id}</h3>

              <p>
                <strong>Total:</strong> ${order.pricing?.total}
              </p>

              <p>
                <strong>Status:</strong> COMPLETED
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyOrdersPage;