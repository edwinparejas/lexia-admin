"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Cpu, HardDrive, Server, Activity } from "lucide-react";

/* Brand initials with official colors for each service */
const SERVICE_LOGOS = {};  // Using text initials instead

const SERVICE_META = {
  supabase:  { label: "Supabase", desc: "Base de datos y autenticación", envVar: "SUPABASE_URL + SUPABASE_KEY", color: "#3ECF8E", logo: "https://supabase.com/favicon/favicon-32x32.png" },
  pinecone:  { label: "Pinecone", desc: "Base de datos vectorial (RAG)", envVar: "PINECONE_API_KEY", color: "#0F9D58", logo: "https://app.pinecone.io/favicon.ico" },
  openai:    { label: "OpenAI", desc: "Modelos de IA (GPT-4o)", envVar: "OPENAI_API_KEY", color: "#10a37f", logo: "https://cdn.openai.com/API/logo-assets/openai-logomark.png" },
  resend:    { label: "Resend", desc: "Emails transaccionales", envVar: "RESEND_API_KEY", color: "#8b5cf6", logo: "https://resend.com/static/brand/resend-icon-black.png" },
  sentry:    { label: "Sentry", desc: "Monitoreo de errores", envVar: "SENTRY_DSN", color: "#fb4226", logo: "https://sentry.io/favicon.ico" },
  langfuse:  { label: "Langfuse", desc: "Observabilidad LLM", envVar: "LANGFUSE_PUBLIC_KEY + SECRET_KEY", color: "#f59e0b", logo: "https://langfuse.com/langfuse_logo_transbackground.svg" },
  stripe:    { label: "Stripe", desc: "Procesamiento de pagos", envVar: "STRIPE_SECRET_KEY", color: "#635bff", logo: "https://images.stripeassets.com/fzn2n1nzq965/HTTOloNPhisV9P4hlMPNA/cacf1bb88b9fc492dfad34378d844280/Stripe_icon_-_square.svg" },
};

export default function HealthPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/health");
      setData(res);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Error fetching health:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  const services = data?.services || {};
  const systemInfo = data?.system || {};
  const counts = { ok: 0, warning: 0, error: 0 };
  Object.values(services).forEach((s) => { counts[s?.status || "error"]++; });
  const total = counts.ok + counts.warning + counts.error;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Salud del Sistema</h1>
          <p className="text-sm text-foreground/60">Conectividad con servicios externos</p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-foreground/40">{lastChecked.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Verificando..." : "Verificar"}
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {loading && !data ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          <span className="text-sm">Verificando conectividad con los servicios...</span>
        </div>
      ) : data && (
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3 flex-1">
            {counts.ok > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-sm font-medium">{counts.ok}</span>
                <span className="text-xs text-foreground/50">conectados</span>
              </div>
            )}
            {counts.warning > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-sm font-medium">{counts.warning}</span>
                <span className="text-xs text-foreground/50">advertencias</span>
              </div>
            )}
            {counts.error > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-sm font-medium">{counts.error}</span>
                <span className="text-xs text-foreground/50">errores</span>
              </div>
            )}
          </div>
          {/* Progress dots */}
          <div className="flex gap-1">
            {Object.values(services).map((s, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${s?.status === "ok" ? "bg-green-500" : s?.status === "warning" ? "bg-amber-500" : "bg-red-500"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Service cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Object.entries(services).map(([name, service]) => {
            const meta = SERVICE_META[name] || { label: name, desc: "", envVar: "", color: "#666", initials: "??" };
            const status = service?.status || "error";
            const isOk = status === "ok";
            const isWarn = status === "warning";
            const enabled = service?.enabled;
            const alwaysOn = ["supabase", "pinecone", "openai"].includes(name);

            return (
              <div
                key={name}
                className={`rounded-xl border p-4 transition-colors ${
                  isOk ? "border-green-500/20" : isWarn ? "border-amber-500/20 bg-amber-500/5" : "border-red-500/20 bg-red-500/5"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: `${meta.color}15` }}>
                      {meta.logo ? (
                        <img src={meta.logo} alt={meta.label} className="w-5 h-5 object-contain" onError={(e) => { e.target.style.display = "none"; e.target.parentElement.textContent = meta.label[0]; }} />
                      ) : (
                        <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label[0]}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{meta.label}</p>
                        {!alwaysOn && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${enabled ? "bg-green-500/10 text-green-500" : "bg-foreground/5 text-foreground/40"}`}>
                            {enabled ? "Activo" : "Inactivo"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground/50">{meta.desc}</p>
                    </div>
                  </div>
                  {isOk ? (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  ) : isWarn ? (
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${isOk ? "text-green-500" : isWarn ? "text-amber-500" : "text-red-500"}`}>
                    {service?.details || (isOk ? "Conectado" : isWarn ? "No configurado" : "Error")}
                  </span>
                  {service?.latency_ms != null && (
                    <span className="text-xs text-foreground/40">{service.latency_ms}ms</span>
                  )}
                </div>

                {!isOk && (
                  <p className="text-xs text-foreground/40 font-mono mt-2 pt-2 border-t border-dashed">{meta.envVar}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* System info */}
      {data && systemInfo && Object.keys(systemInfo).length > 0 && (
        <div className="flex items-center gap-6 p-4 rounded-xl border bg-card text-sm">
          <div className="flex items-center gap-2 text-foreground/60">
            <Clock className="h-3.5 w-3.5" />
            <span>Uptime: <span className="font-medium text-foreground">{systemInfo.uptime_hours != null ? `${systemInfo.uptime_hours}h` : "—"}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground/60">
            <Cpu className="h-3.5 w-3.5" />
            <span>Python: <span className="font-medium text-foreground">{systemInfo.python || "—"}</span></span>
          </div>
          <div className="flex items-center gap-2 text-foreground/60">
            <HardDrive className="h-3.5 w-3.5" />
            <span>RAM: <span className="font-medium text-foreground">{systemInfo.memory || "—"}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
