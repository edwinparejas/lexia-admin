"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PLAN_BADGES = {
  trial: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  basico: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  profesional: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  estudio: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [usage, setUsage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editPlan, setEditPlan] = useState("");
  const perPage = 20;

  async function loadUsers(q = "") {
    setLoading(true);
    try {
      const url = q ? `/api/admin/users?q=${encodeURIComponent(q)}&limit=200` : "/api/admin/users?limit=200";
      const data = await apiFetch(url);
      if (Array.isArray(data)) setUsers(data);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  function handleSearch(e) { e?.preventDefault?.(); setPage(0); loadUsers(search); }

  async function handleExpand(id) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setUsage(null);
    try { const d = await apiFetch(`/api/admin/users/${id}/usage`); setUsage(d); } catch {}
  }

  async function handleSave(userId) {
    if (!editPlan) return;
    const limits = { trial: 10, basico: 100, profesional: 500, estudio: -1 };
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "PUT", body: JSON.stringify({ plan: editPlan, queries_limit: limits[editPlan] || 10 }) });
      setEditingId(null);
      loadUsers(search);
    } catch {}
  }

  async function handleBan(userId, ban) {
    const reason = ban ? prompt("Motivo de suspension:") : "";
    if (ban && reason === null) return;
    try {
      await apiFetch(`/api/admin/users/${userId}/ban`, { method: "POST", body: JSON.stringify({ ban, reason }) });
      loadUsers(search);
    } catch {}
  }

  const paginated = users.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(users.length / perPage);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">{users.length} registrados</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar email..." className="pl-9 w-64" />
          </div>
          <Button type="submit" variant="outline" size="sm">Buscar</Button>
        </form>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Consultas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : paginated.map((u) => (
              <>
                <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(u.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${u.is_banned ? "bg-red-500" : "bg-green-500"}`} />
                      <div>
                        <p className="text-sm font-medium">{u.identifier}</p>
                        {u.name && <p className="text-xs text-muted-foreground">{u.name}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {editingId === u.id ? (
                      <select value={editPlan} onChange={(e) => setEditPlan(e.target.value)} onClick={(e) => e.stopPropagation()} className="bg-background border rounded px-2 py-1 text-xs">
                        {["trial", "basico", "profesional", "estudio"].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <Badge variant="outline" className={PLAN_BADGES[u.plan] || ""}>{u.plan || "trial"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{u.queries_used || 0}</span>
                    <span className="text-muted-foreground">/{u.queries_limit === -1 ? "∞" : u.queries_limit || 10}</span>
                  </TableCell>
                  <TableCell>
                    {u.is_banned ? (
                      <Badge variant="destructive" className="text-[10px]">Suspendido</Badge>
                    ) : u.role === "admin" ? (
                      <Badge className="bg-primary/10 text-primary text-[10px]">Admin</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-400 border-green-500/20 text-[10px]">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {editingId === u.id ? (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="default" onClick={() => handleSave(u.id)}>Guardar</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>X</Button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(u.id); setEditPlan(u.plan || "trial"); }}>Editar</Button>
                        <Button size="sm" variant="ghost" className={u.is_banned ? "text-green-400" : "text-destructive"} onClick={() => handleBan(u.id, !u.is_banned)}>
                          {u.is_banned ? "Activar" : "Suspender"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                {expandedId === u.id && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/30">
                      {usage ? (
                        <div className="grid grid-cols-4 gap-3 py-2">
                          <div className="text-center"><p className="text-lg font-bold">{usage.daily_queries}</p><p className="text-[10px] text-muted-foreground">Consultas hoy</p></div>
                          <div className="text-center"><p className="text-lg font-bold">${usage.daily_cost_usd}</p><p className="text-[10px] text-muted-foreground">Costo hoy</p></div>
                          <div className="text-center"><p className="text-lg font-bold">${usage.total_cost_usd}</p><p className="text-[10px] text-muted-foreground">Costo total</p></div>
                          <div className="text-center">
                            <p className={`text-lg font-bold ${usage.level === "critical" ? "text-destructive" : usage.level === "warning" ? "text-yellow-400" : "text-green-400"}`}>
                              {usage.level === "ok" ? "Normal" : usage.level}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Nivel</p>
                          </div>
                        </div>
                      ) : <p className="text-xs text-muted-foreground py-2">Cargando...</p>}
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">Pagina {page + 1} de {totalPages}</p>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
