import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { Link } from "react-router-dom";
import { useState } from "react";
import { demoMenuItems } from "../../data/demoData";

function HomePage() {
  const [search, setSearch] = useState("");
  const featuredItems = demoMenuItems.slice(0, 3);

  return (
    <>
      <Navbar />

      <main className="page">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Provider ordering platform</p>
            <h1>Jhigu Cocina</h1>
            <p className="lede">
              Browse the house menu, build an order, and give the kitchen a clean
              status workflow from placed to ready.
            </p>

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
              <p className="muted">Menu cards stay readable for dine-in, pickup, and kitchen handoff.</p>
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
                  <span className="price">${item.price.toFixed(2)}</span>
                  <span className="muted">{item.prepLine}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="grid cards">
            <div className="card">
              <span className="pill">Customer</span>
              <h3>Search, select, order</h3>
              <p className="muted">The customer flow matches the deck: search for food, choose a provider menu, then checkout.</p>
            </div>
            <div className="card">
              <span className="pill warning">Kitchen</span>
              <h3>Accept and prepare</h3>
              <p className="muted">Staff can move orders through placed, accepted, preparing, ready, and completed states.</p>
            </div>
            <div className="card">
              <span className="pill">Manager</span>
              <h3>Operate the provider</h3>
              <p className="muted">Managers get live metrics and menu controls without changing the current Firebase model.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default HomePage;
