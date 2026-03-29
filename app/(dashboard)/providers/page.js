"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, CheckCircle, XCircle, Cpu, DollarSign,
  Zap, ExternalLink, Play, Save, Info,
} from "lucide-react";

// ===== COMPONENT FIELD DEFINITIONS =====

const COMPONENT_FIELDS = [
  { key: "clasificador_model", label: "Clasificador", hint: "Determina el tipo de consulta (legal, producto, general). Tarea simple, usar modelo barato.", callsPerQuery: 1 },
  { key: "agent_model", label: "Agente principal", hint: "Responde consultas generales y genera documentos. El modelo mas importante del sistema.", callsPerQuery: 1 },
  { key: "crew_model", label: "CrewAI (analisis profundo)", hint: "4 agentes especializados. Cada analisis hace 8-12 llamadas al modelo.", callsPerQuery: 10 },
  { key: "rag_model", label: "RAG (busqueda legal)", hint: "Sintetiza respuestas a partir de fragmentos de legislacion encontrados en Pinecone.", callsPerQuery: 1 },
  { key: "producto_model", label: "Asistente de ventas", hint: "Responde preguntas sobre LexIA como producto. Tarea simple.", callsPerQuery: 1 },
];

// ===== PROVIDER VISUAL CONFIG =====

const PROVIDER_COLORS = {
  openai: "#10a37f",
  anthropic: "#d4a574",
  google: "#4285f4",
  groq: "#f55036",
  openrouter: "#7c3aed",
  ollama: "#1a1a2e",
};

const PROVIDER_LOGOS = {
  openai: "/logos/openai.svg",
  anthropic: "/logos/anthropic.svg",
  google: "/logos/google.svg",
  groq: "/logos/groq.svg",
  openrouter: "/logos/openrouter.svg",
  ollama: "/logos/ollama.svg",
};

function ProviderDot({ provider }) {
  const logo = PROVIDER_LOGOS[provider];
  if (logo) {
    return <img src={logo} alt={provider} className="w-4 h-4 object-contain shrink-0" />;
  }
  return <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PROVIDER_COLORS[provider] || "#666" }} />;
}

function ProviderIcon({ provider }) {
  const logo = PROVIDER_LOGOS[provider];
  const color = PROVIDER_COLORS[provider] || "#666";
  const initials = provider.slice(0, 2).toUpperCase();

  if (logo) {
    return (
      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted shrink-0 p-1.5">
        <img src={logo} alt={provider} className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: color }}>
      {initials}
    </div>
  );
}

// Proveedores con free tier (no cobran dentro de los limites)
const FREE_TIER_PROVIDERS = new Set(["groq", "google", "ollama"]);

// ===== MODEL ASSIGNMENT SECTION =====

function ModelAssignment({ llmConfig, setLlmConfig, modelOptions, availableModels, providerData, onSave, saving, saved }) {
  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2"><Cpu className="h-4 w-4" /> Asignacion de Modelos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Elige que modelo usa cada componente. Puedes mezclar proveedores.</p>
          </div>
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar"}
          </Button>
        </div>

        {/* Tabla de costos expandible */}
        {availableModels && (
          <details className="rounded-lg border p-3">
            <summary className="text-xs font-medium cursor-pointer flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> Ver tabla de costos por modelo
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 pr-3">Proveedor</th>
                    <th className="text-left py-1 pr-3">Modelo</th>
                    <th className="text-right py-1 pr-3">Input/1M tok</th>
                    <th className="text-right py-1 pr-3">Output/1M tok</th>
                    <th className="text-center py-1">Free tier</th>
                    <th className="text-center py-1">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {modelOptions.map((m) => {
                    const prov = m.id.includes(":") ? m.id.split(":")[0] : "openai";
                    const hasFree = FREE_TIER_PROVIDERS.has(prov);
                    return (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-3 text-foreground/60 flex items-center gap-1.5">
                          <ProviderDot provider={prov} />
                          {m.provider}
                        </td>
                        <td className="py-1.5 pr-3 font-mono">{m.label}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{m.free ? "Gratis" : `$${m.costIn}`}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{m.free ? "Gratis" : `$${m.costOut}`}</td>
                        <td className="py-1.5 text-center">
                          {hasFree ? (
                            <Badge className="bg-green-500/10 text-green-400 text-[10px]">Gratis</Badge>
                          ) : (
                            <Badge className="bg-zinc-500/10 text-zinc-400 text-[10px]">Pago</Badge>
                          )}
                        </td>
                        <td className="py-1.5 text-center">
                          {m.configured ? (
                            <Badge className="bg-green-500/10 text-green-400 text-[10px]">Listo</Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-400 text-[10px]">Sin key</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMPONENT_FIELDS.map((field) => {
            const currentVal = llmConfig[field.key] || "";
            const selected = modelOptions.find((m) => m.id === currentVal || m.label === currentVal);
            const provider = currentVal.includes(":") ? currentVal.split(":")[0] : "openai";
            const hasFree = FREE_TIER_PROVIDERS.has(provider);

            return (
              <div key={field.key} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium flex items-center gap-1.5">
                    <ProviderDot provider={provider} />
                    {field.label}
                  </label>
                  {hasFree && selected && (
                    <Badge className="bg-green-500/10 text-green-400 text-[10px]">Free tier</Badge>
                  )}
                </div>
                <select
                  value={currentVal}
                  onChange={(e) => setLlmConfig({ ...llmConfig, [field.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">-- Seleccionar modelo --</option>
                  {Object.entries(availableModels || {}).map(([prov, info]) => (
                    <optgroup key={prov} label={`${info.label}${info.configured ? "" : " (sin API key)"}${FREE_TIER_PROVIDERS.has(prov) ? " - GRATIS" : ""}`}>
                      {info.models.map((m) => (
                        <option key={m.id} value={m.id} disabled={!info.configured}>
                          {m.name} {m.free ? "(gratis)" : FREE_TIER_PROVIDERS.has(prov) ? "(free tier)" : `($${m.cost_input}/$${m.cost_output})`}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{field.hint}</p>
                {selected && field.callsPerQuery && (
                  hasFree ? (
                    <p className="text-xs text-green-400">
                      Gratis dentro del free tier ({field.callsPerQuery} llamada{field.callsPerQuery > 1 ? "s" : ""}/consulta)
                    </p>
                  ) : !selected.free ? (
                    <p className="text-xs text-amber-400">
                      ≈ ${((selected.costIn * 1000 + selected.costOut * 500) / 1_000_000 * field.callsPerQuery).toFixed(4)} USD/consulta ({field.callsPerQuery} llamada{field.callsPerQuery > 1 ? "s" : ""})
                    </p>
                  ) : null
                )}
              </div>
            );
          })}

          {/* Embeddings (fijo, solo info) */}
          <div className="rounded-lg border p-3 space-y-2 opacity-60">
            <label className="text-xs font-medium flex items-center gap-1.5">
              <ProviderDot provider="openai" />
              Embeddings
            </label>
            <div className="px-3 py-2 bg-muted border rounded-lg text-sm text-muted-foreground">
              {llmConfig.embedding_model || "text-embedding-3-small"} (no cambiar)
            </div>
            <p className="text-xs text-muted-foreground">Cambiar requiere reindexar toda la base legal en Pinecone.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ===== BALANCE DISPLAY =====

function BalanceDisplay({ balance, freeTier, pricingNote }) {
  if (balance && !balance.error) {
    const available = balance.total_available || 0;
    const used = balance.total_used || 0;
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <DollarSign className="h-3.5 w-3.5 text-green-500" />
          <span className="text-sm font-semibold text-green-600 dark:text-green-400">${available.toFixed(2)} disponible</span>
        </div>
        <p className="text-xs text-muted-foreground">
          ${used.toFixed(2)} usado{balance.total_granted ? ` de $${balance.total_granted.toFixed(2)}` : ""}
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

  return <p className="text-xs text-muted-foreground">{pricingNote || "Sin info de saldo"}</p>;
}

// ===== USAGE DISPLAY =====

function UsageDisplay({ usage }) {
  if (!usage || usage.messages === 0) {
    return <p className="text-xs text-muted-foreground">Sin uso este mes</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{usage.messages}</span> mensajes
        {" | "}
        <span className="font-medium text-foreground">{((usage.tokens_input + usage.tokens_output) / 1000).toFixed(1)}K</span> tokens
      </p>
      <p className="text-xs text-muted-foreground">
        Costo estimado: <span className="font-medium text-foreground">${usage.cost_usd.toFixed(4)}</span>
      </p>
    </div>
  );
}

// ===== PROVIDER CARD =====

function ProviderCard({ providerId, provider, activeConfig, testing, onTest, testResults }) {
  // Determinar qué componentes usan este proveedor
  const usedBy = COMPONENT_FIELDS.filter((f) => {
    const val = activeConfig[f.key] || "";
    const prov = val.includes(":") ? val.split(":")[0] : "openai";
    return prov === providerId;
  });

  return (
    <Card className={!provider.configured ? "opacity-50" : ""}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={providerId} />
            <div>
              <h3 className="font-semibold text-sm">{provider.label}</h3>
              <Badge variant={provider.configured ? "default" : "secondary"} className="text-[10px] mt-0.5">
                {provider.configured ? "Configurado" : "Sin API key"}
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
        <BalanceDisplay balance={provider.balance} freeTier={provider.free_tier} pricingNote={provider.pricing_note} />

        {/* Renewal */}
        {provider.renewal && (
          <p className="text-xs text-muted-foreground">Renovacion: {provider.renewal}</p>
        )}

        {/* Components using this provider */}
        {usedBy.length > 0 ? (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Usando en:</p>
            <div className="flex flex-wrap gap-1">
              {usedBy.map((f) => (
                <Badge key={f.key} variant="outline" className="text-[10px]">{f.label}</Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Ningun componente usa este proveedor</p>
        )}

        {/* Usage this month */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Uso este mes</p>
          <UsageDisplay usage={provider.usage_this_month} />
        </div>

        {/* Models with test buttons */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Modelos ({provider.models.length})</p>
          <div className="space-y-1">
            {provider.models.map((model) => {
              const testResult = testResults[model.id];
              return (
                <div key={model.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {model.is_free && <Zap className="h-3 w-3 text-amber-500 shrink-0" />}
                    <span className="truncate">{model.name}</span>
                    {!model.is_free && (
                      <span className="text-muted-foreground shrink-0">${model.cost_input_per_1m}/{model.cost_output_per_1m}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {testResult && (
                      testResult.success
                        ? <span className="text-green-500 text-[10px]">{testResult.latency_ms}ms</span>
                        : <XCircle className="h-3.5 w-3.5 text-red-500" />
                    )}
                    {testResult?.success && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                    {provider.configured && (
                      <button
                        onClick={() => onTest(model.id)}
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

        {/* Error details */}
        {Object.entries(testResults).filter(([k]) => k.startsWith(`${providerId}:`)).map(([modelId, result]) => (
          result && !result.success && (
            <p key={modelId} className="text-xs text-red-500 break-all">Error: {result.error?.slice(0, 120)}</p>
          )
        ))}
      </CardContent>
    </Card>
  );
}

// ===== MAIN PAGE =====

export default function ProvidersPage() {
  const [providerData, setProviderData] = useState(null);
  const [availableModels, setAvailableModels] = useState(null);
  const [llmConfig, setLlmConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [lastChecked, setLastChecked] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [providers, models, config] = await Promise.all([
        apiFetch("/api/admin/providers/status"),
        apiFetch("/api/admin/available-models").catch(() => null),
        apiFetch("/api/admin/config").catch(() => ({})),
      ]);
      setProviderData(providers);
      if (models) setAvailableModels(models);
      if (config?.llm_config) setLlmConfig(config.llm_config);
      setLastChecked(new Date());
    } catch (err) {
      console.error("Error fetching providers:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build flat model options for cost estimation
  const modelOptions = useMemo(() => {
    if (!availableModels) return [];
    const opts = [];
    for (const [provider, info] of Object.entries(availableModels)) {
      for (const m of info.models) {
        opts.push({
          id: m.id,
          label: m.name,
          provider: info.label,
          configured: info.configured,
          free: m.free,
          costIn: m.cost_input,
          costOut: m.cost_output,
        });
      }
    }
    return opts;
  }, [availableModels]);

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/admin/config/llm_config", {
        method: "PUT",
        body: JSON.stringify({ value: llmConfig }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Error saving config:", err);
    } finally {
      setSaving(false);
    }
  }

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

  const providers = providerData?.providers || {};
  const activeConfig = providerData?.active_config || llmConfig;
  const configuredCount = Object.values(providers).filter((p) => p.configured).length;
  const totalCount = Object.keys(providers).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Cpu className="h-8 w-8 text-foreground/60 animate-pulse mx-auto" />
          <p className="text-sm text-foreground/60 mt-2">Cargando proveedores...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Proveedores LLM</h1>
          <p className="text-sm text-foreground/60">
            {configuredCount} de {totalCount} proveedores configurados
            {providerData?.month && ` | Mes: ${providerData.month}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs text-foreground/40">
              {lastChecked.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Model Assignment */}
      <ModelAssignment
        llmConfig={llmConfig}
        setLlmConfig={setLlmConfig}
        modelOptions={modelOptions}
        availableModels={availableModels}
        providerData={providerData}
        onSave={handleSave}
        saving={saving}
        saved={saved}
      />

      {/* Provider Cards */}
      <div>
        <h2 className="text-sm font-bold mb-3">Proveedores Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(providers).map(([providerId, provider]) => (
            <ProviderCard
              key={providerId}
              providerId={providerId}
              provider={provider}
              activeConfig={llmConfig}
              testing={testing}
              onTest={handleTest}
              testResults={testResults}
            />
          ))}
        </div>
      </div>

      {/* Setup instructions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Como configurar un nuevo proveedor</h3>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Obtener una API key del proveedor (ver links de documentacion en cada card)</li>
            <li>Agregar la variable de entorno al servidor (ej: <code className="bg-muted px-1 rounded">GROQ_API_KEY=gsk_...</code>)</li>
            <li>Reiniciar el backend para que tome la nueva variable</li>
            <li>Seleccionar el modelo deseado en "Asignacion de Modelos" arriba</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
