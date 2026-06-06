import Navbar from "../../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { createOrder } from "../../services/orderService";
import { DEFAULT_PROVIDER_ID } from "../../config/providerConfig";
import { formatNPR } from "../../utils/format";

const TAX_RATE = 0.0875;

function CartPage() {
  const {
    cartItems,
    cartTotal,
    cartCount,
    incrementItem,
    decrementItem,
    removeItemCompletely,
    clearCart,
  } = useCart();

  const { user } = useAuth();
  const { room, floor, hasRoom } = useRoom();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const tax = cartTotal * TAX_RATE;
  const total = cartTotal + tax;

  const handleClear = async () => {
    if (cartItems.length === 0) return;
    const ok = await confirm({
      title: "Clear your cart?",
      body: "All items will be removed.",
      confirmLabel: "Clear cart",
      tone: "danger",
    });
    if (ok) {
      clearCart();
      toast.info("Cart cleared");
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!user) {
      toast.info("Please log in to place an order");
      navigate("/login");
      return;
    }
    try {
      setSubmitting(true);
      const orderId = await createOrder(
        cartItems,
        total,
        user.uid,
        DEFAULT_PROVIDER_ID,
        { room, floor }
      );
      clearCart();
      toast.success(`Order placed (${orderId})`);
      navigate("/customer/orders");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(error.message || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Your Cart</h1>
            <p className="muted">
              {cartCount > 0
                ? `${cartCount} item${cartCount === 1 ? "" : "s"} ready to send to the kitchen.`
                : "Add items from the menu to get started."}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button className="button ghost" onClick={handleClear}>
              Clear cart
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <p>Your cart is empty.</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="button" to="/menu">
                Browse the menu
              </Link>
            </div>
          </div>
        ) : (
          <div className="layout-two">
            <section className="cart-rows">
              {cartItems.map((item) => (
                <article className="card cart-row" key={item.id}>
                  <div className="cart-row-info">
                    <span className="pill">{item.category || "Menu item"}</span>
                    <h3>{item.name}</h3>
                    {item.description && (
                      <p className="muted" style={{ marginTop: 4 }}>{item.description}</p>
                    )}
                  </div>

                  <div className="qty-stepper" role="group" aria-label={`Quantity for ${item.name}`}>
                    <button
                      type="button"
                      onClick={() => decrementItem(item.id)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementItem(item.id)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-row-price">
                    <span className="price">
                      {formatNPR(Number(item.price || 0) * item.quantity)}
                    </span>
                    <span className="muted" style={{ fontSize: ".82rem" }}>
                      {formatNPR(item.price)} each
                    </span>
                  </div>

                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => removeItemCompletely(item.id)}
                    aria-label={`Remove ${item.name} from cart`}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </section>

            <aside className="card cart-summary">
              <span className="pill">Order summary</span>
              <h3 style={{ marginTop: 10 }}>Review and place</h3>

              {hasRoom ? (
                <p className="room-info" style={{ marginTop: 8 }}>
                  Delivering to <strong>Room {room}</strong>
                  {floor ? <> · Floor {floor}</> : null}
                </p>
              ) : (
                <p
                  className="room-warning muted"
                  style={{ marginTop: 8, fontSize: ".9rem" }}
                >
                  No room detected — please scan the QR code in your room.
                </p>
              )}

              <div className="row">
                <span>Subtotal</span>
                <strong>{formatNPR(cartTotal)}</strong>
              </div>
              <div className="row">
                <span>Tax (8.75%)</span>
                <strong>{formatNPR(tax)}</strong>
              </div>
              <hr />
              <div className="row">
                <span>Total</span>
                <span className="price">{formatNPR(total)}</span>
              </div>

              {!user && (
                <p className="muted" style={{ marginTop: 10, fontSize: ".9rem" }}>
                  You'll be asked to log in to place the order.
                </p>
              )}

              <div className="actions" style={{ marginTop: 14 }}>
                <button
                  className="button"
                  onClick={handleCheckout}
                  disabled={submitting || !hasRoom}
                  style={{ width: "100%" }}
                >
                  {submitting ? "Placing order…" : "Checkout"}
                </button>
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <Link className="button ghost" to="/menu" style={{ width: "100%" }}>
                  Keep browsing
                </Link>
              </div>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

export default CartPage;
