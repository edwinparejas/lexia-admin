"use client";

import { useState, useEffect } from "react";
import { Save, RotateCcw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/auth";

const CONFIG_SECTIONS = [
  {
    key: "llm_config",
    label: "Modelos LLM",
    desc: "Modelos de OpenAI usados por cada componente del sistema.",
    fields: [
      { key: "clasificador_model", label: "Clasificador", type: "select", options: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"], hint: "Clasifica el tipo de consulta. gpt-4o-mini recomendado (15x mas barato)" },
      { key: "agent_model", label: "Agente principal", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Responde consultas generales y genera documentos" },
      { key: "crew_model", label: "CrewAI (analisis)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Agentes del analisis profundo. gpt-4o recomendado" },
      { key: "rag_model", label: "RAG (busqueda)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Genera respuestas basadas en documentos encontrados" },
      { key: "producto_model", label: "Asistente ventas", type: "select", options: ["gpt-4o-mini", "gpt-4o"], hint: "Responde preguntas sobre LexIA como producto" },
      { key: "embedding_model", label: "Embeddings", type: "select", options: ["text-embedding-3-small", "text-embedding-3-large"], hint: "Modelo de vectores. Cambiar requiere reindexar" },
    ],
  },
  {
    key: "rag_config",
    label: "RAG / Busqueda Legal",
    desc: "Parametros del motor de busqueda en Pinecone.",
    fields: [
      { key: "similarity_top_k", label: "Top K resultados", type: "number", hint: "Cantidad de fragmentos a recuperar por busqueda" },
      { key: "cache_ttl", label: "Cache TTL (segundos)", type: "number", hint: "Tiempo de vida del cache. 3600 = 1 hora" },
      { key: "cache_max_entries", label: "Cache max entradas", type: "number", hint: "Maximo de consultas cacheadas" },
      { key: "history_limit", label: "Historial de mensajes", type: "number", hint: "Mensajes de contexto enviados al LLM (6 = 3 turnos)" },
      { key: "history_truncation_length", label: "Truncar respuestas (chars)", type: "number", hint: "Respuestas largas en historial se cortan a esta longitud" },
    ],
  },
  {
    key: "crew_config",
    label: "Agentes CrewAI",
    desc: "Iteraciones maximas por agente. Mas iteraciones = mejor calidad pero mas tokens.",
    fields: [
      { key: "investigador_max_iter", label: "Investigador", type: "number", hint: "Busca leyes y normas" },
      { key: "analista_max_iter", label: "Analista", type: "number", hint: "Busca jurisprudencia" },
      { key: "validador_max_iter", label: "Validador", type: "number", hint: "Verifica fuentes" },
      { key: "redactor_max_iter", label: "Redactor", type: "number", hint: "Genera el documento final" },
      { key: "max_validation_retries", label: "Reintentos de validacion", type: "number", hint: "Veces que reintenta si la calidad es baja" },
    ],
  },
  {
    key: "rate_limits",
    label: "Rate Limiting",
    desc: "Limites de requests por usuario.",
    nested: true,
    fields: [
      { key: "chat.max", label: "Chat: max requests", type: "number", hint: "" },
      { key: "chat.window", label: "Chat: ventana (seg)", type: "number", hint: "" },
      { key: "pdf.max", label: "PDF: max requests", type: "number", hint: "" },
      { key: "pdf.window", label: "PDF: ventana (seg)", type: "number", hint: "" },
      { key: "documents.max", label: "Documentos: max", type: "number", hint: "" },
      { key: "documents.window", label: "Documentos: ventana", type: "number", hint: "" },
    ],
  },
  {
    key: "input_limits",
    label: "Limites de Input",
    desc: "Longitud maxima permitida por campo.",
    fields: [
      { key: "max_message_length", label: "Mensaje de chat", type: "number", hint: "Caracteres" },
      { key: "max_document_content_length", label: "Contenido documento", type: "number", hint: "Caracteres" },
      { key: "max_title_length", label: "Titulo documento", type: "number", hint: "Caracteres" },
    ],
  },
  {
    key: "alert_thresholds",
    label: "Umbrales de Alerta",
    desc: "Alertas automaticas cuando un usuario supera estos valores.",
    fields: [
      { key: "daily_queries_warning", label: "Consultas/dia (warning)", type: "number", hint: "Genera notificacion" },
      { key: "daily_queries_critical", label: "Consultas/dia (critico)", type: "number", hint: "Alerta urgente + email" },
      { key: "daily_cost_warning", label: "Costo/dia USD (warning)", type: "number", hint: "Ej: 0.50" },
      { key: "daily_cost_critical", label: "Costo/dia USD (critico)", type: "number", hint: "Ej: 2.00" },
      { key: "total_cost_warning", label: "Costo total USD", type: "number", hint: "Acumulado por usuario" },
    ],
  },
  {
    key: "plan_config",
    label: "Planes y Precios",
    desc: "Configuracion de cada plan de suscripcion.",
    nested: true,
    fields: [
      { key: "basico.limit", label: "Basico: consultas/mes", type: "number" },
      { key: "basico.price", label: "Basico: precio S/", type: "number" },
      { key: "profesional.limit", label: "Profesional: consultas/mes", type: "number" },
      { key: "profesional.price", label: "Profesional: precio S/", type: "number" },
      { key: "estudio.limit", label: "Estudio: consultas/mes (-1=ilimitado)", type: "number" },
      { key: "estudio.price", label: "Estudio: precio S/", type: "number" },
    ],
  },
  {
    key: "feature_access",
    label: "Acceso a Features Premium",
    desc: "Que planes tienen acceso a funcionalidades avanzadas.",
    type: "json",
  },
  {
    key: "prompt_injection_patterns",
    label: "Patrones de Prompt Injection",
    desc: "Textos que se bloquean automaticamente en mensajes de usuario.",
    type: "list",
  },
  {
    key: "document_detection",
    label: "Deteccion de Documentos",
    desc: "Regex para identificar cuando la IA genera un documento legal.",
    type: "json",
  },
];

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

function FormSection({ section, data, onSave }) {
  const [values, setValues] = useState(data || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { setValues(data || {}); }, [data]);

  function handleChange(fieldKey, val) {
    if (section.nested) {
      setValues(setNestedValue(values, fieldKey, val));
    } else {
      setValues({ ...values, [fieldKey]: val });
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave(section.key, values);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  // List editor for arrays (prompt injection patterns)
  if (section.type === "list") {
    const items = Array.isArray(values) ? values : [];
    return (
      <ConfigCard section={section} open={open} onToggle={() => setOpen(!open)} saved={saved}>
        {open && (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
                <button onClick={() => setValues(items.filter((_, j) => j !== i))} className="px-2 text-red-400 hover:text-red-300 text-sm">x</button>
              </div>
            ))}
            <button onClick={() => setValues([...items, ""])} className="text-xs text-indigo-400 hover:text-indigo-300">+ Agregar patron</button>
            <div className="pt-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        )}
      </ConfigCard>
    );
  }

  // JSON editor for complex objects
  if (section.type === "json") {
    const [jsonText, setJsonText] = useState(JSON.stringify(values, null, 2));
    useEffect(() => { setJsonText(JSON.stringify(data, null, 2)); }, [data]);
    return (
      <ConfigCard section={section} open={open} onToggle={() => setOpen(!open)} saved={saved}>
        {open && (
          <div className="space-y-2">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full h-32 p-3 bg-gray-950 border border-gray-700 rounded-lg font-mono text-xs text-gray-300 focus:border-indigo-500 focus:outline-none resize-y"
              spellCheck={false}
            />
            <button onClick={async () => {
              try { await onSave(section.key, JSON.parse(jsonText)); setSaved(true); setTimeout(() => setSaved(false), 3000); }
              catch { alert("JSON invalido"); }
            }} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs">Guardar</button>
          </div>
        )}
      </ConfigCard>
    );
  }

  // Form fields
  return (
    <ConfigCard section={section} open={open} onToggle={() => setOpen(!open)} saved={saved}>
      {open && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {section.fields.map((field) => {
              const val = section.nested ? getNestedValue(values, field.key) : values[field.key];
              return (
                <div key={field.key}>
                  <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      value={val || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                    >
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={val ?? ""}
                      onChange={(e) => handleChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-200 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                  {field.hint && <p className="text-[10px] text-gray-600 mt-0.5">{field.hint}</p>}
                </div>
              );
            })}
          </div>
          <button onClick={handleSave} disabled={saving} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs disabled:opacity-50">
            <Save className="h-3 w-3 inline mr-1" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      )}
    </ConfigCard>
  );
}

function ConfigCard({ section, open, onToggle, saved, children }) {
  return (
    <div className="bg-[#111118] rounded-xl border border-[#1e1e2a] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#15151f] transition-colors">
        <div>
          <h3 className="text-sm font-medium text-gray-100">{section.label}</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">{section.desc}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && <span className="text-[11px] text-green-400">Guardado</span>}
          {open ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5 border-t border-[#1e1e2a] pt-4">{children}</div>}
    </div>
  );
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/config");
      setConfig(data || {});
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
    return <div className="flex items-center justify-center h-full"><p className="text-gray-500 text-sm">Cargando configuracion...</p></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-100">Configuracion del Sistema</h1>
        <p className="text-sm text-gray-500">Los cambios se aplican en tiempo real (cache 5 min). No requiere redeploy.</p>
      </div>

      <div className="space-y-3">
        {CONFIG_SECTIONS.map((section) => (
          <FormSection
            key={section.key}
            section={section}
            data={config[section.key]}
            onSave={handleSave}
          />
        ))}
      </div>
    </div>
  );
}
