"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const ConfirmCtx = createContext(() => Promise.resolve(false));

export function useConfirm() {
  return useContext(ConfirmCtx);
}

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    confirmBtn: "bg-red-500 hover:bg-red-600 text-white",
    confirmLabel: "Eliminar",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    confirmBtn: "bg-amber-500 hover:bg-amber-600 text-white",
    confirmLabel: "Confirmar",
  },
  info: {
    icon: Info,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    confirmBtn: "bg-primary hover:bg-primary/90 text-primary-foreground",
    confirmLabel: "Aceptar",
  },
};

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(({ title, message, variant = "danger", confirmLabel } = {}) => {
    return new Promise((resolve) => {
      setState({ title, message, variant, confirmLabel, resolve });
    });
  }, []);

  function handleConfirm() {
    state?.resolve(true);
    setState(null);
  }

  function handleCancel() {
    state?.resolve(false);
    setState(null);
  }

  const v = state ? (VARIANTS[state.variant] || VARIANTS.info) : null;
  const Icon = v?.icon;

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-background border rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-4 p-5 pb-3">
              <div className={`w-10 h-10 rounded-lg ${v.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-5 w-5 ${v.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold">{state.title || "Confirmar acción"}</h3>
                <p className="text-sm text-foreground/60 mt-1 leading-relaxed">
                  {state.message || "¿Estás seguro de que deseas continuar?"}
                </p>
              </div>
              <button onClick={handleCancel} className="text-foreground/40 hover:text-foreground transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 pb-5 pt-2">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${v.confirmBtn}`}
              >
                {state.confirmLabel || v.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}
