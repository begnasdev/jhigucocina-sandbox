import { useEffect, useState } from "react";

import {
  getMenuItems,
  createMenuItem,
  deleteMenuItem,
  toggleMenuAvailability,
} from "../../services/menuService";
import Navbar from "../../components/Navbar";
import { demoMenuItems } from "../../data/demoData";

function MenuManagementPage() {
  const [items, setItems] = useState(demoMenuItems);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("Nepali Favorites");
  const [price, setPrice] = useState("");

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await getMenuItems();
      if (data.length > 0) {
        setItems(data);
      }
    } catch (error) {
      console.error(error);
      setItems(demoMenuItems);
    }
  };

  const handleCreate = async () => {
    if (
      !name ||
      !description ||
      !category ||
      !price
    ) {
      return;
    }

    const newItem = {
      id: `local-${Date.now()}`,
      name,
      description,
      category,
      price: Number(price),
      available: true,
    };

    try {
      await createMenuItem(newItem);
    } catch (error) {
      console.error(error);
      setItems((currentItems) => [newItem, ...currentItems]);
    }

    setName("");
    setDescription("");
    setCategory("Nepali Favorites");
    setPrice("");

    loadMenu();
  };

  const handleDelete = async (id) => {
    try {
      await deleteMenuItem(id);
      loadMenu();
    } catch (error) {
      console.error(error);
      setItems((currentItems) => currentItems.filter((item) => item.id !== id));
    }
  };

  const handleToggleAvailability =
    async (item) => {
      try {
        await toggleMenuAvailability(
          item.id,
          item.available
        );

        loadMenu();
      } catch (error) {
        console.error(error);
        setItems((currentItems) =>
          currentItems.map((currentItem) =>
            currentItem.id === item.id
              ? { ...currentItem, available: !currentItem.available }
              : currentItem
          )
        );
      }
    };

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Menu administration</p>
            <h1>Menu Management</h1>
            <p className="muted">Create items, group by submenu, price them, and control customer visibility.</p>
          </div>
        </div>

        <div className="layout-two">
          <section className="card">
            <h2>Add Menu Item</h2>
            <div className="form-grid">
              <input
                className="form-control"
                placeholder="Item Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option>Nepali Favorites</option>
                <option>Starters</option>
                <option>House Plates</option>
                <option>Beverage</option>
                <option>Dessert</option>
                <option>Special</option>
              </select>

              <textarea
                className="form-control span-2"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />

              <input
                className="form-control"
                placeholder="Price"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />

              <button className="button" onClick={handleCreate}>
                Add Item
              </button>
            </div>
          </section>

          <aside className="card">
            <span className="pill warning">Menu fields</span>
            <h3>Deck alignment</h3>
            <p className="muted">
              Required fields from the design include active, available, display rank,
              item type, prep-line, price, submenu, and tax. This screen starts with
              the customer-critical fields and keeps room for the next layer.
            </p>
          </aside>
        </div>

        <section className="section">
          <h2>Menu Items</h2>

          {items.length === 0 ? (
            <div className="empty-state">No menu items found.</div>
          ) : (
            <div className="table-list">
              {items.map((item) => (
                <article className="table-row" key={item.id}>
                  <div>
                    <span className="pill">{item.category || "Uncategorized"}</span>
                    <h3>{item.name}</h3>
                    <p className="muted">{item.description || "No description"}</p>
                  </div>
                  <strong>${Number(item.price || 0).toFixed(2)}</strong>
                  <span className={`pill${item.available ? "" : " danger"}`}>
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                  <div className="actions">
                    <button className="button ghost" onClick={() => handleToggleAvailability(item)}>
                      {item.available ? "Disable" : "Enable"}
                    </button>
                    <button className="button danger" onClick={() => handleDelete(item.id)}>
                      Delete
                    </button>
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

export default MenuManagementPage;
