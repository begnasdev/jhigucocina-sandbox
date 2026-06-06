import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, opts = {}) => {
      const id = nextId++;
      const toast = {
        id,
        message,
        tone: opts.tone || "info",
        duration: opts.duration ?? 3500,
      };
      setToasts((prev) => [...prev, toast]);
      if (toast.duration > 0) {
        setTimeout(() => dismiss(id), toast.duration);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: (message, opts) => push(message, opts),
      success: (message, opts) => push(message, { ...opts, tone: "success" }),
      error: (message, opts) => push(message, { ...opts, tone: "error" }),
      info: (message, opts) => push(message, { ...opts, tone: "info" }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-shelf" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role="status">
            <span>{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
