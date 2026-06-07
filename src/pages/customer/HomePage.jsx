import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import Footer from "../../components/Footer";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMenuItems } from "../../services/menuService";
import { useRoom } from "../../context/RoomContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatNPR } from "../../utils/format";

function HomePage() {
  const [search, setSearch] = useState("");
  const [featuredItems, setFeaturedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const { room, floor, hasRoom } = useRoom();
  const { language, setLanguage, t } = useLanguage();

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
        <div className="home-topbar">
          <div
            className="lang-toggle"
            role="group"
            aria-label={t("lang.label")}
          >
            <button
              type="button"
              className={`lang-toggle-btn${language === "en" ? " active" : ""}`}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              {t("lang.en")}
            </button>
            <button
              type="button"
              className={`lang-toggle-btn${language === "ne" ? " active" : ""}`}
              onClick={() => setLanguage("ne")}
              aria-pressed={language === "ne"}
            >
              {t("lang.ne")}
            </button>
          </div>
        </div>

        {hasRoom && (
          <div className="room-banner" role="status" aria-live="polite">
            <span className="room-banner-icon" aria-hidden="true">R</span>
            <span>
              {t("room.deliveringTo")} <strong>{t("room.room")} {room}</strong>
              {floor ? <> · {t("room.floor")} {floor}</> : null}
            </span>
          </div>
        )}

        <section className="hero hero-feature">
          <div className="hero-visual" aria-hidden="true" />
          <div className="hero-scrim" aria-hidden="true" />

          <div className="hero-copy">
            <p className="eyebrow">{t("home.eyebrow")}</p>
            <h1>Jhigu Cocina</h1>
            <p className="hero-tagline">{t("home.tagline")}</p>

            <div className="search-panel">
              <SearchBar value={search} onChange={setSearch} />
            </div>

            <div className="hero-actions">
              <Link className="button" to={`/menu${search ? `?q=${encodeURIComponent(search)}` : ""}`}>
                {t("home.viewMenu")}
              </Link>
              <Link className="button secondary" to="/customer/cart">
                {t("home.openCart")}
              </Link>
            </div>
          </div>
        </section>

        <section className="section howto-section">
          <div className="section-header section-header-accent">
            <div>
              <p className="eyebrow">{t("howto.subtitle")}</p>
              <h2>{t("howto.title")}</h2>
            </div>
          </div>

          <div className="howto-grid">
            {[
              { icon: "📱", step: "howto.step1" },
              { icon: "🍽️", step: "howto.step2" },
              { icon: "🛒", step: "howto.step3" },
              { icon: "🛵", step: "howto.step4" },
              { icon: "✅", step: "howto.step5" },
              { icon: "📍", step: "howto.step6" },
            ].map((s, i) => (
              <article className="howto-step" key={s.step}>
                <span className="howto-step-num" aria-hidden="true">{i + 1}</span>
                <span className="howto-icon" aria-hidden="true">{s.icon}</span>
                <h3>{t(s.step)}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section why-section">
          <div className="section-header section-header-accent">
            <div>
              <p className="eyebrow">{t("why.subtitle")}</p>
              <h2>{t("why.title")}</h2>
            </div>
          </div>

          <div className="why-grid">
            {[
              { icon: "🍲", title: "why.card1Title", desc: "why.card1Desc" },
              { icon: "🌿", title: "why.card2Title", desc: "why.card2Desc" },
              { icon: "🛎️", title: "why.card3Title", desc: "why.card3Desc" },
              { icon: "⚡", title: "why.card4Title", desc: "why.card4Desc" },
            ].map((c) => (
              <article className="why-card" key={c.title}>
                <span className="why-icon" aria-hidden="true">{c.icon}</span>
                <h3>{t(c.title)}</h3>
                <p className="muted">{t(c.desc)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-header section-header-accent">
            <div>
              <p className="eyebrow">{t("home.popularEyebrow")}</p>
              <h2>{t("home.popularTitle")}</h2>
            </div>
            <Link className="button ghost" to="/menu">{t("home.fullMenu")}</Link>
          </div>

          {loading ? (
            <div className="grid cards" aria-busy="true" aria-label={t("common.loading")}>
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
            <div className="empty-state">{t("home.noItems")}</div>
          ) : (
            <div className="grid cards">
              {featuredItems.map((item) => (
                <article className="card food-card" key={item.id}>
                  {item.imageUrl ? (
                    <div className="food-thumb">
                      <img src={item.imageUrl} alt={item.name} loading="lazy" />
                    </div>
                  ) : null}
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

      <Footer />
    </>
  );
}

export default HomePage;
