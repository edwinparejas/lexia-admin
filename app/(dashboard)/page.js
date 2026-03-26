"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3, Users, MessageSquare, FileText, DollarSign,
  RefreshCw, Zap, Calendar, TrendingUp,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const QUERY_LABELS = {
  BUSQUEDA_LEGAL: "Búsqueda legal",
  CONSULTA_GENERAL: "Consulta general",
  ANALISIS_PROFUNDO: "Análisis profundo",
  CASO_NUEVO: "Caso nuevo",
  CONSULTA_PRODUCTO: "Producto",
};

const PLAN_COLORS = {
  trial: "bg-zinc-500/10 text-zinc-400",
  basico: "bg-blue-500/10 text-blue-400",
  profesional: "bg-purple-500/10 text-purple-400",
  estudio: "bg-amber-500/10 text-amber-400",
};

const USER_CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

function getPresetDates(preset) {
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const today = fmt(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { from: fmt(d), to: today };
    }
    case "month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { from: fmt(d), to: today };
    }
    case "quarter": {
      const d = new Date(now);
      d.setDate(d.getDate() - 89);
      return { from: fmt(d), to: today };
    }
    default:
      return { from: "", to: "" };
  }
}

export default function MetricsPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const dates = useMemo(() => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    return getPresetDates(preset);
  }, [preset, customFrom, customTo]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dates.from) params.set("date_from", dates.from);
      if (dates.to) params.set("date_to", dates.to);
      const qs = params.toString() ? `?${params}` : "";
      const [s, a] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch(`/api/admin/analytics${qs}`).catch(() => null),
      ]);
      setStats(s);
      setAnalytics(a);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [dates.from, dates.to]);

  // Datos para chart de tendencia + pronóstico combinado
  const trendData = useMemo(() => {
    if (!analytics) return [];
    const actual = (analytics.daily_costs || []).map((d) => ({
      date: d.date, cost: d.cost, type: "real",
    }));
    const forecast = (analytics.forecast || []).map((d) => ({
      date: d.date, forecast: d.cost, type: "forecast",
    }));
    // El último día real se conecta con el pronóstico
    if (actual.length > 0 && forecast.length > 0) {
      forecast[0].cost = actual[actual.length - 1].cost;
    }
    return [...actual, ...forecast];
  }, [analytics]);

  // Pivot user_daily_costs para stacked bar chart
  const userDailyData = useMemo(() => {
    if (!analytics?.user_daily_costs?.length) return { data: [], users: [] };
    const users = [...new Set(analytics.user_daily_costs.map((d) => d.user))];
    const byDate = {};
    for (const d of analytics.user_daily_costs) {
      if (!byDate[d.date]) byDate[d.date] = { date: d.date };
      byDate[d.date][d.user] = d.cost;
    }
    return { data: Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)), users };
  }, [analytics]);

  const queryTypeData = useMemo(() => {
    if (!analytics?.query_types) return [];
    return Object.entries(analytics.query_types).map(([name, value]) => ({
      name: QUERY_LABELS[name] || name, value,
    }));
  }, [analytics]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando métricas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-sm text-muted-foreground">
            {analytics?.date_from && analytics?.date_to
              ? `${analytics.date_from} — ${analytics.date_to}`
              : "Vista general del sistema"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "today", label: "Hoy" },
            { key: "week", label: "7 días" },
            { key: "month", label: "30 días" },
            { key: "quarter", label: "90 días" },
          ].map((p) => (
            <Button
              key={p.key}
              variant={preset === p.key ? "default" : "outline"}
              size="sm"
              onClick={() => setPreset(p.key)}
              className="text-xs"
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant={preset === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setPreset("custom");
              if (!customFrom) {
                const d = getPresetDates("month");
                setCustomFrom(d.from);
                setCustomTo(d.to);
              }
            }}
            className="text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Rango
          </Button>
          <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === "custom" && (
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="px-3 py-1.5 rounded-md border text-sm bg-background"
          />
          <span className="text-muted-foreground text-sm">a</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="px-3 py-1.5 rounded-md border text-sm bg-background"
          />
        </div>
      )}

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Usuarios", value: stats.total_users, icon: Users, color: "text-blue-400" },
            { label: "Conversaciones", value: stats.total_conversations, icon: MessageSquare, color: "text-green-400" },
            { label: "Mensajes", value: stats.total_messages, icon: Zap, color: "text-purple-400" },
            { label: "Documentos", value: stats.total_documents, icon: FileText, color: "text-orange-400" },
            { label: "Costo USD", value: `$${stats.total_cost_usd}`, icon: DollarSign, color: "text-red-400" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${s.color}`} />
                    <div>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Users by plan */}
      {stats?.users_by_plan && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Usuarios por plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(stats.users_by_plan).map(([plan, count]) => (
                <div key={plan} className="flex items-center gap-2">
                  <Badge className={PLAN_COLORS[plan] || ""}>{plan}</Badge>
                  <span className="text-sm font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <>
          {/* Row 1: Consultas + Costo diario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Consultas por día</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.daily_queries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="queries" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Consultas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Costo diario USD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily_costs}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v) => [`$${v}`, "Costo"]} />
                      <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef444415" strokeWidth={2} name="Costo" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Tendencia + Pronóstico */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Tendencia de costo + Pronóstico (7 días)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} className="fill-muted-foreground" />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v) => v != null ? [`$${v}`, ""] : ["-", ""]} />
                    <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f615" strokeWidth={2} name="Real" connectNulls={false} />
                    <Area type="monotone" dataKey="forecast" stroke="#f59e0b" fill="#f59e0b15" strokeWidth={2} strokeDasharray="6 3" name="Pronóstico" connectNulls={false} />
                    <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Row 3: Costo por usuario por día (stacked bar) */}
          {userDailyData.data.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Costo diario por usuario (Top 5)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userDailyData.data}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v) => [`$${v}`, ""]} />
                      <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "11px" }} />
                      {userDailyData.users.map((user, i) => (
                        <Bar key={user} dataKey={user} stackId="users" fill={USER_CHART_COLORS[i % USER_CHART_COLORS.length]} radius={i === userDailyData.users.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row 4: Consultas por tipo + Top usuarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Consultas por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queryTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Consultas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Top 10 usuarios por consumo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {(analytics.top_users || []).map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="text-sm truncate">{u.identifier}</span>
                        <Badge variant="outline" className="text-[9px] shrink-0">{u.plan}</Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{u.queries} consultas</span>
                        <span className="text-sm font-mono font-bold">${u.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
