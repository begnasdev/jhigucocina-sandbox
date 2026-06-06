import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginWithGoogle } from "../../services/authService";
import { useToast } from "../../context/ToastContext";

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await registerUser(email, password);
      toast.success("Account created — welcome!");
      navigate("/menu", { replace: true });
    } catch (error) {
      console.error("Signup failed:", error);
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      toast.success("Signed in with Google");
      navigate("/menu", { replace: true });
    } catch (error) {
      console.error("Google signup failed:", error);
      toast.error(error.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSignup}>
        <Link to="/" className="auth-brand">
          <span className="brand-mark">JC</span>
          <span>Jhigu Cocina</span>
        </Link>

        <h1>Create your account</h1>
        <p className="lede">Save orders, track status, and skip the line.</p>

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
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        <div className="auth-actions">
          <button type="submit" className="button" disabled={loading}>
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </div>

        <div className="auth-divider">or</div>

        <div className="auth-actions">
          <button
            type="button"
            className="button secondary"
            onClick={handleGoogleSignup}
            disabled={loading}
          >
            Continue with Google
          </button>
        </div>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export default SignupPage;
