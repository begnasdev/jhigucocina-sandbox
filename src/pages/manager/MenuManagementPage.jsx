import { useEffect, useState } from "react";

import {
  getMenuItems,
  createMenuItem,
  deleteMenuItem,
  toggleMenuAvailability,
} from "../../services/menuService";

function MenuManagementPage() {
  const [items, setItems] = useState([]);

  const [name, setName] = useState("");
  const [description, setDescription] =
    useState("");
  const [category, setCategory] =
    useState("Momo");
  const [price, setPrice] = useState("");

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    const data = await getMenuItems();
    setItems(data);
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

    await createMenuItem({
      name,
      description,
      category,
      price: Number(price),
    });

    setName("");
    setDescription("");
    setCategory("Momo");
    setPrice("");

    loadMenu();
  };

  const handleDelete = async (id) => {
    await deleteMenuItem(id);
    loadMenu();
  };

  const handleToggleAvailability =
    async (item) => {
      await toggleMenuAvailability(
        item.id,
        item.available
      );

      loadMenu();
    };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Menu Management</h1>

      <div
        style={{
          border: "1px solid #ddd",
          padding: "20px",
          marginBottom: "25px",
          borderRadius: "8px",
        }}
      >
        <h3>Add Menu Item</h3>

        <input
          placeholder="Item Name"
          value={name}
          onChange={(e) =>
            setName(e.target.value)
          }
        />

        <br />
        <br />

        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          rows={3}
        />

        <br />
        <br />

        <select
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
        >
          <option>Momo</option>
          <option>Burger</option>
          <option>Pizza</option>
          <option>Drinks</option>
          <option>Dessert</option>
          <option>Special</option>
        </select>

        <br />
        <br />

        <input
          placeholder="Price"
          value={price}
          onChange={(e) =>
            setPrice(e.target.value)
          }
        />

        <br />
        <br />

        <button onClick={handleCreate}>
          Add Item
        </button>
      </div>

      <h2>Menu Items</h2>

      {items.length === 0 ? (
        <p>No menu items found.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            style={{
              border: "1px solid #ddd",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "8px",
            }}
          >
            <h3>{item.name}</h3>

            <p>
              <strong>
                Category:
              </strong>{" "}
              {item.category ||
                "Uncategorized"}
            </p>

            <p>
              <strong>
                Description:
              </strong>{" "}
              {item.description ||
                "No description"}
            </p>

            <p>
              <strong>Price:</strong> $
              {item.price}
            </p>

            <p>
              <strong>
                Available:
              </strong>{" "}
              {item.available
                ? "✅ Yes"
                : "❌ No"}
            </p>

            <button
              onClick={() =>
                handleToggleAvailability(
                  item
                )
              }
            >
              {item.available
                ? "Disable"
                : "Enable"}
            </button>

            <button
              onClick={() =>
                handleDelete(item.id)
              }
              style={{
                marginLeft: "10px",
              }}
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default MenuManagementPage;