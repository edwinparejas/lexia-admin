"use client";

import { useState, useEffect } from "react";
import {
  Save, ChevronDown, ChevronUp, Cpu, Search as SearchIcon,
  Bot, Shield, Gauge, Type, AlertTriangle, CreditCard, Lock, FileText, Sparkles,
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
};

const CONFIG_SECTIONS = [
  {
    key: "llm_config",
    label: "Modelos LLM",
    desc: "Modelos de OpenAI usados por cada componente del sistema.",
    category: "IA",
    fields: [
      { key: "clasificador_model", label: "Clasificador", type: "select", options: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"], hint: "Clasifica el tipo de consulta. gpt-4o-mini recomendado (15x más barato)" },
      { key: "agent_model", label: "Agente principal", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Responde consultas generales y genera documentos" },
      { key: "crew_model", label: "CrewAI (análisis)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Agentes del análisis profundo. gpt-4o recomendado" },
      { key: "rag_model", label: "RAG (búsqueda)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Genera respuestas basadas en documentos encontrados" },
      { key: "producto_model", label: "Asistente ventas", type: "select", options: ["gpt-4o-mini", "gpt-4o"], hint: "Responde preguntas sobre LexIA como producto" },
      { key: "embedding_model", label: "Embeddings", type: "select", options: ["text-embedding-3-small", "text-embedding-3-large"], hint: "Modelo de vectores. Cambiar requiere reindexar" },
    ],
  },
  {
    key: "rag_config",
    label: "RAG / Búsqueda Legal",
    desc: "Parámetros del motor de búsqueda en Pinecone.",
    category: "IA",
    fields: [
      { key: "similarity_top_k", label: "Top K resultados", type: "number", hint: "Cantidad de fragmentos a recuperar por búsqueda" },
      { key: "cache_ttl", label: "Cache TTL (segundos)", type: "number", hint: "Tiempo de vida del cache. 3600 = 1 hora" },
      { key: "cache_max_entries", label: "Cache max entradas", type: "number", hint: "Máximo de consultas cacheadas" },
      { key: "history_limit", label: "Historial de mensajes", type: "number", hint: "Mensajes de contexto enviados al LLM (6 = 3 turnos)" },
      { key: "history_truncation_length", label: "Truncar respuestas (chars)", type: "number", hint: "Respuestas largas en historial se cortan a esta longitud" },
    ],
  },
  {
    key: "crew_config",
    label: "Agentes CrewAI",
    desc: "Iteraciones máximas por agente. Más iteraciones = mejor calidad pero más tokens.",
    category: "IA",
    fields: [
      { key: "investigador_max_iter", label: "Investigador", type: "number", hint: "Busca leyes y normas" },
      { key: "analista_max_iter", label: "Analista", type: "number", hint: "Busca jurisprudencia" },
      { key: "validador_max_iter", label: "Validador", type: "number", hint: "Verifica fuentes" },
      { key: "redactor_max_iter", label: "Redactor", type: "number", hint: "Genera el documento final" },
      { key: "max_validation_retries", label: "Reintentos de validación", type: "number", hint: "Veces que reintenta si la calidad es baja" },
    ],
  },
  {
    key: "rate_limits",
    label: "Rate Limiting",
    desc: "Límites de requests por usuario.",
    category: "Seguridad",
    nested: true,
    fields: [
      { key: "chat.max", label: "Chat: max requests", type: "number" },
      { key: "chat.window", label: "Chat: ventana (seg)", type: "number" },
      { key: "pdf.max", label: "PDF: max requests", type: "number" },
      { key: "pdf.window", label: "PDF: ventana (seg)", type: "number" },
      { key: "documents.max", label: "Documentos: max", type: "number" },
      { key: "documents.window", label: "Documentos: ventana", type: "number" },
    ],
  },
  {
    key: "input_limits",
    label: "Límites de Input",
    desc: "Longitud máxima permitida por campo.",
    category: "Seguridad",
    fields: [
      { key: "max_message_length", label: "Mensaje de chat", type: "number", hint: "Caracteres" },
      { key: "max_document_content_length", label: "Contenido documento", type: "number", hint: "Caracteres" },
      { key: "max_title_length", label: "Título documento", type: "number", hint: "Caracteres" },
    ],
  },
  {
    key: "alert_thresholds",
    label: "Umbrales de Alerta",
    desc: "Alertas automáticas cuando un usuario supera estos valores.",
    category: "Seguridad",
    fields: [
      { key: "daily_queries_warning", label: "Consultas/día (warning)", type: "number", hint: "Genera notificación" },
      { key: "daily_queries_critical", label: "Consultas/día (crítico)", type: "number", hint: "Alerta urgente + email" },
      { key: "daily_cost_warning", label: "Costo/día USD (warning)", type: "number", hint: "Ej: 0.50" },
      { key: "daily_cost_critical", label: "Costo/día USD (crítico)", type: "number", hint: "Ej: 2.00" },
      { key: "total_cost_warning", label: "Costo total USD", type: "number", hint: "Acumulado por usuario" },
    ],
  },
  {
    key: "plan_config",
    label: "Planes y Precios",
    desc: "Configuración de cada plan de suscripción.",
    category: "Negocio",
    nested: true,
    fields: [
      { key: "basico.limit", label: "Básico: consultas/mes", type: "number" },
      { key: "basico.price", label: "Básico: precio S/", type: "number" },
      { key: "profesional.limit", label: "Profesional: consultas/mes", type: "number" },
      { key: "profesional.price", label: "Profesional: precio S/", type: "number" },
      { key: "estudio.limit", label: "Estudio: consultas/mes (-1=ilimitado)", type: "number" },
      { key: "estudio.price", label: "Estudio: precio S/", type: "number" },
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
              return (
                <div key={field.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      value={val || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                    >
                      {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type === "number" ? "number" : "text"}
                      value={val ?? ""}
                      onChange={(e) => handleChange(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                      className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                    />
                  )}
                  {field.hint && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{field.hint}</p>}
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
