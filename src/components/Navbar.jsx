import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { useToast } from "../context/ToastContext";

function Navbar() {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const { room, floor, hasRoom } = useRoom();
  const toast = useToast();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const managerRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (managerRef.current && !managerRef.current.contains(e.target)) {
        setManagerOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const closeAll = () => {
    setMobileOpen(false);
    setManagerOpen(false);
    setUserOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      closeAll();
      toast.success("Signed out");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e.message || "Sign out failed");
    }
  };

  const isManager = user && ["manager", "admin"].includes(user.role);
  const isStaff = user && ["staff", "manager", "admin"].includes(user.role);

  return (
    <header className="navbar">
      <NavLink className="brand" to="/" onClick={closeAll}>
        <span className="brand-mark">JC</span>
        <span>Jhigu Cocina</span>
      </NavLink>

      {hasRoom && (
        <span className="nav-room-badge" title="Detected from QR code">
          Room {room}{floor ? ` · Floor ${floor}` : ""}
        </span>
      )}

      <button
        className="nav-toggle"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        className={`nav-links${mobileOpen ? " open" : ""}`}
        aria-label="Primary"
      >
        <NavItem to="/" onClick={closeAll}>Home</NavItem>
        <NavItem to="/menu" onClick={closeAll}>Menu</NavItem>

        {user && (
          <NavItem to="/customer/orders" onClick={closeAll}>My Orders</NavItem>
        )}

        {isStaff && (
          <NavItem to="/staff" onClick={closeAll}>Kitchen</NavItem>
        )}

        {isManager && (
          <div className="nav-dropdown" ref={managerRef}>
            <button
              type="button"
              className={`nav-link${managerOpen ? " active" : ""}`}
              aria-haspopup="true"
              aria-expanded={managerOpen}
              onClick={() => setManagerOpen((o) => !o)}
            >
              Manager ▾
            </button>
            {managerOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <NavLink to="/manager" className="nav-dropdown-item" onClick={closeAll}>
                  Dashboard
                </NavLink>
                <NavLink to="/manager/menu" className="nav-dropdown-item" onClick={closeAll}>
                  Menu Admin
                </NavLink>
                <NavLink to="/manager/rooms" className="nav-dropdown-item" onClick={closeAll}>
                  Rooms
                </NavLink>
                <NavLink to="/manager/ingredients" className="nav-dropdown-item" onClick={closeAll}>
                  Raw Ingredients
                </NavLink>
                <NavLink to="/manager/prepared" className="nav-dropdown-item" onClick={closeAll}>
                  Prepared Ingredients
                </NavLink>
                <NavLink to="/manager/recipes" className="nav-dropdown-item" onClick={closeAll}>
                  Food Item Recipes
                </NavLink>
              </div>
            )}
          </div>
        )}

        {user?.role === "admin" && (
          <NavItem to="/admin/users" onClick={closeAll}>Users</NavItem>
        )}
      </nav>

      <div className="nav-user">
        <NavLink
          to="/customer/cart"
          className={({ isActive }) => `cart-link${isActive ? " active" : ""}`}
          aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          onClick={closeAll}
        >
          <span aria-hidden="true" className="cart-icon">🛒</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </NavLink>

        {user ? (
          <div className="nav-dropdown" ref={userRef}>
            <button
              type="button"
              className="user-chip"
              aria-haspopup="true"
              aria-expanded={userOpen}
              onClick={() => setUserOpen((o) => !o)}
            >
              <span className="user-avatar" aria-hidden="true">
                {(user.email || "?").charAt(0).toUpperCase()}
              </span>
              <span className="user-meta">
                <span className="user-email">{user.email}</span>
                <span className="pill">{user.role || "customer"}</span>
              </span>
            </button>
            {userOpen && (
              <div className="nav-dropdown-menu right" role="menu">
                <NavLink to="/profile" className="nav-dropdown-item" onClick={closeAll}>
                  Profile
                </NavLink>
                <NavLink to="/customer/orders" className="nav-dropdown-item" onClick={closeAll}>
                  My Orders
                </NavLink>
                <button
                  type="button"
                  className="nav-dropdown-item danger"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <NavItem to="/login" onClick={closeAll}>Login</NavItem>
            <NavItem to="/signup" onClick={closeAll}>Signup</NavItem>
          </>
        )}
      </div>
    </header>
  );
}

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
      onClick={onClick}
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

export default Navbar;
