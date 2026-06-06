import { createContext, useCallback, useContext, useRef, useState } from "react";

const ConfirmContext = createContext(null);

const DEFAULTS = {
  title: "Are you sure?",
  body: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  tone: "default",
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ ...DEFAULTS, ...options });
    });
  }, []);

  const finish = (answer) => {
    if (resolverRef.current) resolverRef.current(answer);
    resolverRef.current = null;
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="modal-backdrop" onClick={() => finish(false)}>
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{state.title}</h3>
            {state.body && <p className="muted">{state.body}</p>}
            <div className="actions" style={{ marginTop: 16, justifyContent: "flex-end" }}>
              <button type="button" className="button ghost" onClick={() => finish(false)}>
                {state.cancelLabel}
              </button>
              <button
                type="button"
                className={`button${state.tone === "danger" ? " danger" : ""}`}
                onClick={() => finish(true)}
                autoFocus
              >
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
