import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOrders,
  ORDER_STATUS,
} from "../../services/orderService";
import Navbar from "../../components/Navbar";

const computeStats = (orders) => {
  const revenue = orders.reduce((t, o) => t + (o.pricing?.total || 0), 0);
  const preparing = orders.filter((o) => o.status === ORDER_STATUS.PREPARING).length;
  const ready = orders.filter((o) => o.status === ORDER_STATUS.READY).length;
  const delayed = orders.filter((o) => {
    const placed = o.timeline?.placedAt?.seconds;
    if (!placed) return false;
    return (Date.now() / 1000 - placed) / 60 >= 10;
  }).length;
  return {
    activeOrders: orders.length,
    preparingOrders: preparing,
    readyOrders: ready,
    delayedOrders: delayed,
    revenue,
    averageOrderValue: orders.length > 0 ? revenue / orders.length : 0,
  };
};

const getTimeAgo = (seconds) => {
  if (!seconds) return "—";
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

function ManagerDashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(() => computeStats([]));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrders();
        if (cancelled) return;
        setOrders(data);
        setStats(computeStats(data));
      } catch (error) {
        console.error(error);
        if (cancelled) return;
        setOrders([]);
        setStats(computeStats([]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recent = [...orders]
    .sort(
      (a, b) =>
        (b.timeline?.placedAt?.seconds || 0) -
        (a.timeline?.placedAt?.seconds || 0)
    )
    .slice(0, 5);

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Provider control center</p>
            <h1>Manager Dashboard</h1>
          </div>
          <Link className="button ghost" to="/staff">Open Kitchen</Link>
        </div>

        <div className="grid cards">
          <DashboardCard title="Active Orders" value={stats.activeOrders} note="Open provider orders" />
          <DashboardCard title="Preparing" value={stats.preparingOrders} note="Currently in kitchen" />
          <DashboardCard title="Ready" value={stats.readyOrders} note="Waiting for pickup" />
          <DashboardCard title="Delayed" value={stats.delayedOrders} note="Over 10 minutes old" tone="warning" />
          <DashboardCard title="Revenue" value={`$${stats.revenue.toFixed(2)}`} note="Active order value" />
          <DashboardCard title="Avg Order" value={`$${stats.averageOrderValue.toFixed(2)}`} note="Average basket" />
        </div>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Live</p>
              <h2>Recent orders</h2>
            </div>
            <Link className="button ghost" to="/staff">View all</Link>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state">No orders yet.</div>
          ) : (
            <div className="table-list">
              {recent.map((order) => (
                <div className="table-row" key={order.id}>
                  <div>
                    <strong>Order #{order.id}</strong>
                    <div className="muted" style={{ fontSize: ".88rem" }}>
                      {order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"} • {getTimeAgo(order.timeline?.placedAt?.seconds)}
                    </div>
                  </div>
                  <span className={`status-pill ${order.status}`}>{order.status}</span>
                  <strong>${Number(order.pricing?.total || 0).toFixed(2)}</strong>
                  <Link className="button ghost" to="/staff">
                    Open
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Recipes & Ingredients</p>
              <h2>Provider data</h2>
            </div>
          </div>
          <div className="grid cards">
            <Link to="/manager/ingredients" className="card">
              <span className="pill">Raw</span>
              <h3 style={{ marginTop: 10 }}>Raw Ingredients</h3>
            </Link>
            <Link to="/manager/prepared" className="card">
              <span className="pill warning">Prepared</span>
              <h3 style={{ marginTop: 10 }}>Prepared Ingredients</h3>
            </Link>
            <Link to="/manager/recipes" className="card">
              <span className="pill">Recipes</span>
              <h3 style={{ marginTop: 10 }}>Food Item Recipes</h3>
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Provider</p>
              <h2>Operations</h2>
            </div>
          </div>
          <div className="grid cards">
            <Link to="/manager/menu" className="card">
              <span className="pill">Menu</span>
              <h3 style={{ marginTop: 10 }}>Menu Management</h3>
            </Link>
            <Link to="/staff" className="card">
              <span className="pill warning">Kitchen</span>
              <h3 style={{ marginTop: 10 }}>Kitchen Orders</h3>
            </Link>
            <Link to="/admin/users" className="card">
              <span className="pill">Team</span>
              <h3 style={{ marginTop: 10 }}>Users</h3>
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

function DashboardCard({ title, value, note, tone }) {
  return (
    <div className="card metric">
      <span className={`pill${tone === "warning" ? " warning" : ""}`}>{title}</span>
      <div className="metric-value">{value}</div>
      <h3>{title}</h3>
      <p className="muted">{note}</p>
    </div>
  );
}

export default ManagerDashboard;
