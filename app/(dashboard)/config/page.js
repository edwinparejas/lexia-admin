"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Save, ChevronDown, ChevronUp, Cpu, Search as SearchIcon,
  Bot, Shield, Gauge, Type, AlertTriangle, CreditCard, Lock, FileText, Sparkles,
  DollarSign, Info, ExternalLink, Power,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SECTION_ICONS = {
  llm_config: Cpu,
  rag_config: SearchIcon,
  crew_config: Bot,
  rate_limits: Shield,
  input_limits: Type,
  alert_thresholds: AlertTriangle,
  plan_config: CreditCard,
  feature_access: Lock,
  prompt_injection_patterns: Shield,
  document_detection: FileText,
  service_toggles: Power,
  cache_config: Sparkles,
  token_limits: Gauge,
  chat_config: Bot,
};

const CONFIG_SECTIONS = [
  {
    key: "service_toggles",
    label: "Control del Servicio",
    desc: "Llaves de emergencia para activar/desactivar funcionalidades del sistema.",
    category: "Seguridad",
    fields: [
      { key: "llm_enabled", label: "LLM habilitado", type: "boolean", hint: "Si se desactiva, el chat responde con mensaje de mantenimiento. No se gastan tokens." },
      { key: "registration_enabled", label: "Registro habilitado", type: "boolean", hint: "Si se desactiva, nadie puede crear cuentas nuevas." },
      { key: "landing_chatbot_enabled", label: "Chatbot del landing", type: "boolean", hint: "Si se desactiva, el widget de Chatwoot no aparece en la landing page." },
      { key: "maintenance_message", label: "Mensaje de mantenimiento", hint: "Texto que se muestra cuando el LLM está desactivado." },
    ],
  },
  {
    key: "token_limits",
    label: "Limites de Tokens",
    desc: "Controla el tamaño máximo de mensajes e historial para optimizar costos.",
    category: "Seguridad",
    fields: [
      { key: "max_message_length", label: "Max largo de mensaje", type: "number", hint: "Caracteres máximos por mensaje del usuario.", min: 100, max: 50000 },
      { key: "max_document_content_length", label: "Max largo de documento", type: "number", hint: "Caracteres máximos para contenido de documentos.", min: 1000, max: 500000 },
      { key: "max_history_messages", label: "Max mensajes en historial", type: "number", hint: "Cuántos mensajes previos se envían al LLM como contexto.", min: 1, max: 20 },
      { key: "max_history_message_length", label: "Max largo por mensaje historial", type: "number", hint: "Trunca mensajes del historial a esta longitud.", min: 100, max: 5000 },
    ],
  },
  {
    key: "cache_config",
    label: "Cache de Respuestas",
    desc: "Cache semántico para evitar llamadas repetidas al LLM con consultas similares.",
    category: "IA",
    fields: [
      { key: "response_cache_enabled", label: "Cache habilitado", type: "boolean", hint: "Si se activa, respuestas a consultas similares se sirven del cache." },
      { key: "response_cache_ttl_hours", label: "TTL del cache (horas)", type: "number", hint: "Cuántas horas dura una respuesta cacheada.", min: 1, max: 168 },
      { key: "min_query_length", label: "Min largo de consulta para cache", type: "number", hint: "No cachear consultas muy cortas.", min: 5, max: 100 },
    ],
  },
  {
    key: "chat_config",
    label: "Configuración del Chat",
    desc: "Opciones de la interfaz de chat.",
    category: "IA",
    fields: [
      { key: "max_suggestions", label: "Max sugerencias", type: "number", hint: "Cantidad máxima de sugerencias de seguimiento.", min: 1, max: 10 },
    ],
  },
  {
    key: "llm_config",
    label: "Modelos LLM",
    desc: "Selecciona el proveedor y modelo para cada componente. Soporta OpenAI, Claude, Gemini, Groq y Ollama.",
    category: "IA",
    type: "llm",
    fields: [
      { key: "clasificador_model", label: "Clasificador", hint: "Clasifica el tipo de consulta (1 palabra). Solo necesita un modelo barato/rápido.", callsPerQuery: 1, docs: "https://platform.openai.com/docs/models" },
      { key: "agent_model", label: "Agente principal", hint: "Responde consultas generales y genera documentos legales. El modelo más importante.", callsPerQuery: 1, docs: "https://platform.openai.com/docs/models" },
      { key: "crew_model", label: "CrewAI (análisis profundo)", hint: "Usado por los 4 agentes del análisis profundo. Cada análisis hace ~8-12 llamadas.", callsPerQuery: 10, docs: "https://docs.crewai.com/" },
      { key: "rag_model", label: "RAG (búsqueda legal)", hint: "Sintetiza respuestas a partir de artículos encontrados en Pinecone.", callsPerQuery: 1, docs: "https://docs.llamaindex.ai/" },
      { key: "producto_model", label: "Asistente de ventas", hint: "Responde preguntas sobre LexIA como producto. Consultas simples.", callsPerQuery: 1 },
      { key: "embedding_model", label: "Embeddings", hint: "⚠️ Cambiar requiere REINDEXAR toda la base legal.", type: "select", options: ["text-embedding-3-small", "text-embedding-3-large"] },
    ],
  },
  {
    key: "rag_config",
    label: "RAG / Búsqueda Legal",
    desc: "Controla cómo busca y recupera artículos de la legislación peruana en Pinecone.",
    category: "IA",
    fields: [
      { key: "similarity_top_k", label: "Top K resultados", type: "number", min: 1, max: 20, hint: "Cuántos fragmentos de legislación recuperar por búsqueda. 📊 Más = respuestas más completas pero más lentas y costosas. Recomendado: 5-10.", dynamicHint: (v) => v > 10 ? "⚠️ Más de 10 puede ser lento y costoso" : v < 3 ? "⚠️ Menos de 3 puede dar respuestas incompletas" : "✅ Valor adecuado" },
      { key: "cache_ttl", label: "Cache TTL (segundos)", type: "number", min: 0, max: 86400, hint: "Tiempo que una consulta repetida se sirve desde cache. 💡 3600 = 1 hora.", dynamicHint: (v) => `= ${v >= 3600 ? `${(v/3600).toFixed(1)} horas` : v >= 60 ? `${Math.round(v/60)} minutos` : `${v} segundos`}. ${v === 0 ? "Cache desactivado (más caro)" : v > 7200 ? "Cache largo: respuestas pueden estar desactualizadas" : ""}` },
      { key: "cache_max_entries", label: "Cache max entradas", type: "number", min: 10, max: 5000, hint: "Máximo de consultas cacheadas en memoria.", dynamicHint: (v) => `≈ ${Math.round(v * 0.1)}MB de RAM` },
      { key: "history_limit", label: "Historial de mensajes", type: "number", min: 0, max: 20, hint: "Mensajes anteriores enviados como contexto al LLM.", dynamicHint: (v) => `= ${Math.floor(v/2)} turnos de conversación. ${v > 10 ? "⚠️ Mucho contexto = más tokens = más costo" : v === 0 ? "Sin contexto (cada mensaje es independiente)" : ""}` },
      { key: "history_truncation_length", label: "Truncar respuestas (chars)", type: "number", min: 500, max: 10000, hint: "Las respuestas largas en historial se cortan.", dynamicHint: (v) => `≈ ${Math.round(v/4)} tokens` },
    ],
  },
  {
    key: "crew_config",
    label: "Agentes CrewAI",
    desc: "Controla cuántas veces cada agente puede iterar en el análisis profundo. Más iteraciones = mejor calidad pero más costo.",
    category: "IA",
    fields: [
      { key: "investigador_max_iter", label: "Investigador", type: "number", min: 1, max: 10, hint: "Busca leyes y normas en Pinecone.", dynamicHint: (v) => `Hará ~${v} búsquedas. ${v > 5 ? "⚠️ Lento y costoso" : v < 2 ? "⚠️ Puede no encontrar lo relevante" : "✅ Balance adecuado"}` },
      { key: "analista_max_iter", label: "Analista", type: "number", min: 1, max: 10, hint: "Busca jurisprudencia y precedentes del TC.", dynamicHint: (v) => `Hará ~${v} búsquedas de sentencias. Recomendado: 3-4` },
      { key: "validador_max_iter", label: "Validador", type: "number", min: 1, max: 5, hint: "Verifica fuentes citadas. ⚠️ Es el control de calidad.", dynamicHint: (v) => v < 2 ? "⚠️ Puede dejar pasar citas falsas" : "✅ Suficiente para validar" },
      { key: "redactor_max_iter", label: "Redactor", type: "number", min: 1, max: 5, hint: "Genera el documento final.", dynamicHint: (v) => `${v} iteraciones de redacción. 💡 2 es suficiente` },
      { key: "max_validation_retries", label: "Reintentos de validación", type: "number", min: 0, max: 3, hint: "Reintentos si la calidad es baja.", dynamicHint: (v) => `⚠️ Cada reintento ${v > 0 ? `multiplica el costo x${v + 1}` : "no tiene costo extra (0 reintentos)"}` },
    ],
  },
  {
    key: "rate_limits",
    label: "Rate Limiting",
    desc: "Protege contra abuso limitando requests por usuario en una ventana de tiempo.",
    category: "Seguridad",
    nested: true,
    fields: [
      { key: "chat.max", label: "Chat: max requests", type: "number", hint: "Máximo de mensajes de chat por ventana. 📊 Ej: 20 mensajes en 60 segundos. Protege contra spam automatizado." },
      { key: "chat.window", label: "Chat: ventana (seg)", type: "number", hint: "Ventana de tiempo en segundos. 💡 60 = el usuario puede enviar hasta [max] mensajes por minuto." },
      { key: "pdf.max", label: "PDF: max requests", type: "number", hint: "Descargas de PDF por ventana. Los PDFs son costosos de generar (WeasyPrint)." },
      { key: "pdf.window", label: "PDF: ventana (seg)", type: "number", hint: "Ventana para el límite de PDFs." },
      { key: "documents.max", label: "Documentos: max", type: "number", hint: "Operaciones CRUD de documentos guardados por ventana." },
      { key: "documents.window", label: "Documentos: ventana", type: "number", hint: "Ventana para el límite de documentos." },
    ],
  },
  {
    key: "input_limits",
    label: "Límites de Input",
    desc: "Longitud máxima de texto que acepta el sistema. Protege contra inputs excesivamente largos que consumen muchos tokens.",
    category: "Seguridad",
    fields: [
      { key: "max_message_length", label: "Mensaje de chat", type: "number", hint: "Máximo de caracteres por mensaje. 📊 4000 chars ≈ 1000 tokens de input. Subir permite preguntas más detalladas pero aumenta costo." },
      { key: "max_document_content_length", label: "Contenido documento", type: "number", hint: "Máximo para documentos guardados/editados por el usuario." },
      { key: "max_title_length", label: "Título documento", type: "number", hint: "Máximo para títulos de documentos guardados." },
    ],
  },
  {
    key: "alert_thresholds",
    label: "Umbrales de Alerta",
    desc: "El sistema genera alertas automáticas cuando un usuario supera estos límites. Las alertas aparecen en el audit log y se envían por email.",
    category: "Seguridad",
    fields: [
      { key: "daily_queries_warning", label: "Consultas/día (warning)", type: "number", hint: "Genera una notificación amarilla al usuario y un registro en audit log. 💡 50 consultas/día es uso intenso para un abogado." },
      { key: "daily_queries_critical", label: "Consultas/día (crítico)", type: "number", hint: "⚠️ Genera alerta urgente + email al admin. Puede indicar uso automatizado o abuso." },
      { key: "daily_cost_warning", label: "Costo/día USD (warning)", type: "number", hint: "Alerta si un usuario gasta más de este monto en un día. 💡 $0.50/día ≈ 50 consultas con gpt-4o-mini." },
      { key: "daily_cost_critical", label: "Costo/día USD (crítico)", type: "number", hint: "⚠️ Alerta urgente. $2/día ≈ 20 análisis profundos con gpt-4o. Revisar si es uso legítimo." },
      { key: "total_cost_warning", label: "Costo total USD", type: "number", hint: "Alerta cuando el costo acumulado total de un usuario supera este monto." },
    ],
  },
  {
    key: "plan_config",
    label: "Planes y Precios",
    desc: "Configuración de cada plan de suscripción. Los cambios afectan los límites de nuevos usuarios y upgrades.",
    category: "Negocio",
    nested: true,
    fields: [
      { key: "basico.limit", label: "Básico: consultas/mes", type: "number", hint: "Consultas mensuales incluidas en el plan Básico (S/49). Se reinician cada mes." },
      { key: "basico.price", label: "Básico: precio S/", type: "number", hint: "Precio mensual en soles. Cambiar no afecta suscripciones activas de Stripe." },
      { key: "profesional.limit", label: "Profesional: consultas/mes", type: "number", hint: "Incluye análisis profundo con CrewAI. 💡 500 consultas es suficiente para un estudio mediano." },
      { key: "profesional.price", label: "Profesional: precio S/", type: "number", hint: "Precio mensual. Incluye acceso a multi-agente y documentos." },
      { key: "estudio.limit", label: "Estudio: consultas/mes", type: "number", hint: "Usar -1 para ilimitado. ⚠️ Monitorear el costo real por usuario con alertas." },
      { key: "estudio.price", label: "Estudio: precio S/", type: "number", hint: "Plan premium para estudios grandes. Incluye API de integración." },
    ],
  },
  {
    key: "feature_access",
    label: "Acceso a Features Premium",
    desc: "Qué planes tienen acceso a funcionalidades avanzadas.",
    category: "Negocio",
    type: "json",
  },
  {
    key: "prompt_injection_patterns",
    label: "Patrones de Prompt Injection",
    desc: "Textos que se bloquean automáticamente en mensajes de usuario.",
    category: "Seguridad",
    type: "list",
  },
  {
    key: "document_detection",
    label: "Detección de Documentos",
    desc: "Regex para identificar cuando la IA genera un documento legal.",
    category: "IA",
    type: "json",
  },
];

const CATEGORIES = ["IA", "Seguridad", "Negocio"];

function getNestedValue(obj, path) {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, path, value) {
  const clone = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let target = clone;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!target[keys[i]]) target[keys[i]] = {};
    target = target[keys[i]];
  }
  target[keys[keys.length - 1]] = value;
  return clone;
}

function LlmSection({ section, data, onSave, availableModels }) {
  const [values, setValues] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { setValues(data || {}); }, [data]);

  // Build flat options list from available models
  const modelOptions = useMemo(() => {
    if (!availableModels) return [];
    const opts = [];
    for (const [provider, info] of Object.entries(availableModels)) {
      for (const m of info.models) {
        opts.push({
          id: m.id,
          label: `${m.name}`,
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
    await onSave(section.key, values);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <ConfigCard section={section} icon={Cpu} open={open} onToggle={() => setOpen(!open)} saved={saved}>
      {open && (
        <div className="space-y-4">
          {/* Cost table */}
          {availableModels && (
            <details className="rounded-lg border p-3">
              <summary className="text-xs font-medium cursor-pointer flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Ver tabla de costos por modelo
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-3">Proveedor</th>
                      <th className="text-left py-1 pr-3">Modelo</th>
                      <th className="text-right py-1 pr-3">Input/1M tok</th>
                      <th className="text-right py-1 pr-3">Output/1M tok</th>
                      <th className="text-center py-1">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelOptions.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-1.5 pr-3 text-muted-foreground">{m.provider}</td>
                        <td className="py-1.5 pr-3 font-mono">{m.label}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{m.free ? "Gratis" : `$${m.costIn}`}</td>
                        <td className="py-1.5 pr-3 text-right font-mono">{m.free ? "Gratis" : `$${m.costOut}`}</td>
                        <td className="py-1.5 text-center">
                          {m.configured ? (
                            <Badge className="bg-green-500/10 text-green-400 text-[9px]">Listo</Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-400 text-[9px]">Sin API key</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          {/* Model selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {section.fields.map((field) => {
              const currentVal = values[field.key] || "";
              const selected = modelOptions.find((m) => m.id === currentVal || m.label === currentVal);

              // Embedding uses simple select
              if (field.type === "select") {
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium mb-1">{field.label}</label>
                    <select value={currentVal} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none">
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <p className="text-[10px] text-muted-foreground mt-1">{field.hint}</p>
                  </div>
                );
              }

              return (
                <div key={field.key} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium">{field.label}</label>
                    {field.docs && <a href={field.docs} target="_blank" rel="noopener" className="text-[9px] text-primary hover:underline flex items-center gap-0.5"><Info className="h-2.5 w-2.5" />Docs</a>}
                  </div>
                  <select
                    value={currentVal}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">— Seleccionar modelo —</option>
                    {Object.entries(availableModels || {}).map(([prov, info]) => (
                      <optgroup key={prov} label={`${info.label}${info.configured ? "" : " (sin API key)"}`}>
                        {info.models.map((m) => (
                          <option key={m.id} value={m.id} disabled={!info.configured}>
                            {m.name} {m.free ? "(gratis)" : `($${m.cost_input}/$${m.cost_output})`}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground">{field.hint}</p>
                  {selected && field.callsPerQuery && !selected.free && (
                    <p className="text-[10px] text-amber-400">
                      ≈ ${((selected.costIn * 1000 + selected.costOut * 500) / 1_000_000 * field.callsPerQuery).toFixed(4)} USD/consulta ({field.callsPerQuery} llamada{field.callsPerQuery > 1 ? "s" : ""})
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </ConfigCard>
  );
}

function FormSection({ section, data, onSave }) {
  const [values, setValues] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => { setValues(data || {}); }, [data]);

  function handleChange(fieldKey, val, field) {
    if (field?.type === "number" && field.min != null && val < field.min) return;
    if (field?.type === "number" && field.max != null && val > field.max) return;
    if (section.nested) {
      setValues(setNestedValue(values, fieldKey, val));
    } else {
      setValues({ ...values, [fieldKey]: val });
    }
  }

  function validate() {
    const errs = {};
    for (const field of (section.fields || [])) {
      const val = section.nested ? getNestedValue(values, field.key) : values[field.key];
      if (field.type === "number") {
        if (val === "" || val === null || val === undefined) { errs[field.key] = "Requerido"; continue; }
        if (field.min != null && val < field.min) errs[field.key] = `Mínimo: ${field.min}`;
        if (field.max != null && val > field.max) errs[field.key] = `Máximo: ${field.max}`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(section.key, values);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const Icon = SECTION_ICONS[section.key] || Sparkles;

  // List editor
  if (section.type === "list") {
    const items = Array.isArray(values) ? values : [];
    return (
      <ConfigCard section={section} icon={Icon} open={open} onToggle={() => setOpen(!open)} saved={saved}>
        {open && (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => { const next = [...items]; next[i] = e.target.value; setValues(next); }}
                  className="flex-1 px-3 py-1.5 bg-muted border rounded-lg text-sm font-mono focus:border-primary focus:outline-none"
                />
                <button onClick={() => setValues(items.filter((_, j) => j !== i))} className="px-2 text-destructive hover:text-destructive/80 text-sm">×</button>
              </div>
            ))}
            <button onClick={() => setValues([...items, ""])} className="text-xs text-primary hover:text-primary/80">+ Agregar patrón</button>
            <div className="pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3 w-3 mr-1" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        )}
      </ConfigCard>
    );
  }

  // JSON editor
  if (section.type === "json") {
    const [jsonText, setJsonText] = useState(JSON.stringify(values, null, 2));
    useEffect(() => { setJsonText(JSON.stringify(data, null, 2)); }, [data]);
    return (
      <ConfigCard section={section} icon={Icon} open={open} onToggle={() => setOpen(!open)} saved={saved}>
        {open && (
          <div className="space-y-2">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-32 p-3 bg-muted border rounded-lg font-mono text-xs focus:border-primary focus:outline-none resize-y"
              spellCheck={false}
            />
            <Button size="sm" onClick={async () => {
              try { await onSave(section.key, JSON.parse(jsonText)); setSaved(true); setTimeout(() => setSaved(false), 3000); }
              catch { alert("JSON inválido"); }
            }}>
              <Save className="h-3 w-3 mr-1" />
              Guardar
            </Button>
          </div>
        )}
      </ConfigCard>
    );
  }

  // Form fields
  return (
    <ConfigCard section={section} icon={Icon} open={open} onToggle={() => setOpen(!open)} saved={saved}>
      {open && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((field) => {
              const val = section.nested ? getNestedValue(values, field.key) : values[field.key];
              const err = errors[field.key];
              const dynHint = field.dynamicHint && val != null ? field.dynamicHint(val) : null;
              return (
                <div key={field.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium">{field.label}</label>
                    {field.min != null && <span className="text-[9px] text-muted-foreground">{field.min} — {field.max}</span>}
                  </div>
                  {field.type === "boolean" ? (
                    <button
                      type="button"
                      onClick={() => handleChange(field.key, !val, field)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${val ? "bg-green-500" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
                      <span className="sr-only">{field.label}</span>
                    </button>
                  ) : field.type === "select" ? (
                    <select
                      value={val || ""}
                      onChange={(e) => handleChange(field.key, e.target.value, field)}
                      className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                    >
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={val ?? ""}
                      min={field.min}
                      max={field.max}
                      onChange={(e) => handleChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value, field)}
                      className={`w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:outline-none ${err ? "border-destructive focus:border-destructive" : "focus:border-primary"}`}
                    />
                  )}
                  {err && <p className="text-[10px] text-destructive mt-0.5">{err}</p>}
                  {field.hint && <p className="text-[10px] text-muted-foreground mt-0.5">{field.hint}</p>}
                  {dynHint && <p className="text-[10px] text-amber-400 mt-0.5">{dynHint}</p>}
                </div>
              );
            })}
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </ConfigCard>
  );
}

function ConfigCard({ section, icon: Icon, open, onToggle, saved, children }) {
  return (
    <Card className="overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium">{section.label}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{section.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <Badge className="bg-green-500/10 text-green-400 text-[10px]">Guardado</Badge>}
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t pt-4">{children}</div>}
    </Card>
  );
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("IA");
  const [availableModels, setAvailableModels] = useState(null);

  async function loadConfig() {
    setLoading(true);
    try {
      const [data, models] = await Promise.all([
        apiFetch("/api/admin/config"),
        apiFetch("/api/admin/available-models").catch(() => null),
      ]);
      setConfig(data || {});
      if (models) setAvailableModels(models);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadConfig(); }, []);

  async function handleSave(key, value) {
    try {
      await apiFetch(`/api/admin/config/${key}`, { method: "PUT", body: JSON.stringify({ value }) });
      loadConfig();
    } catch { alert("Error al guardar"); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  const filteredSections = CONFIG_SECTIONS.filter((s) => s.category === activeCategory);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración del Sistema</h1>
        <p className="text-sm text-muted-foreground">Los cambios se aplican en tiempo real (cache 5 min). No requiere redeploy.</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 border-b pb-3">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
            className="text-xs"
          >
            {cat}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredSections.map((section) => (
          section.type === "llm" ? (
            <LlmSection
              key={section.key}
              section={section}
              data={config[section.key]}
              onSave={handleSave}
              availableModels={availableModels}
            />
          ) : (
            <FormSection
              key={section.key}
              section={section}
              data={config[section.key]}
              onSave={handleSave}
            />
          )
        ))}
      </div>
    </div>
  );
}
