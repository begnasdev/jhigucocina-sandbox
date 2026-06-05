import { useState } from "react";
import { loginUser, loginWithGoogle } from "../../services/authService";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await loginUser(email, password);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Login failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Google login failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Login</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <br />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <br />

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>

      <hr />

      <button onClick={handleGoogleLogin} disabled={loading}>
        Continue with Google
      </button>

      <p
        onClick={() => navigate("/signup")}
        style={{ cursor: "pointer" }}
      >
        Don't have an account? Signup
      </p>
    </div>
  );
}

export default LoginPage;