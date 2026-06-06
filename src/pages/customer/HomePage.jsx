import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMenuItems } from "../../services/menuService";

function HomePage() {
  const [search, setSearch] = useState("");
  const [featuredItems, setFeaturedItems] = useState([]);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const items = await getMenuItems();
        const availableItems = items.filter((item) => item.available === true);
        setFeaturedItems(availableItems.slice(0, 3));
      } catch (error) {
        console.error("Error loading featured items:", error);
        setFeaturedItems([]);
      }
    };

    loadFeatured();
  }, []);

  return (
    <>
      <Navbar />

      <main className="page">
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

          <div className="grid cards">
            {featuredItems.map((item) => (
              <article className="card food-card" key={item.id}>
                <span className="pill">{item.category}</span>
                <div>
                  <h3>{item.name}</h3>
                  <p className="muted">{item.description}</p>
                </div>
                <div className="food-meta">
                  <span className="price">${Number(item.price || 0).toFixed(2)}</span>
                  <span className="muted">{item.prepLine}</span>
                </div>
              </article>
            ))}
          </div>

          {featuredItems.length === 0 && (
            <div className="empty-state">No menu items available yet.</div>
          )}
        </section>
      </main>
    </>
  );
}

export default HomePage;
