import Navbar from "../../components/Navbar";
import { useCart } from "../../context/CartContext";
import { createOrder } from "../../services/orderService";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

function CartPage() {
  const {
    cartItems,
    removeFromCart,
    cartTotal,
    clearCart,
  } = useCart();

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    try {
      if (cartItems.length === 0) return;

      if (!user) {
        alert("Please login to place an order");
        navigate("/login");
        return;
      }

      const orderId = await createOrder(
        cartItems,
        cartTotal,
        user.uid
      );

      clearCart();

      alert(`Order Created: ${orderId}`);
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  return (
    <div>
      <Navbar />

      <h1>Your Cart</h1>

      {cartItems.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <>
          {cartItems.map((item) => (
            <div key={item.id}>
              <h3>{item.name}</h3>

              <p>Price: ${item.price}</p>

              <p>Quantity: {item.quantity}</p>

              <button
                onClick={() => removeFromCart(item.id)}
              >
                Remove One
              </button>
            </div>
          ))}

          <h2>
            Total: ${cartTotal.toFixed(2)}
          </h2>

          <>
  {!user && (
    <p>
      Login is required before
      placing an order.
    </p>
  )}

  <button onClick={handleCheckout}>
    Checkout
  </button>
</>
        </>
      )}
    </div>
  );
}

export default CartPage;