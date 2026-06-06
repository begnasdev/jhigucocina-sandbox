import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "./context/LanguageContext";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { RoomProvider } from "./context/RoomContext";
import { RecipeProvider } from "./context/RecipeContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <LanguageProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <RoomProvider>
              <CartProvider>
                <RecipeProvider>
                  <App />
                </RecipeProvider>
              </CartProvider>
            </RoomProvider>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </LanguageProvider>
  </BrowserRouter>
);
