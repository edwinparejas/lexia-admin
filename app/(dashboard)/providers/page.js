"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, CheckCircle, XCircle, Cpu, DollarSign,
  Zap, ExternalLink, Play, Settings, ArrowRight,
} from "lucide-react";
import Link from "next/link";

const PROVIDER_COLORS = {
  openai: "#10a37f",
  anthropic: "#d4a574",
  google: "#4285f4",
  groq: "#f55036",
  openrouter: "#7c3aed",
  ollama: "#1a1a2e",
};

const PROVIDER_LOGOS = {
  openai: "/logos/openai.png",
  anthropic: "/logos/anthropic.png",
  google: "/logos/google.png",
  groq: "/logos/groq.png",
  openrouter: "/logos/openrouter.png",
  ollama: "/logos/ollama.png",
};

function ProviderIcon({ provider }) {
  const color = PROVIDER_COLORS[provider] || "#666";
  const initials = provider.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function BalanceDisplay({ balance, freeTier, pricingNote }) {
  if (balance && !balance.error) {
    const available = balance.total_available || 0;
    const used = balance.total_used || 0;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">
            ${available.toFixed(2)} disponible
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          ${used.toFixed(2)} usado
          {balance.total_granted ? ` de $${balance.total_granted.toFixed(2)}` : ""}
        </p>
      </div>
    );
  }

  if (freeTier) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Free tier</span>
        </div>
        <p className="text-xs text-muted-foreground">{freeTier.note || pricingNote}</p>
      </div>
    );
  }

  return (
    <p className="text-xs text-muted-foreground">{pricingNote || "Sin info de saldo"}</p>
  );
}

function UsageDisplay({ usage }) {
  if (!usage || usage.messages === 0) {
    return <p className="text-xs text-muted-foreground">Sin uso este mes</p>;
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{usage.messages}</span> mensajes
        {" | "}
        <span className="font-medium text-foreground">
          {((usage.tokens_input + usage.tokens_output) / 1000).toFixed(1)}K
        </span> tokens
      </p>
      <p className="text-xs text-muted-foreground">
        Costo estimado: <span className="font-medium text-foreground">${usage.cost_usd.toFixed(4)}</span>
      </p>
    </div>
  );
}

function ActiveConfigBadges({ activeConfig, providers }) {
  const components = [
    { key: "clasificador", label: "Clasificador" },
    { key: "agente", label: "Agente" },
    { key: "rag", label: "RAG" },
    { key: "crew", label: "Crew" },
    { key: "producto", label: "Producto" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {components.map(({ key, label }) => {
        const modelId = activeConfig[key] || "?";
        const provider = modelId.includes(":") ? modelId.split(":")[0] : "openai";
        const model = modelId.includes(":") ? modelId.split(":")[1] : modelId;
        const color = PROVIDER_COLORS[provider] || "#666";
        return (
          <div
            key={key}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-card text-xs"
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium truncate max-w-[140px]">{model}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ProvidersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [lastChecked, setLastChecked] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/providers/status");
      setData(res);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleTest(modelId) {
    setTesting(modelId);
    try {
      const res = await apiFetch("/api/admin/providers/test", {
        method: "POST",
        body: JSON.stringify({ model_id: modelId }),
      });
      setTestResults((prev) => ({ ...prev, [modelId]: res }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [modelId]: { success: false, error: err.message } }));
    } finally {
      setTesting(null);
    }
  }

  const providers = data?.providers || {};
  const activeConfig = data?.active_config || {};
  const configuredCount = Object.values(providers).filter((p) => p.configured).length;
  const totalCount = Object.keys(providers).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Proveedores LLM</h1>
          <p className="text-sm text-foreground/60">
            {configuredCount} de {totalCount} proveedores configurados
            {data?.month && ` | Uso del mes: ${data.month}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-foreground/40">
              {lastChecked.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Link href="/config">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1.5" />
              Cambiar Modelos
            </Button>
          </Link>
        </div>
      </div>

      {/* Config activa */}
      {activeConfig && Object.keys(activeConfig).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Configuracion Activa</h2>
              <Link href="/config" className="text-xs text-primary hover:underline flex items-center gap-1">
                Editar <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ActiveConfigBadges activeConfig={activeConfig} providers={providers} />
          </CardContent>
        </Card>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.entries(providers).map(([providerId, provider]) => (
          <Card key={providerId} className={!provider.configured ? "opacity-60" : ""}>
            <CardContent className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <ProviderIcon provider={providerId} />
                  <div>
                    <h3 className="font-semibold text-sm">{provider.label}</h3>
                    <Badge variant={provider.configured ? "default" : "secondary"} className="text-[10px] mt-0.5">
                      {provider.configured ? "Configurado" : "No configurado"}
                    </Badge>
                  </div>
                </div>
                {provider.docs_url && (
                  <a href={provider.docs_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Balance / Free tier */}
              <BalanceDisplay
                balance={provider.balance}
                freeTier={provider.free_tier}
                pricingNote={provider.pricing_note}
              />

              {/* Renewal info */}
              {provider.renewal && (
                <p className="text-xs text-muted-foreground">
                  Renovacion: {provider.renewal}
                </p>
              )}

              {/* Usage this month */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Uso este mes</p>
                <UsageDisplay usage={provider.usage_this_month} />
              </div>

              {/* Models */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Modelos ({provider.models.length})
                </p>
                <div className="space-y-1">
                  {provider.models.map((model) => {
                    const testResult = testResults[model.id];
                    return (
                      <div
                        key={model.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          {model.is_free && (
                            <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                          )}
                          <span className="truncate">{model.name}</span>
                          {!model.is_free && (
                            <span className="text-muted-foreground shrink-0">
                              ${model.cost_input_per_1m}/{model.cost_output_per_1m}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {testResult && (
                            testResult.success
                              ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                              : <XCircle className="h-3.5 w-3.5 text-red-500" />
                          )}
                          {provider.configured && (
                            <button
                              onClick={() => handleTest(model.id)}
                              disabled={testing === model.id}
                              className="p-0.5 hover:bg-accent rounded disabled:opacity-50"
                              title="Probar modelo"
                            >
                              <Play className={`h-3 w-3 ${testing === model.id ? "animate-pulse" : ""}`} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Test result detail */}
              {Object.entries(testResults).filter(([k]) => k.startsWith(`${providerId}:`)).map(([modelId, result]) => (
                result && !result.success && (
                  <p key={modelId} className="text-xs text-red-500 break-all">
                    Error: {result.error?.slice(0, 100)}
                  </p>
                )
              ))}
              {Object.entries(testResults).filter(([k]) => k.startsWith(`${providerId}:`)).map(([modelId, result]) => (
                result && result.success && (
                  <p key={modelId} className="text-xs text-green-600 dark:text-green-400">
                    OK ({result.latency_ms}ms)
                  </p>
                )
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Env var hint */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Como configurar un nuevo proveedor</h3>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Obtener una API key del proveedor (ver links de documentacion arriba)</li>
            <li>Agregar la variable de entorno al servidor (ej: <code className="bg-muted px-1 rounded">GROQ_API_KEY=gsk_...</code>)</li>
            <li>Reiniciar el backend para que tome la nueva variable</li>
            <li>Ir a <Link href="/config" className="text-primary hover:underline">Configuracion</Link> y seleccionar el modelo deseado para cada componente</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
