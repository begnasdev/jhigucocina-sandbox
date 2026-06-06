import Navbar from "../../components/Navbar";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useRoom } from "../../context/RoomContext";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useLanguage } from "../../context/LanguageContext";
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const tax = cartTotal * TAX_RATE;
  const total = cartTotal + tax;

  const handleClear = async () => {
    if (cartItems.length === 0) return;
    const ok = await confirm({
      title: t("cart.clearTitle"),
      body: t("cart.clearBody"),
      confirmLabel: t("cart.clear"),
      cancelLabel: t("common.cancel"),
      tone: "danger",
    });
    if (ok) {
      clearCart();
      toast.info(t("cart.cleared"));
    }
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!user) {
      toast.info(t("cart.loginRequired"));
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
      toast.success(t("cart.orderPlaced", { id: orderId }));
      navigate("/customer/orders");
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(error.message || t("cart.checkoutFailed"));
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
            <p className="eyebrow">{t("cart.eyebrow")}</p>
            <h1>{t("cart.title")}</h1>
            <p className="muted">
              {cartCount > 0
                ? t("cart.subtitleItems", { count: cartCount })
                : t("cart.subtitleEmpty")}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button className="button ghost" onClick={handleClear}>
              {t("cart.clear")}
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <p>{t("cart.empty")}</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="button" to="/menu">
                {t("cart.browseMenu")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="layout-two">
            <section className="cart-rows">
              {cartItems.map((item) => (
                <article className="card cart-row" key={item.id}>
                  <div className="cart-row-info">
                    {item.imageUrl ? (
                      <div className="cart-thumb">
                        <img src={item.imageUrl} alt="" loading="lazy" />
                      </div>
                    ) : null}
                    <div className="cart-row-text">
                      <span className="pill">{item.category || t("menu.fallbackCategory")}</span>
                      <h3>{item.name}</h3>
                      {item.description && (
                        <p className="muted" style={{ marginTop: 4 }}>{item.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="qty-stepper" role="group" aria-label={`${item.name}`}>
                    <button
                      type="button"
                      onClick={() => decrementItem(item.id)}
                      aria-label="−"
                    >
                      −
                    </button>
                    <span aria-live="polite">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementItem(item.id)}
                      aria-label="+"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-row-price">
                    <span className="price">
                      {formatNPR(Number(item.price || 0) * item.quantity)}
                    </span>
                    <span className="muted" style={{ fontSize: ".82rem" }}>
                      {formatNPR(item.price)} {t("cart.each")}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => removeItemCompletely(item.id)}
                    aria-label={`${t("common.delete")} ${item.name}`}
                  >
                    {t("common.delete")}
                  </button>
                </article>
              ))}
            </section>

            <aside className="card cart-summary">
              <span className="pill">{t("cart.summary")}</span>
              <h3 style={{ marginTop: 10 }}>{t("cart.reviewPlace")}</h3>

              {hasRoom ? (
                <p
                  id="checkout-room-info"
                  className="room-info"
                  style={{ marginTop: 8 }}
                >
                  {t("room.deliveringTo")} <strong>{t("room.room")} {room}</strong>
                  {floor ? <> · {t("room.floor")} {floor}</> : null}
                </p>
              ) : (
                <p
                  id="checkout-room-warning"
                  className="room-warning muted"
                  style={{ marginTop: 8, fontSize: ".9rem" }}
                >
                  {t("cart.noRoom")}
                </p>
              )}

              <div className="row">
                <span>{t("cart.subtotal")}</span>
                <strong>{formatNPR(cartTotal)}</strong>
              </div>
              <div className="row">
                <span>{t("cart.serviceCharge")}</span>
                <strong>{formatNPR(tax)}</strong>
              </div>
              <hr />
              <div className="row">
                <span>{t("cart.total")}</span>
                <span className="price">{formatNPR(total)}</span>
              </div>

              {!user && (
                <p
                  id="checkout-login-hint"
                  className="muted"
                  style={{ marginTop: 10, fontSize: ".9rem" }}
                >
                  {t("cart.loginHint")}
                </p>
              )}

              <div className="actions" style={{ marginTop: 14 }}>
                <button
                  className="button"
                  onClick={handleCheckout}
                  disabled={submitting || !hasRoom}
                  style={{ width: "100%" }}
                  title={
                    !hasRoom
                      ? t("cart.checkoutDisabledRoom")
                      : !user
                      ? t("cart.checkoutDisabledLogin")
                      : undefined
                  }
                  aria-describedby={
                    !hasRoom
                      ? "checkout-room-warning"
                      : !user
                      ? "checkout-login-hint"
                      : "checkout-room-info"
                  }
                >
                  {submitting ? t("cart.placing") : t("cart.checkout")}
                </button>
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <Link className="button ghost" to="/menu" style={{ width: "100%" }}>
                  {t("cart.keepBrowsing")}
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
