import { useEffect, useState } from "react";
import {
  getOrders,
  ORDER_STATUS,
} from "../../services/orderService";

function ManagerDashboard() {
  const [stats, setStats] = useState({
    activeOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    delayedOrders: 0,
    revenue: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const orders = await getOrders();

      const activeOrders = orders.length;

      const preparingOrders = orders.filter(
        (order) =>
          order.status === ORDER_STATUS.PREPARING
      ).length;

      const readyOrders = orders.filter(
        (order) =>
          order.status === ORDER_STATUS.READY
      ).length;

      const delayedOrders = orders.filter(
        (order) => {
          const placed =
            order.timeline?.placedAt?.seconds;

          if (!placed) return false;

          const ageMinutes =
            (Date.now() / 1000 - placed) / 60;

          return ageMinutes >= 10;
        }
      ).length;

      const revenue = orders.reduce(
        (total, order) =>
          total +
          (order.pricing?.total || 0),
        0
      );

      const averageOrderValue =
        activeOrders > 0
          ? revenue / activeOrders
          : 0;

      setStats({
        activeOrders,
        preparingOrders,
        readyOrders,
        delayedOrders,
        revenue,
        averageOrderValue,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Manager Dashboard</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "15px",
        }}
      >
        <DashboardCard
          title="Active Orders"
          value={stats.activeOrders}
        />

        <DashboardCard
          title="Preparing"
          value={stats.preparingOrders}
        />

        <DashboardCard
          title="Ready"
          value={stats.readyOrders}
        />

        <DashboardCard
          title="Delayed"
          value={stats.delayedOrders}
        />

        <DashboardCard
          title="Revenue"
          value={`$${stats.revenue.toFixed(2)}`}
        />

        <DashboardCard
          title="Avg Order"
          value={`$${stats.averageOrderValue.toFixed(
            2
          )}`}
        />
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <h3>{title}</h3>

      <h2>{value}</h2>
    </div>
  );
}

export default ManagerDashboard;