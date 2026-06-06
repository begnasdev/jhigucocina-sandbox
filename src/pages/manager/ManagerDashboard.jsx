import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOrders,
  ORDER_STATUS,
} from "../../services/orderService";
import Navbar from "../../components/Navbar";
import { useLanguage } from "../../context/LanguageContext";
import { formatNPR } from "../../utils/format";

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

const getTimeAgo = (seconds, t) => {
  if (!seconds) return "—";
  const diff = Math.floor(Date.now() / 1000 - seconds);
  if (diff < 60) return t("time.secondsAgo", { n: diff });
  if (diff < 3600) return t("time.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("time.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("time.daysAgo", { n: Math.floor(diff / 86400) });
};

function ManagerDashboard() {
  const { t } = useLanguage();
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
            <p className="eyebrow">{t("dash.eyebrow")}</p>
            <h1>{t("dash.title")}</h1>
          </div>
          <Link className="button ghost" to="/staff">{t("dash.openKitchen")}</Link>
        </div>

        <div className="grid cards">
          <DashboardCard title={t("dash.metricActive")} value={stats.activeOrders} note={t("dash.metricActiveNote")} />
          <DashboardCard title={t("dash.metricPreparing")} value={stats.preparingOrders} note={t("dash.metricPreparingNote")} />
          <DashboardCard title={t("dash.metricReady")} value={stats.readyOrders} note={t("dash.metricReadyNote")} />
          <DashboardCard title={t("dash.metricDelayed")} value={stats.delayedOrders} note={t("dash.metricDelayedNote")} tone="warning" />
          <DashboardCard title={t("dash.metricRevenue")} value={formatNPR(stats.revenue)} note={t("dash.metricRevenueNote")} />
          <DashboardCard title={t("dash.metricAvg")} value={formatNPR(stats.averageOrderValue)} note={t("dash.metricAvgNote")} />
        </div>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("dash.liveEyebrow")}</p>
              <h2>{t("dash.recentOrders")}</h2>
            </div>
            <Link className="button ghost" to="/staff">{t("dash.viewAll")}</Link>
          </div>

          {recent.length === 0 ? (
            <div className="empty-state">{t("dash.noOrders")}</div>
          ) : (
            <div className="table-list">
              {recent.map((order) => (
                <div className="table-row" key={order.id}>
                  <div>
                    <strong>{t("orders.orderNum", { id: order.id })}</strong>
                    <div className="muted" style={{ fontSize: ".88rem" }}>
                      {t("dash.orderItems", { count: order.items?.length || 0 })} • {getTimeAgo(order.timeline?.placedAt?.seconds, t)}
                    </div>
                  </div>
                  <span className={`status-pill ${order.status}`}>{t(`status.${order.status}`)}</span>
                  <strong>{formatNPR(order.pricing?.total)}</strong>
                  <Link className="button ghost" to="/staff">
                    {t("orders.viewDetails")}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("dash.recipesEyebrow")}</p>
              <h2>{t("dash.providerData")}</h2>
            </div>
          </div>
          <div className="grid cards">
            <Link to="/manager/ingredients" className="card">
              <span className="pill">{t("dash.cardRaw")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardRaw")}</h3>
            </Link>
            <Link to="/manager/prepared" className="card">
              <span className="pill warning">{t("dash.cardPrepared")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardPrepared")}</h3>
            </Link>
            <Link to="/manager/recipes" className="card">
              <span className="pill">{t("dash.cardRecipes")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardRecipes")}</h3>
            </Link>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">{t("dash.providerData")}</p>
              <h2>{t("dash.operations")}</h2>
            </div>
          </div>
          <div className="grid cards">
            <Link to="/manager/menu" className="card">
              <span className="pill">{t("nav.menu")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardMenu")}</h3>
            </Link>
            <Link to="/staff" className="card">
              <span className="pill warning">{t("nav.kitchen")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardKitchen")}</h3>
            </Link>
            <Link to="/manager/rooms" className="card">
              <span className="pill">{t("nav.rooms")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardRooms")}</h3>
            </Link>
            <Link to="/admin/users" className="card">
              <span className="pill">{t("nav.users")}</span>
              <h3 style={{ marginTop: 10 }}>{t("dash.cardUsers")}</h3>
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
