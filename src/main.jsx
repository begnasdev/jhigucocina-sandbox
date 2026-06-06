import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

import { BrowserRouter } from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { RecipeProvider } from "./context/RecipeContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <CartProvider>
            <RecipeProvider>
              <App />
            </RecipeProvider>
          </CartProvider>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </BrowserRouter>
);
