import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getMenuItems } from "../../services/menuService";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import Navbar from "../../components/Navbar";
import SearchBar from "../../components/SearchBar";
import { demoMenuItems } from "../../data/demoData";

const SORT_OPTIONS = [
  { value: "default", label: "Sort: Featured" },
  { value: "name", label: "Sort: Name (A–Z)" },
  { value: "price-asc", label: "Sort: Price ↑" },
  { value: "price-desc", label: "Sort: Price ↓" },
];

function MenuPage() {
  const [menuItems, setMenuItems] = useState(demoMenuItems);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState("default");
  const { addToCart } = useCart();
  const toast = useToast();

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const items = await getMenuItems();

        const availableItems = items.filter(
          (item) => item.available === true
        );

        if (availableItems.length > 0) {
          setMenuItems(availableItems);
        }
      } catch (error) {
        console.error("Error loading menu:", error);
        setMenuItems(demoMenuItems);
      }
    };

    loadMenu();
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
    toast.success(`Added ${item.name}`);
  };

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Food and beverage</p>
            <h1>Menu</h1>
            <p className="muted">Availability, submenu grouping, prep-line assignment, and price are visible at order time.</p>
          </div>
        </div>

        <div className="layout-two">
          <section>
            <div className="menu-toolbar">
              <SearchBar value={query} onChange={setQuery} />
              <select
                className="form-select menu-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort menu"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
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
                  {category}
                </button>
              ))}
            </div>

            <p className="muted" style={{ marginBottom: 12 }}>
              {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
            </p>

            <div className="grid cards">
              {filteredItems.map((item) => (
                <article className="card food-card" key={item.id}>
                  <div className="food-meta">
                    <span className="pill">{item.category || item.Sub_menu || "Menu"}</span>
                    <span className="muted">{item.prepLine || "Kitchen"}</span>
                  </div>
                  <div>
                    <h3>{item.name}</h3>
                    <p className="muted">{item.description || "Prepared fresh for this provider menu."}</p>
                  </div>
                  <div className="food-meta">
                    <span className="price">${Number(item.price || 0).toFixed(2)}</span>
                    <button className="button" onClick={() => handleAdd(item)}>
                      Add
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div className="empty-state">No matching menu items found.</div>
            )}
          </section>

          <aside className="card cart-summary">
            <span className="pill">Order model</span>
            <h3>Designed for table and pickup orders</h3>
            <p className="muted">
              The deck calls for menu items with submenu, prep-line, availability, price, tax,
              and inventory recipe references. This MVP exposes the fields customers and staff
              need first.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}

export default MenuPage;
