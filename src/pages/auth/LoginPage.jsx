import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, loginWithGoogle } from "../../services/authService";
import { useToast } from "../../context/ToastContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await loginUser(email, password);
      toast.success("Welcome back");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success("Signed in with Google");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Google login failed:", error);
      toast.error(error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleLogin}>
        <Link to="/" className="auth-brand">
          <span className="brand-mark">JC</span>
          <span>Jhigu Cocina</span>
        </Link>

        <h1>Welcome back</h1>
        <p className="lede">Sign in to continue your order.</p>

        <label className="auth-field">
          <span>Email</span>
          <input
            className="form-control"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            className="form-control"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <div className="auth-actions">
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </div>

        <div className="auth-divider">or</div>

        <div className="auth-actions">
          <button
            type="button"
            className="button secondary"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            Continue with Google
          </button>
        </div>

        <p className="auth-switch">
          Don’t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
