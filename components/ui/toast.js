"use client";
import { useState, useCallback, createContext, useContext } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const icons = { success: CheckCircle, error: XCircle, info: AlertCircle };
  const colors = {
    success: "bg-green-500/10 border-green-500/30 text-green-400",
    error: "bg-red-500/10 border-red-500/30 text-red-400",
    info: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  };

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = icons[t.type] || AlertCircle;
          return (
            <div
              key={t.id}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg text-sm ${colors[t.type] || colors.info}`}
              style={{ animation: "toastSlideIn 0.3s ease-out" }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                className="shrink-0 opacity-60 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </ToastCtx.Provider>
  );
}
