"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Trash2, Database, Clock, Zap, Search, Eye, X,
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { apiFetch } from "@/lib/auth";

const QUERY_TYPES = [
  { value: "", label: "Todos" },
  { value: "BUSQUEDA_LEGAL", label: "Búsqueda Legal" },
  { value: "CONSULTA_GENERAL", label: "Consulta General" },
  { value: "REDACCION_DOCUMENTO", label: "Redacción" },
];

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeUntil(iso) {
  if (!iso) return "—";
  const diff = new Date(iso) - new Date();
  if (diff <= 0) return "Expirado";
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function CachePage() {
  const [data, setData] = useState({ entries: [], total: 0, active: 0, expired: 0, total_hits: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [fullEntry, setFullEntry] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // "all" | "expired" | entry id
  const PAGE_SIZE = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch(`/api/admin/cache?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      if (result.entries) setData(result);
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function viewEntry(id) {
    try {
      const entry = await apiFetch(`/api/admin/cache/${id}`);
      setFullEntry(entry);
    } catch {}
  }

  async function deleteEntry(id) {
    setProcessing(true);
    try {
      await apiFetch(`/api/admin/cache/${id}`, { method: "DELETE" });
      await load();
      if (fullEntry?.id === id) setFullEntry(null);
    } catch {} finally { setProcessing(false); setDeleteConfirm(null); }
  }

  async function clearCache(mode) {
    setProcessing(true);
    try {
      await apiFetch("/api/admin/cache", {
        method: "DELETE",
        body: JSON.stringify({ mode, query_type: filterType }),
      });
      await load();
    } catch {} finally { setProcessing(false); setDeleteConfirm(null); }
  }

  const filtered = data.entries.filter((e) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.query_preview?.toLowerCase().includes(q) && !e.query_type?.toLowerCase().includes(q)) return false;
    }
    if (filterType && e.query_type !== filterType) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-lg font-bold">Cache de Respuestas</h1>
          <p className="text-xs text-muted-foreground">Gestiona las respuestas cacheadas del sistema</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: Database, label: "Total entradas", value: data.total, color: "text-blue-400" },
          { icon: CheckCircle2, label: "Activas", value: data.active, color: "text-green-400" },
          { icon: Clock, label: "Expiradas", value: data.expired, color: "text-amber-400" },
          { icon: Zap, label: "Total hits", value: data.total_hits, color: "text-purple-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en consultas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 border rounded-lg px-1.5 py-0.5">
          {QUERY_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterType === t.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Bulk actions */}
        <Button variant="outline" size="sm" onClick={() => setDeleteConfirm("expired")} disabled={processing || data.expired === 0}>
          <Clock className="h-3.5 w-3.5 mr-1.5" /> Limpiar expiradas
        </Button>
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteConfirm("all")} disabled={processing || data.total === 0}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpiar todo
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Sin entradas en cache</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs">Consulta</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Área</TableHead>
                  <TableHead className="text-xs text-right">Hits</TableHead>
                  <TableHead className="text-xs">Creada</TableHead>
                  <TableHead className="text-xs">Expira</TableHead>
                  <TableHead className="text-xs">Estado</TableHead>
                  <TableHead className="text-xs w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell>
                      <p className="text-xs truncate max-w-[300px]" title={e.query_normalized}>
                        {e.query_preview}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{e.query_type || "—"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.area || "GENERAL"}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{e.hit_count || 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(e.created_at)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeUntil(e.expires_at)}</TableCell>
                    <TableCell>
                      {e.is_expired ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">Expirada</span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">Activa</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-0.5">
                        <button onClick={() => viewEntry(e.id)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Ver">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteEntry(e.id)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-end gap-2 mt-3">
            <span className="text-[11px] text-muted-foreground">{data.total} entradas</span>
            <button disabled={page <= 0} onClick={() => setPage(page - 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] min-w-[50px] text-center">{page + 1}/{totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* Entry detail modal */}
      {fullEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setFullEntry(null)}>
          <div className="bg-background rounded-xl border shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="text-sm font-semibold">Detalle de cache</p>
                <p className="text-[10px] text-muted-foreground font-mono">{fullEntry.id}</p>
              </div>
              <button onClick={() => setFullEntry(null)} className="p-1 rounded hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tipo", value: fullEntry.query_type },
                  { label: "Área", value: fullEntry.area },
                  { label: "Hits", value: fullEntry.hit_count },
                  { label: "Hash", value: fullEntry.query_hash?.slice(0, 16) + "..." },
                  { label: "Creada", value: formatDate(fullEntry.created_at) },
                  { label: "Expira", value: formatDate(fullEntry.expires_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Query */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Consulta</p>
                <div className="rounded-lg bg-muted p-3 text-xs">{fullEntry.query_normalized}</div>
              </div>

              {/* Response */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Respuesta cacheada</p>
                <div className="rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {fullEntry.response}
                </div>
              </div>
            </div>
            <div className="p-3 border-t flex justify-end">
              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => { deleteEntry(fullEntry.id); setFullEntry(null); }}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar esta entrada
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm font-semibold">
                {deleteConfirm === "all" ? "Limpiar todo el cache" : "Limpiar entradas expiradas"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {deleteConfirm === "all"
                ? `Se eliminarán las ${data.total} entradas del cache. Las próximas consultas generarán nuevas llamadas al LLM.`
                : `Se eliminarán ${data.expired} entradas expiradas. Las entradas activas no se verán afectadas.`
              }
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={() => clearCache(deleteConfirm === "all" ? "all" : "expired")} disabled={processing}>
                {processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                {deleteConfirm === "all" ? "Limpiar todo" : "Limpiar expiradas"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
