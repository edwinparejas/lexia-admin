"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Cpu, HardDrive, Server, Activity } from "lucide-react";

/* SVG brand icons for each service */
const SERVICE_LOGOS = {
  supabase: (
    <svg viewBox="0 0 109 113" className="h-5 w-5" fill="none">
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="#3ECF8E"/>
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#supabase-a)" fillOpacity="0.2"/>
      <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
      <defs><linearGradient id="supabase-a" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse"><stop stopColor="#249361"/><stop offset="1" stopColor="#3ECF8E"/></linearGradient></defs>
    </svg>
  ),
  pinecone: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M12 2L4 6v6l8 4 8-4V6l-8-4z" fill="#0F9D58" opacity="0.8"/>
      <path d="M12 12l8-4M12 12v10M12 12L4 8" stroke="#0F9D58" strokeWidth="1.5"/>
    </svg>
  ),
  openai: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.998 5.998 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
    </svg>
  ),
  resend: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  sentry: (
    <svg viewBox="0 0 72 66" className="h-5 w-5" fill="currentColor">
      <path d="M29 2.26a3.68 3.68 0 0 0-6.38 0L17.26 12a24.4 24.4 0 0 1 11.49 20.73h-6.12A18.4 18.4 0 0 0 8.3 19.78L2.3 30.25A3.68 3.68 0 0 0 5.49 35.8h3.52a1.89 1.89 0 1 0 0-3.78H5.49a.63.63 0 0 1-.54-1L9.86 22a14.5 14.5 0 0 1 12.36 10.68h-6.45a1.88 1.88 0 0 0-1.88 1.88A21.7 21.7 0 0 0 26.3 50.1l12-20.46a.63.63 0 0 1 1.08 0L51.78 50.1a.63.63 0 0 1-.54 1h-2.5a1.89 1.89 0 0 0 0 3.78h2.5a4.41 4.41 0 0 0 3.82-6.6Z"/>
    </svg>
  ),
  langfuse: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 14l3-4 3 2 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
    </svg>
  ),
  stripe: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
    </svg>
  ),
};

const SERVICE_META = {
  supabase:  { label: "Supabase", desc: "Base de datos y autenticación", envVar: "SUPABASE_URL + SUPABASE_KEY", color: "#3ECF8E" },
  pinecone:  { label: "Pinecone", desc: "Base de datos vectorial (RAG)", envVar: "PINECONE_API_KEY", color: "#0F9D58" },
  openai:    { label: "OpenAI", desc: "Modelos de IA (GPT-4o)", envVar: "OPENAI_API_KEY", color: "#10a37f" },
  resend:    { label: "Resend", desc: "Emails transaccionales", envVar: "RESEND_API_KEY", color: "#8b5cf6" },
  sentry:    { label: "Sentry", desc: "Monitoreo de errores", envVar: "SENTRY_DSN", color: "#fb4226" },
  langfuse:  { label: "Langfuse", desc: "Observabilidad LLM", envVar: "LANGFUSE_PUBLIC_KEY + SECRET_KEY", color: "#f59e0b" },
  stripe:    { label: "Stripe", desc: "Procesamiento de pagos", envVar: "STRIPE_SECRET_KEY", color: "#635bff" },
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
            const meta = SERVICE_META[name] || { label: name, desc: "", envVar: "", color: "#666" };
            const logo = SERVICE_LOGOS[name];
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
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0" style={{ color: meta.color }}>
                      {logo || <Server className="h-5 w-5" />}
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
