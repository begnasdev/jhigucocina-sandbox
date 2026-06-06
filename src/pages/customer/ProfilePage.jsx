import { signOut } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { auth } from "../../firebase/firebase";

function ProfilePage() {
  const { user } = useAuth();
  const { cartCount } = useCart();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(e.message || "Sign out failed");
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="page">
          <div className="empty-state">
            <p>Sign in to view your profile.</p>
            <div className="actions" style={{ marginTop: 12 }}>
              <Link className="button" to="/login">Login</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="section-header">
          <div>
            <p className="eyebrow">Account</p>
            <h1>Profile</h1>
          </div>
        </div>

        <div className="layout-two">
          <section className="card profile-card">
            <div className="profile-head">
              <div className="profile-avatar" aria-hidden="true">
                {(user.email || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ marginBottom: 4 }}>{user.name || user.email}</h2>
                <span className={`pill${user.role === "admin" ? " warning" : ""}`}>
                  {user.role || "customer"}
                </span>
              </div>
            </div>

            <hr />

            <dl className="kv">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd className="muted" style={{ wordBreak: "break-all" }}>{user.uid}</dd>
              </div>
              <div>
                <dt>Provider</dt>
                <dd>{user.providerId || "—"}</dd>
              </div>
            </dl>

            <div className="actions" style={{ marginTop: 14 }}>
              <button className="button danger" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </section>

          <aside className="card">
            <span className="pill">Quick links</span>
            <h3 style={{ marginTop: 10 }}>Jump to</h3>
            <ul className="quick-links">
              <li><Link to="/menu">Browse the menu</Link></li>
              <li><Link to="/customer/cart">View cart ({cartCount})</Link></li>
              <li><Link to="/customer/orders">My orders</Link></li>
              {["manager", "admin"].includes(user.role) && (
                <li><Link to="/manager">Manager dashboard</Link></li>
              )}
              {["staff", "manager", "admin"].includes(user.role) && (
                <li><Link to="/staff">Kitchen view</Link></li>
              )}
              {user.role === "admin" && (
                <li><Link to="/admin/users">Manage users</Link></li>
              )}
            </ul>
          </aside>
        </div>
      </main>
    </>
  );
}

export default ProfilePage;
