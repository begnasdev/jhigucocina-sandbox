import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div id="main-content" tabIndex={-1}>
        <AppRoutes />
      </div>
    </div>
  );
}

export default App;
