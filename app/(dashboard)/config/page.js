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
    desc: "Modelos de OpenAI usados por cada componente. Cambiar el modelo afecta calidad y costo de las respuestas.",
    category: "IA",
    fields: [
      { key: "clasificador_model", label: "Clasificador", type: "select", options: ["gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"], hint: "Decide si la consulta es búsqueda legal, análisis profundo, etc. ⚡ gpt-4o-mini es 15x más barato y suficiente para clasificar." },
      { key: "agent_model", label: "Agente principal", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Genera respuestas a consultas generales y documentos legales. 💡 gpt-4o da mejor calidad pero cuesta ~$0.01/consulta vs $0.0005 con mini." },
      { key: "crew_model", label: "CrewAI (análisis profundo)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Usado por los 4 agentes del análisis profundo (investigador, analista, validador, redactor). ⚠️ Cada análisis hace ~8-12 llamadas al LLM. Usar mini reduce costo 10x pero baja calidad." },
      { key: "rag_model", label: "RAG (búsqueda legal)", type: "select", options: ["gpt-4o", "gpt-4o-mini"], hint: "Sintetiza la respuesta final a partir de los artículos encontrados en Pinecone. 💡 mini es suficiente para la mayoría de búsquedas." },
      { key: "producto_model", label: "Asistente de ventas", type: "select", options: ["gpt-4o-mini", "gpt-4o"], hint: "Responde preguntas sobre planes, precios y funcionalidades de LexIA. ⚡ mini recomendado (consultas simples)." },
      { key: "embedding_model", label: "Embeddings", type: "select", options: ["text-embedding-3-small", "text-embedding-3-large"], hint: "Convierte texto en vectores para búsqueda. ⚠️ Cambiar este modelo requiere REINDEXAR toda la base legal (puede tomar horas)." },
    ],
  },
  {
    key: "rag_config",
    label: "RAG / Búsqueda Legal",
    desc: "Controla cómo busca y recupera artículos de la legislación peruana en Pinecone.",
    category: "IA",
    fields: [
      { key: "similarity_top_k", label: "Top K resultados", type: "number", hint: "Cuántos fragmentos de legislación recuperar por búsqueda. 📊 Más = respuestas más completas pero más lentas y costosas. Recomendado: 5-10." },
      { key: "cache_ttl", label: "Cache TTL (segundos)", type: "number", hint: "Tiempo que una consulta repetida se sirve desde cache sin llamar a Pinecone/OpenAI. 💡 3600 = 1 hora. Subir ahorra costos, bajar da datos más frescos." },
      { key: "cache_max_entries", label: "Cache max entradas", type: "number", hint: "Máximo de consultas cacheadas en memoria. 📊 500 entradas ≈ 50MB RAM. Si el servidor tiene poca memoria, reducir." },
      { key: "history_limit", label: "Historial de mensajes", type: "number", hint: "Mensajes anteriores enviados como contexto al LLM. 💡 6 = últimos 3 turnos de conversación. Más contexto = respuestas más coherentes pero más tokens (más costo)." },
      { key: "history_truncation_length", label: "Truncar respuestas (chars)", type: "number", hint: "Las respuestas largas del historial se cortan a esta longitud para ahorrar tokens. 📊 2000 chars ≈ 500 tokens." },
    ],
  },
  {
    key: "crew_config",
    label: "Agentes CrewAI",
    desc: "Controla cuántas veces cada agente puede iterar en el análisis profundo. Más iteraciones = mejor calidad pero más costo.",
    category: "IA",
    fields: [
      { key: "investigador_max_iter", label: "Investigador", type: "number", hint: "Busca leyes y normas en Pinecone. 📊 Con 4 iteraciones hace ~3-4 búsquedas diferentes. Reducir a 2 si quieres análisis más rápidos/baratos." },
      { key: "analista_max_iter", label: "Analista", type: "number", hint: "Busca jurisprudencia y precedentes del TC. 📊 Similar al investigador. 3-4 iteraciones es el balance ideal." },
      { key: "validador_max_iter", label: "Validador", type: "number", hint: "Verifica que los artículos y sentencias citados sean reales. ⚠️ Es el control de calidad. No reducir por debajo de 2." },
      { key: "redactor_max_iter", label: "Redactor", type: "number", hint: "Genera el documento final con toda la información validada. 💡 2 iteraciones es suficiente (solo redacta, no busca)." },
      { key: "max_validation_retries", label: "Reintentos de validación", type: "number", hint: "Si el validador detecta información sin fuente, reintenta el análisis completo. ⚠️ Cada reintento duplica el costo. Recomendado: 1." },
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
