"use client";

import { useState, useEffect } from "react";
import { BarChart3, Users, MessageSquare, FileText, DollarSign, RefreshCw, Zap } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const QUERY_LABELS = {
  BUSQUEDA_LEGAL: "Busqueda legal",
  CONSULTA_GENERAL: "Consulta general",
  ANALISIS_PROFUNDO: "Analisis profundo",
  CASO_NUEVO: "Caso nuevo",
  CONSULTA_PRODUCTO: "Producto",
};

const PLAN_COLORS = {
  trial: "bg-zinc-500/10 text-zinc-400",
  basico: "bg-blue-500/10 text-blue-400",
  profesional: "bg-purple-500/10 text-purple-400",
  estudio: "bg-amber-500/10 text-amber-400",
};

export default function MetricsPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/analytics").catch(() => null),
      ]);
      setStats(s);
      setAnalytics(a);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando metricas...</p>
        </div>
      </div>
    );
  }

  const queryTypeData = analytics?.query_types ? Object.entries(analytics.query_types).map(([name, value]) => ({ name: QUERY_LABELS[name] || name, value })) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Metricas</h1>
          <p className="text-sm text-muted-foreground">Vista general del sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refrescar
        </Button>
      </div>

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
          {/* Charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Consultas por dia (14 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.daily_queries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="queries" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Costo diario USD (14 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.daily_costs}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v) => [`$${v}`, "Costo"]} />
                      <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef444415" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Query types + Top users */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Consultas por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={queryTypeData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
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
                      <span className="text-sm font-mono font-bold shrink-0">${u.cost}</span>
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
