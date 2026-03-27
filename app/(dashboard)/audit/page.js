"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, ScrollText, Filter, RefreshCw, Shield, UserX, UserCheck, Key, Settings, CreditCard, AlertTriangle, FileText } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTION_CONFIG = {
  "admin.user.ban": { label: "Usuario suspendido", icon: UserX, color: "text-red-400", bg: "bg-red-500/10" },
  "admin.user.unban": { label: "Usuario activado", icon: UserCheck, color: "text-green-400", bg: "bg-green-500/10" },
  "admin.user.update": { label: "Usuario actualizado", icon: Settings, color: "text-blue-400", bg: "bg-blue-500/10" },
  "admin.code.create": { label: "Código creado", icon: Key, color: "text-blue-400", bg: "bg-blue-500/10" },
  "admin.code.revoke": { label: "Código revocado", icon: Key, color: "text-orange-400", bg: "bg-orange-500/10" },
  "admin.config.update": { label: "Config actualizada", icon: Settings, color: "text-purple-400", bg: "bg-purple-500/10" },
  "user.plan.upgrade": { label: "Plan mejorado", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "user.plan.downgrade": { label: "Plan rebajado", icon: CreditCard, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  "system.alert.warning": { label: "Alerta de uso", icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", highlight: true },
  "system.alert.critical": { label: "Alerta crítica", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", highlight: true },
  "admin.document.index": { label: "Documento indexado", icon: FileText, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  "admin.user.update_plan": { label: "Plan actualizado", icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
  "admin.user.update_role": { label: "Rol actualizado", icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10" },
  "admin.payment.update_mode": { label: "Modo de pago", icon: CreditCard, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  "user.login": { label: "Inicio de sesión", icon: UserCheck, color: "text-green-400", bg: "bg-green-500/10" },
  "user.register": { label: "Registro nuevo", icon: UserCheck, color: "text-blue-400", bg: "bg-blue-500/10" },
};

const QUICK_FILTERS = [
  { label: "Todos", value: "" },
  { label: "Usuarios", value: "admin.user" },
  { label: "Códigos", value: "admin.code" },
  { label: "Config", value: "admin.config" },
  { label: "Planes", value: "user.plan" },
  { label: "Alertas", value: "system.alert" },
];

export default function AuditPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const filter = searchParams.get("filter") || "";
  const setFilter = (value) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("filter", value);
    else params.delete("filter");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const [searchText, setSearchText] = useState("");

  async function loadLogs(actionFilter = filter) {
    setLoading(true);
    try {
      const url = actionFilter
        ? `/api/admin/audit-log?action=${encodeURIComponent(actionFilter)}&limit=100`
        : "/api/admin/audit-log?limit=100";
      const d = await apiFetch(url);
      if (Array.isArray(d)) setLogs(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadLogs(); }, [filter]);

  function handleFilter(value) {
    setFilter(value);
  }

  const filteredLogs = searchText
    ? logs.filter((l) =>
        (l.actor_email || "").toLowerCase().includes(searchText.toLowerCase()) ||
        (l.action || "").toLowerCase().includes(searchText.toLowerCase())
      )
    : logs;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Historial de acciones del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar por email o acción..."
              className="pl-9 w-56"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => loadLogs()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => handleFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground mt-2">Cargando registros...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <ScrollText className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Sin registros</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter ? "No hay registros para este filtro. Prueba con otro." : "Las acciones del sistema aparecerán aquí."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredLogs.map((log) => {
              const cfg = ACTION_CONFIG[log.action] || { label: log.action, icon: Shield, color: "text-foreground/60", bg: "bg-muted" };
              const Icon = cfg.icon;
              const isAlert = cfg.highlight;
              const isCritical = log.action === "system.alert.critical";
              const alertDetails = isAlert && log.details ? log.details : null;
              return (
                <div key={log.id} className={`flex items-start gap-3 px-4 py-3 transition-colors ${isAlert ? (isCritical ? "bg-red-500/5 border-l-2 border-l-red-500" : "bg-amber-500/5 border-l-2 border-l-amber-500") : "hover:bg-muted/30"}`}>
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-sm font-medium ${isAlert ? cfg.color : ""}`}>{cfg.label}</span>
                      <Badge variant="outline" className="text-xs">{log.action}</Badge>
                    </div>
                    <p className="text-xs text-foreground/60">
                      <span className="font-medium text-foreground/80">{log.actor_email || "sistema"}</span>
                      {log.target_type && (
                        <span> → {log.target_type} <span className="font-mono">{(log.target_id || "").slice(0, 8)}</span></span>
                      )}
                    </p>
                    {/* Alert details shown inline */}
                    {alertDetails && (
                      <div className={`mt-2 rounded-lg p-3 text-xs space-y-1 ${isCritical ? "bg-red-500/10 border border-red-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                        {alertDetails.daily_queries != null && (
                          <p><span className="font-medium">Consultas hoy:</span> {alertDetails.daily_queries} {alertDetails.threshold_queries ? `(umbral: ${alertDetails.threshold_queries})` : ""}</p>
                        )}
                        {alertDetails.daily_cost != null && (
                          <p><span className="font-medium">Costo hoy:</span> ${Number(alertDetails.daily_cost).toFixed(4)} {alertDetails.threshold_cost ? `(umbral: $${alertDetails.threshold_cost})` : ""}</p>
                        )}
                        {alertDetails.total_cost != null && (
                          <p><span className="font-medium">Costo total acumulado:</span> ${Number(alertDetails.total_cost).toFixed(4)}</p>
                        )}
                        {alertDetails.message && <p className="text-foreground/60">{alertDetails.message}</p>}
                        {alertDetails.email_sent && <p className="text-green-400 font-medium">Email de alerta enviado</p>}
                      </div>
                    )}
                    {/* Non-alert details collapsible */}
                    {!isAlert && log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-foreground/50 cursor-pointer hover:text-foreground">Ver detalles</summary>
                        <pre className="text-xs text-foreground/60 font-mono mt-1 p-2 bg-muted rounded overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-xs text-foreground/50 shrink-0 mt-1">
                    {new Date(log.created_at).toLocaleString("es-PE", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {filteredLogs.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {filteredLogs.length} registros
        </p>
      )}
    </div>
  );
}
