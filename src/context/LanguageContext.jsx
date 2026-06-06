import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { en } from "../translations/en";
import { ne } from "../translations/ne";

const DICTS = { en, ne };
const SUPPORTED = ["en", "ne"];
const STORAGE_KEY = "jc-lang-v1";

const LanguageContext = createContext(null);

const readInitial = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch {
    // storage unavailable — fall through
  }
  return "en"; // default language
};

const interpolate = (str, vars) => {
  if (!vars) return str;
  return Object.keys(vars).reduce(
    (acc, key) => acc.replace(new RegExp(`\\{${key}\\}`, "g"), String(vars[key])),
    str
  );
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readInitial);

  // Persist + reflect on <html lang>.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (SUPPORTED.includes(lang)) setLanguageState(lang);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[language] || DICTS.en;
      // Active language → English fallback → raw key as last resort.
      const raw = dict[key] ?? DICTS.en[key] ?? key;
      return interpolate(raw, vars);
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
