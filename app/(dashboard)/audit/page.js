"use client";

import { useState, useEffect } from "react";
import { Search, ScrollText } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACTION_STYLES = {
  "admin.user.ban": "bg-red-500/10 text-red-400",
  "admin.user.unban": "bg-green-500/10 text-green-400",
  "admin.code.create": "bg-blue-500/10 text-blue-400",
  "admin.code.revoke": "bg-orange-500/10 text-orange-400",
  "admin.config.update": "bg-purple-500/10 text-purple-400",
  "user.plan.upgrade": "bg-emerald-500/10 text-emerald-400",
  "user.plan.downgrade": "bg-yellow-500/10 text-yellow-400",
  "system.alert.critical": "bg-red-500/10 text-red-400",
  "admin.document.index": "bg-cyan-500/10 text-cyan-400",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  async function loadLogs() {
    setLoading(true);
    try {
      const url = filter ? `/api/admin/audit-log?action=${encodeURIComponent(filter)}` : "/api/admin/audit-log?limit=100";
      const d = await apiFetch(url);
      if (Array.isArray(d)) setLogs(d);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Historial de acciones del sistema</p>
        </div>
        <div className="flex gap-2">
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar accion..." className="w-56" />
          <Button variant="outline" size="sm" onClick={loadLogs}>Buscar</Button>
        </div>
      </div>

      <Card>
        <div className="divide-y">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Cargando...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin registros</p>
          ) : logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3">
              <Badge className={`text-[10px] shrink-0 mt-0.5 ${ACTION_STYLES[log.action] || "bg-muted"}`}>
                {log.action}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{log.actor_email || "sistema"}</span>
                  {log.target_type && <span className="text-muted-foreground"> → {log.target_type}/{(log.target_id || "").slice(0, 8)}</span>}
                </p>
                {log.details && Object.keys(log.details).length > 0 && (
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{JSON.stringify(log.details)}</p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {new Date(log.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
