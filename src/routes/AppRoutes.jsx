import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/customer/HomePage";
import MenuPage from "../pages/customer/MenuPage";
import CartPage from "../pages/customer/CartPage";
import MyOrdersPage from "../pages/customer/MyOrdersPage";

import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";

import OrdersPage from "../pages/admin/OrdersPage";

import ManagerDashboard from "../pages/manager/ManagerDashboard";
import MenuManagementPage from "../pages/manager/MenuManagementPage";

import UsersPage from "../pages/admin/UsersPage";

import ProtectedRoute from "./ProtectedRoute";
import RoleGuard from "../components/RoleGuard";

function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          PUBLIC
      ========================= */}

      <Route path="/" element={<HomePage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* =========================
          CUSTOMER
      ========================= */}

      <Route
        path="/customer/cart"
        element={
          <CartPage />
        }
      />

      <Route
        path="/customer/orders"
        element={
          <ProtectedRoute>
            <MyOrdersPage />
          </ProtectedRoute>
        }
      />

      {/* =========================
          STAFF
      ========================= */}

      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <RoleGuard
              allowedRoles={[
                "staff",
                "manager",
                "admin",
              ]}
            >
              <OrdersPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* =========================
          MANAGER
      ========================= */}

      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <RoleGuard
              allowedRoles={[
                "manager",
                "admin",
              ]}
            >
              <ManagerDashboard />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/menu"
        element={
          <ProtectedRoute>
            <RoleGuard
              allowedRoles={[
                "manager",
                "admin",
              ]}
            >
              <MenuManagementPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      {/* =========================
          ADMIN
      ========================= */}

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <RoleGuard
              allowedRoles={[
                "admin",
              ]}
            >
              <UsersPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}

export default AppRoutes;