import { Routes, Route } from "react-router-dom";

import HomePage from "../pages/customer/HomePage";
import MenuPage from "../pages/customer/MenuPage";
import CartPage from "../pages/customer/CartPage";
import MyOrdersPage from "../pages/customer/MyOrdersPage";
import ProfilePage from "../pages/customer/ProfilePage";
import NotFoundPage from "../pages/NotFoundPage";

import LoginPage from "../pages/auth/LoginPage";
import SignupPage from "../pages/auth/SignupPage";

import OrdersPage from "../pages/admin/OrdersPage";

import ManagerDashboard from "../pages/manager/ManagerDashboard";
import MenuManagementPage from "../pages/manager/MenuManagementPage";
import RawIngredientsPage from "../pages/manager/recipes/RawIngredientsPage";
import PreparedIngredientsListPage from "../pages/manager/recipes/PreparedIngredientsListPage";
import PreparedIngredientEditPage from "../pages/manager/recipes/PreparedIngredientEditPage";
import FoodItemRecipesListPage from "../pages/manager/recipes/FoodItemRecipesListPage";
import FoodItemRecipeEditPage from "../pages/manager/recipes/FoodItemRecipeEditPage";

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

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
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

      <Route
        path="/manager/ingredients"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <RawIngredientsPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/prepared"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <PreparedIngredientsListPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/prepared/new"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <PreparedIngredientEditPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/prepared/:id/edit"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <PreparedIngredientEditPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/recipes"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <FoodItemRecipesListPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/recipes/new"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <FoodItemRecipeEditPage />
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/recipes/:id/edit"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={["manager", "admin"]}>
              <FoodItemRecipeEditPage />
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

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;