import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { cartItems } = useCart();
  const { user } = useAuth();

  return (
    <header
      style={{
        padding: "15px",
        borderBottom: "1px solid #ddd",
        display: "flex",
        gap: "15px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <h2>Jhigu Cocina</h2>

      {/* PUBLIC */}

      <Link to="/">Home</Link>

      <Link to="/menu">Menu</Link>

      {/* CUSTOMER */}

      <Link to="/customer/cart">
        Cart ({cartItems.length})
      </Link>

      {user && (
        <Link to="/customer/orders">
          My Orders
        </Link>
      )}

      {/* STAFF */}

      {user &&
        ["staff", "manager", "admin"].includes(
          user.role
        ) && (
          <Link to="/staff">
            Kitchen Dashboard
          </Link>
        )}

      {/* MANAGER */}

      {user &&
        ["manager", "admin"].includes(
          user.role
        ) && (
          <>
            <Link to="/manager">
              Manager Dashboard
            </Link>

            <Link to="/manager/menu">
              Menu Management
            </Link>
          </>
        )}

      {/* ADMIN */}

      {user?.role === "admin" && (
        <>
          <Link to="/admin/users">
            Users
          </Link>
        </>
      )}

      {/* USER */}

      <div
        style={{
          marginLeft: "auto",
        }}
      >
        {user ? (
          <strong>
            {user.role.toUpperCase()}
          </strong>
        ) : (
          <>
            <Link to="/login">
              Login
            </Link>

            {" | "}

            <Link to="/signup">
              Signup
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;