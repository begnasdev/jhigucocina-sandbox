import { useState } from "react";
import { registerUser, loginWithGoogle } from "../../services/authService";
import { useNavigate } from "react-router-dom";

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async () => {
    try {
      setLoading(true);
      await registerUser(email, password);
      navigate("/menu", { replace: true });
    } catch (error) {
      console.error("Signup failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
      navigate("/menu", { replace: true });
    } catch (error) {
      console.error("Google signup failed:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Signup</h2>

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

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Create Account"}
      </button>

      <hr />

      <button onClick={handleGoogleSignup} disabled={loading}>
        Continue with Google
      </button>

      <p
        onClick={() => navigate("/login")}
        style={{ cursor: "pointer" }}
      >
        Already have an account? Login
      </p>
    </div>
  );
}

export default SignupPage;