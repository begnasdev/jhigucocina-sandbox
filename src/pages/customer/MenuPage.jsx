import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMenuItems } from "../../services/menuService";
import { useCart } from "../../context/CartContext";
import { useRoom } from "../../context/RoomContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { formatNPR } from "../../utils/format";

const SORT_OPTIONS = [
  { value: "default", key: "menu.sortFeatured" },
  { value: "name", key: "menu.sortName" },
  { value: "price-asc", key: "menu.sortPriceAsc" },
  { value: "price-desc", key: "menu.sortPriceDesc" },
];

function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState("default");
  const { addToCart } = useCart();
  const { room, floor, hasRoom } = useRoom();
  const toast = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    const loadMenu = async () => {
      try {
        const items = await getMenuItems();

        const availableItems = items.filter(
          (item) => item.available === true
        );

        if (!cancelled) setMenuItems(availableItems);
      } catch (error) {
        console.error("Error loading menu:", error);
        if (!cancelled) setMenuItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMenu();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = [
    "All",
    ...new Set(menuItems.map((item) => item.category || item.Sub_menu || "Uncategorized")),
  ];

  const filteredItems = menuItems
    .filter((item) => {
      const category = item.category || item.Sub_menu || "Uncategorized";
      const matchesCategory = selectedCategory === "All" || category === selectedCategory;
      const searchTarget = `${item.name} ${item.description} ${category} ${(item.tags || []).join(" ")}`.toLowerCase();
      return matchesCategory && searchTarget.includes(query.toLowerCase());
    })
    .sort((a, b) => {
      const pa = Number(a.price) || 0;
      const pb = Number(b.price) || 0;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "price-asc") return pa - pb;
      if (sort === "price-desc") return pb - pa;
      return 0;
    });

  const handleAdd = (item) => {
    addToCart(item);
    toast.success(t("menu.itemAdded", { name: item.name }));
  };

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">{t("menu.eyebrow")}</p>
            <h1>{t("menu.title")}</h1>
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

        <div className="layout-two">
          <section>
            <div className="menu-toolbar">
              <SearchBar value={query} onChange={setQuery} />
              <select
                className="form-select menu-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label={t("menu.sortAria")}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{t(o.key)}</option>
                ))}
              </select>
            </div>

            <div className="tabs section">
              {categories.map((category) => (
                <button
                  className={`tab${selectedCategory === category ? " active" : ""}`}
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === "All" ? t("menu.all") : category}
                </button>
              ))}
            </div>

            <p className="muted" style={{ marginBottom: 12 }}>
              {loading
                ? t("menu.loading")
                : t("menu.itemCount", { count: filteredItems.length })}
            </p>

            {loading ? (
              <div className="grid cards" aria-busy="true" aria-label={t("menu.loading")}>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <article className="skeleton-card" key={`skel-${i}`}>
                    <span className="skeleton-pill" />
                    <span className="skeleton-text lg w-70" />
                    <span className="skeleton-text w-90" />
                    <span className="skeleton-text w-50" />
                  </article>
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">{t("menu.noResults")}</div>
            ) : (
              <div className="grid cards">
                {filteredItems.map((item) => (
                  <article className="card food-card" key={item.id}>
                    {item.imageUrl ? (
                      <div className="food-thumb">
                        <img src={item.imageUrl} alt={item.name} loading="lazy" />
                      </div>
                    ) : null}
                    <div className="food-meta">
                      <span className="pill">{item.category || item.Sub_menu || t("menu.fallbackCategory")}</span>
                      <span className="muted">{item.prepLine || t("menu.fallbackPrepLine")}</span>
                    </div>
                    <div>
                      <h3>{item.name}</h3>
                      <p className="muted">{item.description || t("menu.descFallback")}</p>
                    </div>
                    <div className="food-meta">
                      <span className="price">{formatNPR(item.price)}</span>
                      <button className="button" onClick={() => handleAdd(item)}>
                        {t("menu.add")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default MenuPage;
