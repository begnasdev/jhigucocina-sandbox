import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useRoom } from "../context/RoomContext";
import { useToast } from "../context/ToastContext";
import { useLanguage } from "../context/LanguageContext";

function Navbar() {
  const { cartCount } = useCart();
  const { user } = useAuth();
  const { room, floor, hasRoom } = useRoom();
  const toast = useToast();
  const { t } = useLanguage();
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
        <NavItem to="/" onClick={closeAll}>{t("nav.home")}</NavItem>
        <NavItem to="/menu" onClick={closeAll}>{t("nav.menu")}</NavItem>

        {user && (
          <NavItem to="/customer/orders" onClick={closeAll}>{t("nav.myOrders")}</NavItem>
        )}

        {isStaff && (
          <NavItem to="/staff" onClick={closeAll}>{t("nav.kitchen")}</NavItem>
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
              {t("nav.manager")} ▾
            </button>
            {managerOpen && (
              <div className="nav-dropdown-menu" role="menu">
                <NavLink to="/manager" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.dashboard")}
                </NavLink>
                <NavLink to="/manager/menu" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.menuAdmin")}
                </NavLink>
                <NavLink to="/manager/rooms" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.rooms")}
                </NavLink>
                <NavLink to="/manager/ingredients" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.rawIngredients")}
                </NavLink>
                <NavLink to="/manager/prepared" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.preparedIngredients")}
                </NavLink>
                <NavLink to="/manager/recipes" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.recipes")}
                </NavLink>
              </div>
            )}
          </div>
        )}

        {user?.role === "admin" && (
          <NavItem to="/admin/users" onClick={closeAll}>{t("nav.users")}</NavItem>
        )}
      </nav>

      <div className="nav-user">
        <NavLink
          to="/customer/cart"
          className={({ isActive }) => `cart-link${isActive ? " active" : ""}`}
          aria-label={t("nav.cartAria", { count: cartCount })}
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
                  {t("nav.profile")}
                </NavLink>
                <NavLink to="/customer/orders" className="nav-dropdown-item" onClick={closeAll}>
                  {t("nav.myOrders")}
                </NavLink>
                <button
                  type="button"
                  className="nav-dropdown-item danger"
                  onClick={handleLogout}
                >
                  {t("nav.signOut")}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <NavItem to="/login" onClick={closeAll}>{t("nav.login")}</NavItem>
            <NavItem to="/signup" onClick={closeAll}>{t("nav.signup")}</NavItem>
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
