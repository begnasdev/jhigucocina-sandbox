import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="footer-brand-row">
            <span className="brand-mark" aria-hidden="true">JC</span>
            <span className="footer-brand-name">Jhigu Cocina</span>
          </div>
          <p className="footer-desc muted">{t("footer.description")}</p>
        </div>

        <nav className="footer-links" aria-label={t("footer.quickLinks")}>
          <span className="footer-links-title">{t("footer.quickLinks")}</span>
          <Link to="/">{t("nav.home")}</Link>
          <Link to="/menu">{t("nav.menu")}</Link>
          <Link to="/customer/cart">{t("home.openCart")}</Link>
        </nav>
      </div>

      <div className="footer-bottom">
        <span className="muted">{t("footer.rights", { year })}</span>
      </div>
    </footer>
  );
}

export default Footer;
