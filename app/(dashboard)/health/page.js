"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Database, Brain, Mail, Server, Shield, BarChart3, CreditCard,
  RefreshCw, CheckCircle, XCircle, AlertCircle, Clock, Cpu, HardDrive,
} from "lucide-react";

const SERVICE_META = {
  supabase:  { label: "Supabase", desc: "Base de datos y autenticación", icon: Database, envVar: "SUPABASE_URL + SUPABASE_KEY" },
  pinecone:  { label: "Pinecone", desc: "Base de datos vectorial (RAG)", icon: Database, envVar: "PINECONE_API_KEY" },
  openai:    { label: "OpenAI", desc: "Modelos de IA (GPT-4o, embeddings)", icon: Brain, envVar: "OPENAI_API_KEY" },
  resend:    { label: "Resend", desc: "Envío de emails transaccionales", icon: Mail, envVar: "RESEND_API_KEY" },
  sentry:    { label: "Sentry", desc: "Monitoreo y captura de errores", icon: Shield, envVar: "SENTRY_DSN" },
  langfuse:  { label: "Langfuse", desc: "Observabilidad de llamadas LLM", icon: BarChart3, envVar: "LANGFUSE_PUBLIC_KEY + LANGFUSE_SECRET_KEY" },
  stripe:    { label: "Stripe", desc: "Procesamiento de pagos", icon: CreditCard, envVar: "STRIPE_SECRET_KEY" },
};

const STATUS_CONFIG = {
  ok:      { dot: "bg-green-500", badge: "bg-green-500/10 text-green-400 border-green-500/20", label: "Conectado", icon: CheckCircle, iconColor: "text-green-400" },
  warning: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Advertencia", icon: AlertCircle, iconColor: "text-amber-400" },
  error:   { dot: "bg-red-500",   badge: "bg-red-500/10 text-red-400 border-red-500/20", label: "Error", icon: XCircle, iconColor: "text-red-400" },
};

const OVERALL_CONFIG = {
  healthy:   { badge: "bg-green-500/10 text-green-400 border-green-500/20", label: "Todos los servicios operativos", icon: CheckCircle, iconColor: "text-green-400" },
  degraded:  { badge: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Algunos servicios con problemas", icon: AlertCircle, iconColor: "text-amber-400" },
  unhealthy: { badge: "bg-red-500/10 text-red-400 border-red-500/20", label: "Servicios no disponibles", icon: XCircle, iconColor: "text-red-400" },
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

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const overallStatus = data?.status || "unhealthy";
  const overall = OVERALL_CONFIG[overallStatus] || OVERALL_CONFIG.unhealthy;
  const OverallIcon = overall.icon;
  const services = data?.services || {};
  const systemInfo = data?.system || {};

  const counts = { ok: 0, warning: 0, error: 0 };
  Object.values(services).forEach((s) => { counts[s?.status || "error"]++; });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Salud del Sistema</h1>
            <p className="text-sm text-foreground/60">
              Verifica la conectividad real con cada servicio externo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-foreground/50 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lastChecked.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchHealth} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Verificando..." : "Verificar ahora"}
          </Button>
        </div>
      </div>

      {/* Overall status */}
      {loading && !data ? (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary animate-spin" />
              <div>
                <span className="font-medium">Verificando servicios...</span>
                <p className="text-xs text-foreground/50">Probando la conectividad con cada servicio externo</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={`border-l-4 ${overallStatus === "healthy" ? "border-l-green-500" : overallStatus === "degraded" ? "border-l-amber-500" : "border-l-red-500"}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OverallIcon className={`h-5 w-5 ${overall.iconColor}`} />
                <div>
                  <span className="font-medium">{overall.label}</span>
                  <p className="text-xs text-foreground/50">
                    {counts.ok} conectados · {counts.warning} advertencias · {counts.error} errores
                  </p>
                </div>
              </div>
              <Badge className={overall.badge}>
                {overallStatus === "healthy" ? "Saludable" : overallStatus === "degraded" ? "Degradado" : "No disponible"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service cards */}
      {data && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(services).map(([name, service]) => {
          const meta = SERVICE_META[name] || { label: name, desc: "", icon: Server, envVar: "" };
          const Icon = meta.icon;
          const svcStatus = service?.status || "error";
          const cfg = STATUS_CONFIG[svcStatus] || STATUS_CONFIG.error;
          const SvcIcon = cfg.icon;

          return (
            <Card key={name} className={`transition-colors ${svcStatus === "error" ? "border-red-500/30 bg-red-500/5" : svcStatus === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-green-500/10"}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${svcStatus === "ok" ? "bg-green-500/10" : svcStatus === "warning" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                      <Icon className={`h-4 w-4 ${svcStatus === "ok" ? "text-green-400" : svcStatus === "warning" ? "text-amber-400" : "text-red-400"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
                      <p className="text-xs text-foreground/50">{meta.desc}</p>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${cfg.dot} ${svcStatus === "ok" ? "animate-pulse" : ""}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <SvcIcon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
                  <Badge className={`text-xs ${cfg.badge}`}>{cfg.label}</Badge>
                  {service?.latency_ms != null && (
                    <span className="text-xs text-foreground/50 ml-auto">{service.latency_ms}ms</span>
                  )}
                </div>
                {service?.details && (
                  <p className={`text-xs font-medium ${svcStatus === "ok" ? "text-green-400" : svcStatus === "warning" ? "text-amber-400" : "text-red-400"}`}>
                    {service.details}
                  </p>
                )}
                {svcStatus !== "ok" && (
                  <div className={`rounded-lg p-2.5 text-xs space-y-1 ${svcStatus === "error" ? "bg-red-500/10 border border-red-500/20" : "bg-amber-500/10 border border-amber-500/20"}`}>
                    <p className="font-medium">{svcStatus === "error" ? "Acción requerida:" : "Para activar:"}</p>
                    <p className="text-foreground/70">Configura la variable de entorno en EasyPanel:</p>
                    <p className="font-mono font-medium">{meta.envVar}</p>
                  </div>
                )}
                {svcStatus === "ok" && (
                  <p className="text-xs text-foreground/40 font-mono">{meta.envVar}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>}

      {/* System info */}
      {systemInfo && Object.keys(systemInfo).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-foreground/60" />
              <CardTitle className="text-sm font-medium">Servidor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Clock className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Uptime</p>
                  <p className="text-sm font-medium">{systemInfo.uptime_hours != null ? `${systemInfo.uptime_hours}h` : systemInfo.uptime || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Cpu className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Python</p>
                  <p className="text-sm font-medium">{systemInfo.python || systemInfo.python_version || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <HardDrive className="h-4 w-4 text-foreground/50" />
                <div>
                  <p className="text-xs text-foreground/50">Memoria</p>
                  <p className="text-sm font-medium">{systemInfo.memory || "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-refresh notice */}
      <p className="text-xs text-foreground/40 text-center">
        Se actualiza automáticamente cada 60 segundos · Cada verificación prueba la conectividad real con el servicio
      </p>
    </div>
  );
}
