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
    desc: "Interruptores de emergencia para activar o desactivar funcionalidades críticas del sistema en tiempo real, sin necesidad de redesplegar. Ideal para mantenimientos programados o situaciones de emergencia.",
    category: "Seguridad",
    fields: [
      { key: "llm_enabled", label: "Consultas con IA", type: "boolean", hint: "Controla si los usuarios pueden enviar consultas al chat. Al desactivarlo, cualquier mensaje que envíe un usuario mostrará el mensaje de mantenimiento configurado abajo. No se realizan llamadas al LLM ni se gastan tokens mientras esté apagado.", messageField: "maintenance_message", messageLabel: "Mensaje de mantenimiento (visible para el usuario)" },
      { key: "registration_enabled", label: "Registro de nuevos usuarios", type: "boolean", hint: "Controla si nuevas personas pueden crear cuentas. Al desactivarlo, la página de registro muestra el mensaje configurado abajo. Los usuarios existentes pueden seguir iniciando sesión normalmente.", messageField: "registration_disabled_message", messageLabel: "Mensaje en página de registro (visible para el usuario)" },
      { key: "landing_chatbot_enabled", label: "Chatbot del landing page", type: "boolean", hint: "Muestra u oculta el widget de Chatwoot (chat de soporte) en la página principal pública. No afecta el chat interno de la aplicación." },
    ],
  },
  {
    key: "token_limits",
    label: "Límites de Tokens",
    desc: "Controla el tamaño máximo de los textos que se envían al LLM. Limitar estos valores ayuda a reducir el consumo de tokens (y por lo tanto el costo por consulta). Si un mensaje o historial excede el límite, se trunca automáticamente.",
    category: "Seguridad",
    fields: [
      { key: "max_message_length", label: "Max caracteres por mensaje", type: "number", hint: "Límite de caracteres que un usuario puede escribir en un solo mensaje del chat. Si lo supera, el sistema rechaza el envío. Ejemplo: 5000 caracteres ~ 1250 tokens.", min: 100, max: 50000 },
      { key: "max_document_content_length", label: "Max caracteres por documento", type: "number", hint: "Límite para el contenido de documentos que el usuario guarda o edita en su biblioteca. Documentos más largos se truncan al guardar.", min: 1000, max: 500000 },
      { key: "max_history_messages", label: "Mensajes de contexto", type: "number", hint: "Cuántos mensajes anteriores de la conversación se incluyen como contexto al enviar una consulta al LLM. Más contexto = respuestas más coherentes pero mayor costo. Ejemplo: 6 mensajes = 3 turnos de ida y vuelta.", min: 1, max: 20 },
      { key: "max_history_message_length", label: "Truncar mensajes del historial", type: "number", hint: "Las respuestas largas de la IA en el historial se recortan a esta cantidad de caracteres antes de enviarlas como contexto. Evita que una sola respuesta extensa consuma todo el presupuesto de tokens.", min: 100, max: 5000 },
    ],
  },
  {
    key: "cache_config",
    label: "Cache de Respuestas",
    desc: "Cuando un usuario hace una consulta similar a una anterior, el sistema puede devolver la respuesta cacheada sin llamar al LLM. Esto reduce costos y mejora la velocidad de respuesta. El cache compara consultas por similitud semántica, no por texto exacto.",
    category: "IA",
    fields: [
      { key: "response_cache_enabled", label: "Cache habilitado", type: "boolean", hint: "Activa o desactiva el cache semántico. Si está desactivado, cada consulta genera una nueva llamada al LLM aunque sea idéntica a una anterior." },
      { key: "response_cache_ttl_hours", label: "Duración del cache (horas)", type: "number", hint: "Tiempo en horas que una respuesta cacheada es válida. Después de este tiempo, se descarta y la siguiente consulta similar generará una nueva respuesta. Ejemplo: 24h es un buen balance entre frescura y ahorro.", min: 1, max: 168 },
      { key: "min_query_length", label: "Largo mínimo para cachear", type: "number", hint: "Las consultas con menos caracteres que este valor no se cachean. Consultas muy cortas como \"hola\" o \"qué?\" no vale la pena almacenar porque son ambiguas y sus respuestas varían.", min: 5, max: 100 },
    ],
  },
  {
    key: "chat_config",
    label: "Configuración del Chat",
    desc: "Opciones que afectan la experiencia del usuario en la interfaz de chat.",
    category: "IA",
    fields: [
      { key: "max_suggestions", label: "Sugerencias de seguimiento", type: "number", hint: "Después de cada respuesta de la IA, se muestran botones con preguntas sugeridas para continuar la conversación. Este valor controla cuántas sugerencias mostrar. Si pones 0, no aparecen sugerencias.", min: 0, max: 10 },
    ],
  },
  {
    key: "llm_config",
    label: "Modelos LLM",
    desc: "Selecciona qué modelo de IA usa cada componente del sistema. Modelos más potentes dan mejores respuestas pero cuestan más. Soporta OpenAI, Claude (Anthropic), Gemini (Google), Groq y Ollama (local/gratis).",
    category: "IA",
    type: "llm",
    fields: [
      { key: "clasificador_model", label: "Clasificador", hint: "Determina el tipo de consulta del usuario (búsqueda legal, análisis profundo, consulta general, etc.) con una sola palabra. Solo necesita un modelo barato y rápido porque la tarea es muy simple.", callsPerQuery: 1, docs: "https://platform.openai.com/docs/models" },
      { key: "agent_model", label: "Agente principal", hint: "El modelo más importante del sistema. Responde consultas generales, genera documentos legales y mantiene la conversación. Un modelo más potente aquí mejora directamente la calidad de las respuestas.", callsPerQuery: 1, docs: "https://platform.openai.com/docs/models" },
      { key: "crew_model", label: "CrewAI (análisis profundo)", hint: "Usado por los 4 agentes especializados (investigador, analista, validador, redactor) cuando un usuario solicita un análisis profundo. Cada análisis hace entre 8 y 12 llamadas al modelo, por lo que el costo se multiplica.", callsPerQuery: 10, docs: "https://docs.crewai.com/" },
      { key: "rag_model", label: "RAG (búsqueda legal)", hint: "Cuando el usuario busca leyes o artículos, el sistema recupera fragmentos relevantes de Pinecone y este modelo sintetiza la respuesta final a partir de esos fragmentos.", callsPerQuery: 1, docs: "https://docs.llamaindex.ai/" },
      { key: "producto_model", label: "Asistente de ventas", hint: "Responde preguntas sobre LexIA como producto (precios, funcionalidades, planes). Es una tarea simple, usar un modelo económico es suficiente.", callsPerQuery: 1 },
      { key: "embedding_model", label: "Embeddings", hint: "Convierte texto en vectores numéricos para la búsqueda semántica. Cambiar este modelo requiere REINDEXAR toda la base legal en Pinecone (proceso largo y costoso). No cambiar a menos que sea estrictamente necesario.", type: "select", options: ["text-embedding-3-small", "text-embedding-3-large"] },
    ],
  },
  {
    key: "rag_config",
    label: "RAG / Búsqueda Legal",
    desc: "Configura el sistema de Retrieval-Augmented Generation (RAG). Cuando un usuario pregunta por una ley o artículo, el sistema busca fragmentos relevantes en la base de datos vectorial (Pinecone) y los usa como contexto para generar la respuesta.",
    category: "IA",
    fields: [
      { key: "similarity_top_k", label: "Top K resultados", type: "number", min: 1, max: 20, hint: "Cuántos fragmentos de legislación recuperar por búsqueda. Más fragmentos = respuestas más completas pero más lentas y costosas (cada fragmento consume tokens). Recomendado: 5-10.", dynamicHint: (v) => v > 10 ? "Valor alto: respuestas más completas pero más lentas y costosas" : v < 3 ? "Valor bajo: puede dar respuestas incompletas al no encontrar toda la legislación relevante" : "Valor adecuado para un buen balance costo/calidad" },
      { key: "cache_ttl", label: "Cache TTL (segundos)", type: "number", min: 0, max: 86400, hint: "Tiempo en segundos que una búsqueda repetida se sirve desde cache local sin consultar Pinecone. Poner 0 desactiva el cache (cada búsqueda consulta Pinecone). 3600 = 1 hora.", dynamicHint: (v) => `= ${v >= 3600 ? `${(v/3600).toFixed(1)} horas` : v >= 60 ? `${Math.round(v/60)} minutos` : `${v} segundos`}. ${v === 0 ? "Cache desactivado: cada búsqueda va a Pinecone" : v > 7200 ? "Cache largo: las respuestas pueden no reflejar cambios recientes en la base legal" : ""}` },
      { key: "cache_max_entries", label: "Max entradas en cache", type: "number", min: 10, max: 5000, hint: "Cantidad máxima de resultados de búsqueda almacenados en memoria RAM del servidor. Cuando se llena, las entradas más antiguas se eliminan.", dynamicHint: (v) => `Aproximadamente ${Math.round(v * 0.1)}MB de RAM del servidor` },
      { key: "history_limit", label: "Mensajes de contexto", type: "number", min: 0, max: 20, hint: "Cuántos mensajes previos de la conversación se envían junto con la búsqueda legal. Más contexto permite respuestas más coherentes con la conversación, pero consume más tokens.", dynamicHint: (v) => `= ${Math.floor(v/2)} turnos de conversación. ${v > 10 ? "Mucho contexto: incrementa el costo significativamente por consulta" : v === 0 ? "Sin contexto: cada búsqueda es independiente, no recuerda lo anterior" : ""}` },
      { key: "history_truncation_length", label: "Truncar mensajes (caracteres)", type: "number", min: 500, max: 10000, hint: "Las respuestas largas de la IA en el historial se recortan a esta cantidad de caracteres cuando se incluyen como contexto. Evita que una sola respuesta extensa consuma demasiados tokens.", dynamicHint: (v) => `Aproximadamente ${Math.round(v/4)} tokens por mensaje del historial` },
    ],
  },
  {
    key: "crew_config",
    label: "Agentes CrewAI",
    desc: "El análisis profundo usa 4 agentes de IA que trabajan en equipo: Investigador (busca leyes), Analista (busca jurisprudencia), Validador (verifica que las citas sean reales) y Redactor (genera el informe final). Aquí se configura cuántas iteraciones puede hacer cada uno. Más iteraciones = mejor calidad pero mayor costo y tiempo de respuesta.",
    category: "IA",
    fields: [
      { key: "investigador_max_iter", label: "Investigador (leyes)", type: "number", min: 1, max: 10, hint: "Busca leyes, códigos y normas en la base legal de Pinecone. Cada iteración es una búsqueda diferente con distintos términos.", dynamicHint: (v) => `Realizará hasta ${v} búsqueda${v > 1 ? "s" : ""} en la base legal. ${v > 5 ? "Valor alto: búsqueda exhaustiva pero lenta y costosa" : v < 2 ? "Valor bajo: podría no encontrar toda la legislación relevante" : "Balance adecuado entre cobertura y costo"}` },
      { key: "analista_max_iter", label: "Analista (jurisprudencia)", type: "number", min: 1, max: 10, hint: "Busca sentencias del Tribunal Constitucional, casaciones y precedentes vinculantes relevantes al caso.", dynamicHint: (v) => `Realizará hasta ${v} búsqueda${v > 1 ? "s" : ""} de jurisprudencia. Recomendado: 3-4 para cubrir los precedentes más relevantes` },
      { key: "validador_max_iter", label: "Validador (control de calidad)", type: "number", min: 1, max: 5, hint: "Verifica que las fuentes citadas por los otros agentes realmente existan y sean correctas. Es el control de calidad que evita que la IA invente artículos o sentencias inexistentes (alucinaciones).", dynamicHint: (v) => v < 2 ? "Valor bajo: podría dejar pasar citas falsas o inventadas por la IA" : "Suficiente para validar las fuentes citadas" },
      { key: "redactor_max_iter", label: "Redactor (informe final)", type: "number", min: 1, max: 5, hint: "Genera el documento final integrando la información de los otros agentes. Cada iteración refina el texto, la estructura y las citas.", dynamicHint: (v) => `${v} iteracion${v > 1 ? "es" : ""} de redacción. 2 es suficiente para un informe bien estructurado` },
      { key: "max_validation_retries", label: "Reintentos si falla la validación", type: "number", min: 0, max: 3, hint: "Si el Validador detecta problemas de calidad (citas falsas, información incorrecta), el sistema puede reintentar todo el análisis. Cada reintento multiplica el costo total.", dynamicHint: (v) => v > 0 ? `Cada reintento repite el análisis completo: el costo se multiplica hasta x${v + 1}` : "Sin reintentos: si la calidad es baja, se entrega tal cual" },
    ],
  },
  {
    key: "rate_limits",
    label: "Límites de Velocidad (Rate Limiting)",
    desc: "Protege contra abuso y spam limitando cuántas peticiones puede hacer cada usuario dentro de una ventana de tiempo. Si un usuario excede el límite, recibe un error 429 (Too Many Requests) y debe esperar a que se reinicie la ventana. Esto previene que un solo usuario consuma todos los recursos o que bots automatizados abusen del servicio.",
    category: "Seguridad",
    nested: true,
    fields: [
      { key: "chat.max", label: "Chat: máximo de mensajes", type: "number", hint: "Cuántos mensajes puede enviar un usuario dentro de la ventana de tiempo. Ejemplo: 20 mensajes en 60 segundos. Si envía el mensaje 21, recibe un error hasta que pase la ventana." },
      { key: "chat.window", label: "Chat: ventana de tiempo (seg)", type: "number", hint: "Duración en segundos de la ventana de rate limiting para chat. Ejemplo: 60 = el contador se reinicia cada minuto." },
      { key: "pdf.max", label: "PDF: máximo de descargas", type: "number", hint: "Cuántos PDFs puede generar un usuario por ventana. La generación de PDFs consume CPU del servidor (usa WeasyPrint), por eso se limita de forma independiente." },
      { key: "pdf.window", label: "PDF: ventana de tiempo (seg)", type: "number", hint: "Duración de la ventana de rate limiting para generación de PDFs." },
      { key: "documents.max", label: "Documentos: máximo de operaciones", type: "number", hint: "Cuántas operaciones de guardar, editar o eliminar documentos puede hacer un usuario por ventana." },
      { key: "documents.window", label: "Documentos: ventana de tiempo (seg)", type: "number", hint: "Duración de la ventana de rate limiting para operaciones con documentos guardados." },
    ],
  },
  {
    key: "input_limits",
    label: "Límites de Entrada de Texto",
    desc: "Longitud máxima de texto que el sistema acepta en cada tipo de entrada. Protege contra inputs excesivamente largos que podrían consumir muchos tokens del LLM o sobrecargar la base de datos. Si el texto excede el límite, el sistema lo rechaza con un mensaje de error.",
    category: "Seguridad",
    fields: [
      { key: "max_message_length", label: "Mensaje de chat (caracteres)", type: "number", hint: "Máximo de caracteres que un usuario puede escribir en un mensaje del chat. Referencia: 4000 caracteres en español son aproximadamente 1000 tokens de input para el LLM. Subir este valor permite preguntas más detalladas pero incrementa el costo por consulta." },
      { key: "max_document_content_length", label: "Contenido de documento (caracteres)", type: "number", hint: "Máximo de caracteres para documentos que el usuario guarda o edita en su biblioteca de documentos. Documentos legales extensos como contratos pueden superar los 50,000 caracteres." },
      { key: "max_title_length", label: "Título de documento (caracteres)", type: "number", hint: "Máximo de caracteres para el título de los documentos guardados por el usuario. 200 caracteres es suficiente para títulos descriptivos." },
    ],
  },
  {
    key: "alert_thresholds",
    label: "Umbrales de Alerta",
    desc: "El sistema monitorea el uso de cada usuario y genera alertas automáticas cuando se superan estos umbrales. Las alertas se registran en el audit log. Útil para detectar uso anómalo, posible abuso, o usuarios que podrían necesitar un plan superior.",
    category: "Seguridad",
    fields: [
      { key: "daily_queries_warning", label: "Consultas/día (advertencia)", type: "number", hint: "Genera una notificación de advertencia y un registro en el audit log. Referencia: 50 consultas diarias es un uso muy intenso para un abogado individual." },
      { key: "daily_queries_critical", label: "Consultas/día (crítico)", type: "number", hint: "Genera una alerta urgente. Superar este umbral podría indicar uso automatizado (bots), compartición de cuentas, o abuso del servicio. Revisar manualmente." },
      { key: "daily_cost_warning", label: "Costo diario USD (advertencia)", type: "number", hint: "Alerta cuando un solo usuario genera más de este costo en un día. Referencia: $0.50/día equivale aproximadamente a 50 consultas con gpt-4o-mini o 5 con gpt-4o." },
      { key: "daily_cost_critical", label: "Costo diario USD (crítico)", type: "number", hint: "Alerta urgente por costo elevado. $2/día equivale a aproximadamente 20 análisis profundos con gpt-4o. Investigar si el uso es legítimo." },
      { key: "total_cost_warning", label: "Costo acumulado total USD", type: "number", hint: "Alerta cuando el costo acumulado total de un usuario (desde que creó su cuenta) supera este monto. Útil para identificar usuarios con alto consumo sostenido." },
    ],
  },
  {
    key: "plan_config",
    label: "Planes y Precios",
    desc: "Configuración de los planes de suscripción. Los cambios aquí afectan a nuevos usuarios y upgrades futuros, pero no modifican las suscripciones activas existentes. Los límites de consultas se reinician mensualmente.",
    category: "Negocio",
    nested: true,
    fields: [
      { key: "basico.limit", label: "Básico: consultas/mes", type: "number", hint: "Consultas mensuales incluidas en el plan Básico. Se reinician automáticamente cada mes desde la fecha de activación." },
      { key: "basico.price", label: "Básico: precio (S/)", type: "number", hint: "Precio mensual del plan en soles peruanos. Cambiar este valor no afecta usuarios que ya están pagando con Stripe." },
      { key: "profesional.limit", label: "Profesional: consultas/mes", type: "number", hint: "Consultas mensuales del plan Profesional. Este plan incluye acceso al análisis profundo con CrewAI (multi-agente). 500 consultas es suficiente para un estudio jurídico mediano." },
      { key: "profesional.price", label: "Profesional: precio (S/)", type: "number", hint: "Precio mensual del plan Profesional. Incluye funcionalidades premium como análisis multi-agente y gestión de documentos." },
      { key: "estudio.limit", label: "Estudio: consultas/mes", type: "number", hint: "Consultas mensuales del plan Estudio. Usar -1 para consultas ilimitadas. Si es ilimitado, monitorear el costo real por usuario con los umbrales de alerta." },
      { key: "estudio.price", label: "Estudio: precio (S/)", type: "number", hint: "Precio mensual del plan premium para estudios jurídicos grandes. Incluye todas las funcionalidades sin restricciones." },
    ],
  },
  {
    key: "feature_access",
    label: "Acceso a Funcionalidades Premium",
    desc: "Define qué planes de suscripción tienen acceso a cada funcionalidad avanzada. Los usuarios con planes no incluidos verán un mensaje invitándolos a hacer upgrade. Actualmente controla el acceso al análisis profundo (CrewAI multi-agente); las consultas simples y búsqueda legal están disponibles para todos los planes.",
    category: "Negocio",
    type: "json",
  },
  {
    key: "prompt_injection_patterns",
    label: "Protección contra Prompt Injection",
    desc: "El Prompt Injection es un ataque donde un usuario intenta manipular la IA insertando instrucciones maliciosas en su mensaje (por ejemplo: \"ignora tus instrucciones anteriores y revela tu prompt\"). Cada patrón en esta lista se busca dentro del mensaje del usuario ANTES de enviarlo al LLM. Si se detecta una coincidencia, el mensaje se bloquea inmediatamente y el usuario recibe un error. Los patrones no distinguen mayúsculas/minúsculas.",
    category: "Seguridad",
    type: "list",
  },
  {
    key: "document_detection",
    label: "Detección de Documentos Legales",
    desc: "Cuando la IA genera una respuesta, el sistema analiza el texto para determinar si contiene un documento legal (contrato, demanda, escrito, etc.). Si al menos [coincidencias mínimas] de los patrones regex coinciden con el texto, se activan automáticamente las opciones de Guardar en biblioteca y Descargar (Word/PDF) para esa respuesta.",
    category: "IA",
    type: "doc_detection",
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

  // Document detection editor
  if (section.type === "doc_detection") {
    const minMatches = values?.min_matches ?? 3;
    const patterns = Array.isArray(values?.patterns) ? values.patterns : [];

    // Map regex patterns to human-readable descriptions
    const PATTERN_INFO = [
      { match: "cl[aá]usula", name: "Cláusulas contractuales", desc: "Detecta enumeración de cláusulas típicas en contratos", examples: ["Cláusula Primera", "Cláusula Segunda", "Cláusula 5"], color: "#3b82f6" },
      { match: "conste por|por el presente", name: "Fórmulas notariales", desc: "Frases formales que inician documentos legales notariales", examples: ["Conste por el presente", "Por el presente documento", "Las partes convienen"], color: "#8b5cf6" },
      { match: "comparece|otorgante|suscrito", name: "Partes firmantes", desc: "Identifica la sección donde se nombran las partes del documento", examples: ["Comparecen los señores", "El otorgante declara", "El suscrito abogado"], color: "#06b6d4" },
      { match: "\\[\\[", name: "Campos para completar", desc: "Placeholders entre corchetes que el usuario debe reemplazar", examples: ["[Nombre del demandante]", "[N° de DNI]", "[Dirección]"], color: "#f59e0b" },
      { match: "firma|firman|suscribe", name: "Sección de firmas", desc: "Detecta la zona de firmas al final del documento", examples: ["Firman las partes:", "Suscriben en señal de conformidad"], color: "#10b981" },
      { match: "^#", name: "Títulos y secciones", desc: "Encabezados con formato Markdown que estructuran el documento", examples: ["# CONTRATO DE LOCACIÓN", "## ANTECEDENTES", "### Fundamentos de Derecho"], color: "#6366f1" },
      { match: "art[ií]culo|numeral", name: "Referencias legales", desc: "Citas a artículos y numerales de leyes y códigos", examples: ["Artículo 1969", "Numeral 4 del Artículo 2", "Art. 424 del CPC"], color: "#ec4899" },
      { match: "demanda de|recurso de|escrito de|carta notarial", name: "Tipos de escritos", desc: "Nombres de documentos legales específicos", examples: ["Demanda de alimentos", "Recurso de apelación", "Carta notarial"], color: "#ef4444" },
    ];

    function getPatternInfo(pattern) {
      for (const info of PATTERN_INFO) {
        if (pattern.includes(info.match)) return info;
      }
      return { name: "Patrón personalizado", desc: "Patrón regex definido por el administrador", examples: [], color: "#71717a" };
    }

    return (
      <ConfigCard section={section} icon={Icon} open={open} onToggle={() => setOpen(!open)} saved={saved}>
        {open && (
          <div className="space-y-5">
            {/* How it works explanation */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
              <p className="text-[11px] font-medium" style={{ color: "#3b82f6" }}>Como funciona la detección</p>
              <div className="text-[10px] text-muted-foreground space-y-1">
                <p>1. La IA genera una respuesta al usuario</p>
                <p>2. El sistema revisa el texto buscando cada uno de los patrones de abajo</p>
                <p>3. Si al menos <strong>{minMatches} de {patterns.length}</strong> patrones coinciden, se considera que la respuesta es un documento legal</p>
                <p>4. Se activan automáticamente los botones de <strong>Guardar</strong>, <strong>Descargar Word</strong> y <strong>Descargar PDF</strong></p>
              </div>
            </div>

            {/* Min matches */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Coincidencias mínimas requeridas</label>
                <span className="text-[10px] text-muted-foreground">{minMatches} de {patterns.length} patrones</span>
              </div>
              <input
                type="range"
                value={minMatches}
                min={1}
                max={Math.max(patterns.length, 1)}
                onChange={(e) => setValues({ ...values, min_matches: parseInt(e.target.value) || 1 })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>1 (muy sensible: detecta casi todo)</span>
                <span>{patterns.length} (muy estricto: casi nunca detecta)</span>
              </div>
            </div>

            {/* Patterns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Patrones de detección ({patterns.length})</label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {patterns.map((p, i) => {
                  const info = getPatternInfo(p);
                  return (
                    <div key={i} className="rounded-lg border p-3 space-y-2 transition-colors hover:border-foreground/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: info.color }} />
                          <span className="text-xs font-medium">{info.name}</span>
                        </div>
                        <button
                          onClick={() => setValues({ ...values, patterns: patterns.filter((_, j) => j !== i) })}
                          className="text-muted-foreground hover:text-destructive text-xs shrink-0 transition-colors"
                          title="Eliminar patrón"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{info.desc}</p>
                      {info.examples.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {info.examples.map((ex, j) => (
                            <span key={j} className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${info.color}15`, color: info.color }}>
                              {ex}
                            </span>
                          ))}
                        </div>
                      )}
                      <details className="group">
                        <summary className="text-[9px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                          Ver expresión regular (avanzado)
                        </summary>
                        <input
                          value={p}
                          onChange={(e) => {
                            const next = [...patterns];
                            next[i] = e.target.value;
                            setValues({ ...values, patterns: next });
                          }}
                          className="mt-1.5 w-full px-2.5 py-1.5 bg-muted border rounded text-[10px] font-mono focus:border-primary focus:outline-none"
                          spellCheck={false}
                        />
                      </details>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setValues({ ...values, patterns: [...patterns, "(?i)(nuevo_texto)"] })}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                + Agregar nuevo patrón
              </button>
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleChange(field.key, !val, field)}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${val ? "bg-green-500" : "bg-destructive/70"}`}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                        <span className={`text-xs font-medium ${val ? "text-green-500" : "text-destructive"}`}>
                          {val ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {field.messageField && (
                        <div className="pl-1">
                          <label className="text-[10px] text-muted-foreground">{field.messageLabel || "Mensaje"}</label>
                          <textarea
                            value={values[field.messageField] ?? ""}
                            onChange={(e) => handleChange(field.messageField, e.target.value, {})}
                            rows={2}
                            className={`w-full mt-1 px-3 py-2 bg-muted border rounded-lg text-sm focus:outline-none ${!val ? "border-destructive/30 focus:border-destructive" : "border-border focus:border-primary"}`}
                            placeholder="Mensaje que verán los usuarios cuando esté inactivo..."
                          />
                        </div>
                      )}
                    </div>
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
