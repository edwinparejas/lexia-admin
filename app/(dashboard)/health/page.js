"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, Database, Brain, Mail, Server,
  RefreshCw, CheckCircle, XCircle, AlertCircle,
} from "lucide-react";

const SERVICE_ICONS = {
  supabase: Database,
  pinecone: Database,
  openai: Brain,
  resend: Mail,
};

const STATUS_STYLES = {
  healthy:  { dot: "bg-green-500",  badge: "bg-green-500/10 text-green-400 border-green-500/20" },
  degraded: { dot: "bg-yellow-500", badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  unhealthy:{ dot: "bg-red-500",    badge: "bg-red-500/10 text-red-400 border-red-500/20" },
};

function StatusIcon({ status }) {
  if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-400" />;
  if (status === "degraded") return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-red-400" />;
}

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
  const styles = STATUS_STYLES[overallStatus] || STATUS_STYLES.unhealthy;
  const services = data?.services || {};
  const systemInfo = data?.system || {};

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
            <p className="text-sm text-muted-foreground">
              Monitoreo en tiempo real de los servicios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-muted-foreground">
              Ultima verificacion: {lastChecked.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Overall status */}
      <Card>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusIcon status={overallStatus} />
            <span className="font-medium">Estado general</span>
          </div>
          <Badge className={styles.badge}>
            {overallStatus === "healthy" ? "Saludable" :
             overallStatus === "degraded" ? "Degradado" : "No disponible"}
          </Badge>
        </CardContent>
      </Card>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(services).map(([name, service]) => {
          const Icon = SERVICE_ICONS[name] || Server;
          const svcStatus = service?.status || "unhealthy";
          const svcStyles = STATUS_STYLES[svcStatus] || STATUS_STYLES.unhealthy;

          return (
            <Card key={name}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium capitalize">
                      {name}
                    </CardTitle>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${svcStyles.dot}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <Badge className={`text-xs ${svcStyles.badge}`}>
                    {svcStatus}
                  </Badge>
                  {service?.latency_ms != null && (
                    <p className="text-xs text-muted-foreground">
                      Latencia: {service.latency_ms}ms
                    </p>
                  )}
                  {service?.details && (
                    <p className="text-xs text-muted-foreground">
                      {service.details}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System info */}
      {systemInfo && Object.keys(systemInfo).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Informacion del Sistema
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {systemInfo.uptime && (
                <div>
                  <p className="text-xs text-muted-foreground">Uptime</p>
                  <p className="text-sm font-medium">{systemInfo.uptime}</p>
                </div>
              )}
              {systemInfo.python_version && (
                <div>
                  <p className="text-xs text-muted-foreground">Python</p>
                  <p className="text-sm font-medium">{systemInfo.python_version}</p>
                </div>
              )}
              {systemInfo.memory && (
                <div>
                  <p className="text-xs text-muted-foreground">Memoria</p>
                  <p className="text-sm font-medium">{systemInfo.memory}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
