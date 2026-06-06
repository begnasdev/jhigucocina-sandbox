import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext();
const STORAGE_KEY = "jc-cart-v1";

const loadInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // storage full or disabled — ignore
    }
  }, [cartItems]);

  const addToCart = (item) => {
    setCartItems((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const incrementItem = (id) => {
    setCartItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity + 1 } : c))
    );
  };

  const decrementItem = (id) => {
    setCartItems((prev) => {
      const target = prev.find((c) => c.id === id);
      if (!target) return prev;
      if (target.quantity <= 1) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, quantity: c.quantity - 1 } : c));
    });
  };

  const removeFromCart = (id) => decrementItem(id);

  const removeItemCompletely = (id) => {
    setCartItems((prev) => prev.filter((c) => c.id !== id));
  };

  const setQuantity = (id, quantity) => {
    const q = Math.max(0, Math.floor(Number(quantity) || 0));
    setCartItems((prev) => {
      if (q === 0) return prev.filter((c) => c.id !== id);
      return prev.map((c) => (c.id === id ? { ...c, quantity: q } : c));
    });
  };

  const clearCart = () => setCartItems([]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, c) => sum + (Number(c.price) || 0) * c.quantity, 0),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, c) => sum + c.quantity, 0),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        incrementItem,
        decrementItem,
        removeFromCart,
        removeItemCompletely,
        setQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
