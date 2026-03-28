"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, User, Mail, CreditCard, Calendar, MessageSquare,
  FileText, TrendingUp, Shield, Clock, Zap, BarChart3, ScrollText,
  ChevronDown, Bot, DollarSign, Scale, Search, Sparkles, HelpCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const PLAN_BADGES = {
  trial: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  basico: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  profesional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  estudio: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const QUERY_LABELS = {
  BUSQUEDA_LEGAL: "Búsqueda legal",
  CONSULTA_GENERAL: "General",
  ANALISIS_PROFUNDO: "Análisis profundo",
  CASO_NUEVO: "Caso nuevo",
  CONSULTA_PRODUCTO: "Producto",
};

const DOC_TYPE_COLORS = {
  borrador: "bg-blue-500/10 text-blue-400",
  demanda: "bg-red-500/10 text-red-400",
  contrato: "bg-green-500/10 text-green-400",
  carta: "bg-purple-500/10 text-purple-400",
  escrito: "bg-orange-500/10 text-orange-400",
};

const CHANNEL_LABELS = { web: "Web", whatsapp: "WhatsApp", telegram: "Telegram", website: "Web" };

const ACTION_LABELS = {
  "user.plan.upgrade": "Plan mejorado",
  "user.plan.downgrade": "Plan rebajado",
  "admin.user.ban": "Suspendido",
  "admin.user.unban": "Activado",
  "admin.user.update": "Actualizado",
  "system.alert.critical": "Alerta crítica",
};

function SubscriptionTab({ user, userId, onRefresh }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);
  const [form, setForm] = useState({ plan: "basico", duration_days: 30, days: 30, coupon_code: "", reason: "" });

  useEffect(() => {
    apiFetch(`/api/admin/users/${userId}/subscription-history`).then(setHistory).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  async function handleAction(action, body = {}) {
    setActionLoading(true);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/subscription`, { method: "POST", body: JSON.stringify({ action, ...body }) });
      if (res?.error) { alert(res.error); return; }
      onRefresh();
      setShowActivate(false); setShowExtend(false); setShowCoupon(false);
      const h = await apiFetch(`/api/admin/users/${userId}/subscription-history`);
      setHistory(h);
    } catch (e) { alert("Error"); }
    finally { setActionLoading(false); }
  }

  const isActive = user.plan && user.plan !== "trial" && user.plan !== "inactive";
  const expiresAt = user.plan_expires_at ? new Date(user.plan_expires_at) : null;
  const startedAt = user.plan_started_at ? new Date(user.plan_started_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - new Date()) / 86400000)) : null;

  return (
    <div className="space-y-6">
      {/* Current subscription */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Suscripción actual</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Plan</p>
              <Badge variant="outline" className={`text-sm ${PLAN_BADGES[user.plan] || ""}`}>{user.plan || "trial"}</Badge>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Inicio</p>
              <p className="text-sm font-medium">{startedAt ? startedAt.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Vencimiento</p>
              <p className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
                {expiresAt ? expiresAt.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "Sin vencimiento"}
                {daysLeft != null && !isExpired && <span className="text-[10px] text-muted-foreground ml-1">({daysLeft} días)</span>}
                {isExpired && <span className="text-[10px] text-destructive ml-1">(Expirado)</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Renovación auto</p>
              <p className="text-sm font-medium">{user.plan_auto_renew ? "Sí" : "No"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => setShowActivate(!showActivate)} variant={showActivate ? "default" : "outline"}>
          <CreditCard className="h-3.5 w-3.5 mr-1" /> Activar plan
        </Button>
        {isActive && (
          <>
            <Button size="sm" variant="outline" onClick={() => setShowExtend(!showExtend)}>
              <Clock className="h-3.5 w-3.5 mr-1" /> Extender
            </Button>
            <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (confirm("¿Cancelar suscripción?")) handleAction("cancel", { reason: "Cancelación manual" }); }}>
              Cancelar suscripción
            </Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={() => setShowCoupon(!showCoupon)}>
          <Zap className="h-3.5 w-3.5 mr-1" /> Aplicar cupón
        </Button>
      </div>

      {/* Activate form */}
      {showActivate && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-xs font-medium">Activar plan manualmente</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Plan</label>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="w-full px-3 py-2 bg-muted border rounded-lg text-sm">
                  <option value="basico">Básico</option>
                  <option value="profesional">Profesional</option>
                  <option value="estudio">Estudio</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Duración (días)</label>
                <input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} min={1} max={365} className="w-full px-3 py-2 bg-muted border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Motivo</label>
                <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Opcional" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm" />
              </div>
            </div>
            <Button size="sm" onClick={() => handleAction("activate", { plan: form.plan, duration_days: form.duration_days, reason: form.reason })} disabled={actionLoading}>
              {actionLoading ? "Procesando..." : "Activar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Extend form */}
      {showExtend && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-xs font-medium">Extender suscripción</p>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Días adicionales</label>
                <input type="number" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} min={1} max={365} className="w-32 px-3 py-2 bg-muted border rounded-lg text-sm" />
              </div>
              <Button size="sm" onClick={() => handleAction("extend", { days: form.days, reason: "Extensión admin" })} disabled={actionLoading}>
                {actionLoading ? "Procesando..." : "Extender"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Coupon form */}
      {showCoupon && (
        <Card>
          <CardContent className="pt-5 space-y-3">
            <p className="text-xs font-medium">Aplicar cupón promocional</p>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Código del cupón</label>
                <input value={form.coupon_code} onChange={(e) => setForm({ ...form, coupon_code: e.target.value.toUpperCase() })} placeholder="PROMO-2026" className="w-48 px-3 py-2 bg-muted border rounded-lg text-sm font-mono" />
              </div>
              <Button size="sm" onClick={() => handleAction("apply_coupon", { coupon_code: form.coupon_code })} disabled={actionLoading || !form.coupon_code}>
                {actionLoading ? "Aplicando..." : "Aplicar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Historial de suscripción y pagos</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-xs text-foreground/50 text-center py-8">Cargando historial...</p>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-6 w-6 text-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-foreground/50">Sin historial de cambios</p>
              <p className="text-xs text-foreground/40 mt-1">Las activaciones, extensiones y cambios de plan aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y">
              {history.map((h) => {
                const actionLabels = {
                  activate: "Plan activado",
                  extend: "Suscripción extendida",
                  cancel: "Suscripción cancelada",
                  apply_coupon: "Cupón aplicado",
                  upgrade: "Plan mejorado",
                  downgrade: "Plan rebajado",
                };
                const actionColors = {
                  activate: "text-green-400 bg-green-500/10",
                  extend: "text-blue-400 bg-blue-500/10",
                  cancel: "text-red-400 bg-red-500/10",
                  apply_coupon: "text-amber-400 bg-amber-500/10",
                  upgrade: "text-emerald-400 bg-emerald-500/10",
                  downgrade: "text-orange-400 bg-orange-500/10",
                };
                const label = actionLabels[h.action] || h.action;
                const colorClass = actionColors[h.action] || "text-foreground/60 bg-muted";

                return (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorClass.split(" ")[1]}`}>
                      <CreditCard className={`h-4 w-4 ${colorClass.split(" ")[0]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/50">
                        {h.plan_from && h.plan_to && (
                          <span>
                            <Badge variant="outline" className="text-xs py-0 mr-1">{h.plan_from}</Badge>
                            →
                            <Badge variant="outline" className="text-xs py-0 ml-1">{h.plan_to}</Badge>
                          </span>
                        )}
                        {h.reason && <span>· {h.reason}</span>}
                        {h.coupon_code && (
                          <span className="font-mono text-amber-400">· {h.coupon_code}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-foreground/50 shrink-0">
                      {new Date(h.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const QUERY_TYPE_LABELS = {
  BUSQUEDA_LEGAL: "Búsqueda legal",
  CONSULTA_GENERAL: "General",
  ANALISIS_PROFUNDO: "Análisis profundo",
  CASO_NUEVO: "Caso nuevo",
};

const QUERY_TYPE_ICONS = {
  BUSQUEDA_LEGAL: Search,
  CONSULTA_GENERAL: MessageSquare,
  ANALISIS_PROFUNDO: Sparkles,
  CASO_NUEVO: FileText,
  CONSULTA_PRODUCTO: HelpCircle,
};

const QUERY_TYPE_COLORS = {
  BUSQUEDA_LEGAL: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  CONSULTA_GENERAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ANALISIS_PROFUNDO: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CASO_NUEVO: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CONSULTA_PRODUCTO: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
};

function ConversationItem({ conversation: c }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadMessages() {
    if (messages) { setOpen(!open); return; }
    setOpen(true);
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/conversations/${c.id}/messages`);
      if (Array.isArray(data)) setMessages(data);
    } catch {} finally { setLoading(false); }
  }

  const totalCost = messages ? messages.reduce((s, m) => s + (Number(m.cost_usd) || 0), 0) : Number(c.cost_usd) || 0;

  return (
    <div className={`transition-colors ${open ? "bg-muted/10" : ""}`}>
      <button
        onClick={loadMessages}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{c.user_name || "Conversación"}</p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-foreground/60">
            <span>{c.message_count} mensajes</span>
            <span>·</span>
            <span className="flex items-center gap-0.5 text-amber-400"><DollarSign className="h-3 w-3" />{totalCost.toFixed(4)} USD</span>
          </div>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">{CHANNEL_LABELS[c.channel] || c.channel}</Badge>
        <span className="text-xs text-foreground/50 shrink-0">
          {new Date(c.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <ChevronDown className={`h-4 w-4 text-foreground/40 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2">
              <Scale className="h-5 w-5 text-primary animate-pulse" />
              <p className="text-sm text-foreground/50">Cargando conversación...</p>
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-8 w-8 text-foreground/20 mb-2" />
              <p className="text-sm text-foreground/50">Sin mensajes en esta conversación</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              {/* Welcome header */}
              <div className="px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Scale className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">LexIA</p>
                    <p className="text-xs text-foreground/50">Conversación iniciada el {new Date(c.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="px-6 py-4 space-y-4">
                {messages.map((m) => {
                  const queryType = m.tools_used?.[0];
                  const QueryIcon = QUERY_TYPE_ICONS[queryType] || MessageSquare;

                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[75%] space-y-1">
                          <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                          </div>
                          <div className="flex items-center justify-end gap-1.5 pr-1">
                            <Clock className="h-3 w-3 text-foreground/50" />
                            <span className="text-xs text-foreground/60">
                              {new Date(m.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Assistant message
                  const isLong = m.content?.length > 600;
                  return (
                    <div key={m.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Scale className="h-4 w-4 text-primary" />
                      </div>
                      <div className={`flex-1 min-w-0 space-y-1.5 ${isLong ? "max-w-full" : "max-w-[85%]"}`}>
                        {/* Header with type badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground/70">LexIA</span>
                          {queryType && (
                            <Badge variant="outline" className={`text-xs py-0 px-1.5 h-5 gap-1 ${QUERY_TYPE_COLORS[queryType] || ""}`}>
                              <QueryIcon className="h-3 w-3" />
                              {QUERY_TYPE_LABELS[queryType] || queryType}
                            </Badge>
                          )}
                        </div>
                        {/* Content */}
                        <div className={`rounded-2xl rounded-tl-md border bg-card px-4 py-3 ${isLong ? "max-h-[400px] overflow-y-auto" : ""}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                        </div>
                        {/* Footer */}
                        <div className="flex items-center gap-3 px-1">
                          <span className="text-xs text-foreground/60 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(m.created_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {m.cost_usd > 0 && (
                            <span className="text-xs flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                              <DollarSign className="h-3 w-3" />{Number(m.cost_usd).toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const tab = searchParams.get("tab") || "overview";
  const setTab = useCallback((t) => {
    router.replace(`/users/${id}?tab=${t}`, { scroll: false });
  }, [id, router]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [d, u] = await Promise.all([
          apiFetch(`/api/admin/users/${id}/detail`),
          apiFetch(`/api/admin/users/${id}/usage?days=${days}`),
        ]);
        setDetail(d);
        setUsage(u);
      } catch {} finally { setLoading(false); }
    }
    load();
  }, [id, days]);

  const trendData = useMemo(() => {
    if (!usage) return [];
    const actual = (usage.daily_history || []).map((d) => ({ date: d.date, cost: d.cost, queries: d.queries }));
    const forecast = (usage.forecast || []).map((d) => ({ date: d.date, forecastCost: d.cost, forecastQueries: d.queries }));
    if (actual.length > 0 && forecast.length > 0) {
      forecast[0].cost = actual[actual.length - 1].cost;
    }
    return [...actual, ...forecast];
  }, [usage]);

  const rangeTotals = useMemo(() => {
    if (!usage?.daily_history) return { queries: 0, cost: 0 };
    return usage.daily_history.reduce((a, d) => ({ queries: a.queries + d.queries, cost: a.cost + d.cost }), { queries: 0, cost: 0 });
  }, [usage]);

  if (loading && !detail) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <User className="h-8 w-8 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (!detail) return null;
  const user = detail.user;

  const TABS = [
    { key: "overview", label: "Resumen", icon: BarChart3 },
    { key: "subscription", label: "Suscripción", icon: CreditCard },
    { key: "conversations", label: `Conversaciones (${detail.conversations?.length || 0})`, icon: MessageSquare },
    { key: "documents", label: `Documentos (${detail.documents?.length || 0})`, icon: FileText },
    { key: "activity", label: "Actividad", icon: ScrollText },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/users")} className="shrink-0 mt-1">
          <ChevronLeft className="h-4 w-4 mr-1" /> Usuarios
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{user.name || user.identifier}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.identifier}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />
                  {user.created_at ? new Date(user.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className={PLAN_BADGES[user.plan] || ""}>{user.plan || "trial"}</Badge>
          {user.is_banned ? (
            <Badge variant="destructive" className="text-[10px]">Suspendido</Badge>
          ) : user.role === "admin" ? (
            <Badge className="bg-primary/10 text-primary text-[10px]">Admin</Badge>
          ) : (
            <Badge variant="outline" className="text-green-400 border-green-500/20 text-[10px]">Activo</Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-[1px] ${
                tab === t.key
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Overview */}
      {tab === "overview" && usage && (
        <div className="space-y-6">
          {/* Date filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Período:</span>
            {[1, 7, 30, 90].map((d) => (
              <Button key={d} variant={days === d ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setDays(d)}>
                {d === 1 ? "Hoy" : `${d} días`}
              </Button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: `Consultas (${days}d)`, value: rangeTotals.queries, icon: MessageSquare, color: "text-blue-400" },
              { label: `Costo (${days}d)`, value: `$${rangeTotals.cost.toFixed(4)}`, icon: Zap, color: "text-red-400" },
              { label: "Consultas total", value: usage.total_queries || 0, icon: BarChart3, color: "text-purple-400" },
              { label: "Costo total", value: `$${usage.total_cost_usd}`, icon: TrendingUp, color: "text-amber-400" },
              { label: "Nivel", value: usage.level === "ok" ? "Normal" : usage.level === "warning" ? "Alerta" : "Crítico", icon: Shield, color: usage.level === "ok" ? "text-green-400" : usage.level === "warning" ? "text-yellow-400" : "text-red-400" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${s.color}`} />
                      <div>
                        <p className="text-xl font-bold">{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Consultas por día</CardTitle></CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usage.daily_history || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="queries" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Consultas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> Costo + Pronóstico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v}`} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} formatter={(v) => v != null ? [`$${v}`, ""] : ["-", ""]} />
                      <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f615" strokeWidth={2} name="Real" />
                      <Area type="monotone" dataKey="forecastCost" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={2} strokeDasharray="5 3" name="Pronóstico" />
                      <Legend wrapperStyle={{ fontSize: "10px" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Query types */}
          {usage.query_types && Object.keys(usage.query_types).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tipos de consulta</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(usage.query_types).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-2 rounded-lg border px-3 py-2">
                      <span className="text-xs text-muted-foreground">{QUERY_LABELS[k] || k}</span>
                      <span className="text-sm font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account info */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Información de cuenta</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-[10px] text-muted-foreground mb-0.5">Plan</p><p className="font-medium capitalize">{user.plan || "trial"}</p></div>
                <div><p className="text-[10px] text-muted-foreground mb-0.5">Consultas usadas</p><p className="font-medium">{user.queries_used || 0} / {user.queries_limit === -1 ? "∞" : user.queries_limit || 10}</p></div>
                <div><p className="text-[10px] text-muted-foreground mb-0.5">Canal principal</p><p className="font-medium">{user.channel || "web"}</p></div>
                <div><p className="text-[10px] text-muted-foreground mb-0.5">Rol</p><p className="font-medium capitalize">{user.role || "user"}</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Subscription */}
      {tab === "subscription" && <SubscriptionTab user={user} userId={id} onRefresh={() => { setLoading(true); apiFetch(`/api/admin/users/${id}/detail`).then(setDetail).finally(() => setLoading(false)); }} />}

      {/* Tab: Conversations */}
      {tab === "conversations" && (
        <Card>
          <CardContent className="p-0">
            {(detail.conversations || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Sin conversaciones</p>
                <p className="text-xs text-muted-foreground mt-1">Este usuario aún no ha iniciado ninguna conversación.</p>
              </div>
            ) : (
              <div className="divide-y">
                {detail.conversations.map((c) => (
                  <ConversationItem key={c.id} conversation={c} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Documents */}
      {tab === "documents" && (
        <Card>
          <CardContent className="p-0">
            {(detail.documents || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Sin documentos</p>
                <p className="text-xs text-muted-foreground mt-1">Este usuario no ha guardado documentos generados.</p>
              </div>
            ) : (
              <div className="divide-y">
                {detail.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title || "Sin título"}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${DOC_TYPE_COLORS[d.document_type] || ""}`}>
                      {d.document_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(d.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Activity */}
      {tab === "activity" && (
        <Card>
          <CardContent className="p-0">
            {(detail.audit_log || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ScrollText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Sin actividad registrada</p>
                <p className="text-xs text-muted-foreground mt-1">Acciones como cambios de plan o suspensiones aparecerán aquí.</p>
              </div>
            ) : (
              <div className="divide-y">
                {detail.audit_log.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                      {log.details && (
                        <p className="text-[10px] text-muted-foreground font-mono truncate">{JSON.stringify(log.details)}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(log.created_at).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
