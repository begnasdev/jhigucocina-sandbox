import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RoleGuard({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="center-screen">
        <div className="card">
          <span className="pill warning">Sign in required</span>
          <h3 style={{ marginTop: 10 }}>Please log in</h3>
          <p className="muted">You need to sign in to view this page.</p>
          <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}>
            <Link className="button" to="/login">Login</Link>
            <Link className="button ghost" to="/">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="center-screen">
        <div className="card">
          <span className="pill danger">Access denied</span>
          <h3 style={{ marginTop: 10 }}>Not enough permissions</h3>
          <p className="muted">
            Your role (<strong>{user.role || "customer"}</strong>) does not have access to this area.
          </p>
          <div className="actions" style={{ justifyContent: "center", marginTop: 14 }}>
            <Link className="button" to="/">Back to home</Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
