import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMenuItems } from "../../services/menuService";
import { useRoom } from "../../context/RoomContext";
import { formatNPR } from "../../utils/format";

function HomePage() {
  const [search, setSearch] = useState("");
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { room, floor, hasRoom } = useRoom();

  useEffect(() => {
    let cancelled = false;
    const loadFeatured = async () => {
      try {
        const items = await getMenuItems();
        const availableItems = items.filter((item) => item.available === true);
        if (!cancelled) setFeaturedItems(availableItems.slice(0, 3));
      } catch (error) {
        console.error("Error loading featured items:", error);
        if (!cancelled) setFeaturedItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Navbar />

      <main className="page">
        {hasRoom && (
          <div className="room-banner" role="status" aria-live="polite">
            <span className="room-banner-icon" aria-hidden="true">R</span>
            <span>
              Delivering to <strong>Room {room}</strong>
              {floor ? <> · Floor {floor}</> : null}
            </span>
          </div>
        )}

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Provider ordering platform</p>
            <h1>Jhigu Cocina</h1>

            <div className="search-panel">
              <SearchBar value={search} onChange={setSearch} />
            </div>

            <div className="hero-actions">
              <Link className="button" to={`/menu${search ? `?q=${encodeURIComponent(search)}` : ""}`}>
                View Menu
              </Link>
              <Link className="button secondary" to="/customer/cart">
                Open Cart
              </Link>
            </div>
          </div>

          <div className="hero-visual" aria-label="Jhigu Cocina plated food" />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <p className="eyebrow">Today at the counter</p>
              <h2>Popular picks</h2>
            </div>
            <Link className="button ghost" to="/menu">Full Menu</Link>
          </div>

          {loading ? (
            <div className="grid cards" aria-busy="true" aria-label="Loading featured items">
              {[0, 1, 2].map((i) => (
                <article className="skeleton-card" key={`skel-${i}`}>
                  <span className="skeleton-pill" />
                  <span className="skeleton-text lg w-70" />
                  <span className="skeleton-text w-90" />
                  <span className="skeleton-text w-50" />
                </article>
              ))}
            </div>
          ) : featuredItems.length === 0 ? (
            <div className="empty-state">No menu items available yet.</div>
          ) : (
            <div className="grid cards">
              {featuredItems.map((item) => (
                <article className="card food-card" key={item.id}>
                  <span className="pill">{item.category}</span>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="muted">{item.description}</p>
                  </div>
                  <div className="food-meta">
                    <span className="price">{formatNPR(item.price)}</span>
                    <span className="muted">{item.prepLine}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default HomePage;
