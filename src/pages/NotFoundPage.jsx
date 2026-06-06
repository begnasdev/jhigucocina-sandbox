import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

function NotFoundPage() {
  return (
    <>
      <Navbar />
      <main className="page">
        <div className="not-found">
          <p className="eyebrow">404</p>
          <h1>That page is off the menu</h1>
          <p className="muted">
            The page you were looking for doesn't exist or has moved.
          </p>
          <div className="actions" style={{ marginTop: 18, justifyContent: "center" }}>
            <Link className="button" to="/">Back to home</Link>
            <Link className="button ghost" to="/menu">Browse menu</Link>
          </div>
        </div>
      </main>
    </>
  );
}

export default NotFoundPage;
