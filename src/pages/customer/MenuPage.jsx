import { useEffect, useState } from "react";
import { getMenuItems } from "../../services/menuService";
import { useCart } from "../../context/CartContext";
import Navbar from "../../components/Navbar";

function MenuPage() {
  const [menuItems, setMenuItems] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    const loadMenu = async () => {
      try {
        const items = await getMenuItems();

        const availableItems = items.filter(
          (item) => item.available === true
        );

        setMenuItems(availableItems);
      } catch (error) {
        console.error("Error loading menu:", error);
      }
    };

    loadMenu();
  }, []);

  return (
    <>
      <Navbar />

      <div>
        <h1>Menu</h1>

        {menuItems.map((item) => (
          <div key={item.id}>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p>${item.price}</p>

            <button onClick={() => addToCart(item)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default MenuPage;