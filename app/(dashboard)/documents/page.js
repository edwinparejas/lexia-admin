"use client";

import { useState, useEffect } from "react";
import { FileText, Search, RefreshCw, Filter, Clock, User, BookOpen } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TYPE_CONFIG = {
  borrador: { label: "Borrador", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  demanda: { label: "Demanda", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  contrato: { label: "Contrato", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  carta: { label: "Carta", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  escrito: { label: "Escrito", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  recurso: { label: "Recurso", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");

  async function loadDocs() {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/documents");
      if (Array.isArray(d)) setDocs(d);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadDocs(); }, []);

  // Tipos únicos para filtros
  const docTypes = [...new Set(docs.map((d) => d.document_type))];

  // Filtrar
  const filtered = docs.filter((d) => {
    if (filterType && d.document_type !== filterType) return false;
    if (search) {
      const term = search.toLowerCase();
      return (d.title || "").toLowerCase().includes(term) ||
        (d.user_email || "").toLowerCase().includes(term);
    }
    return true;
  });

  // Stats
  const typeCount = {};
  docs.forEach((d) => { typeCount[d.document_type] = (typeCount[d.document_type] || 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Documentos de Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Documentos legales generados y guardados por los usuarios
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o usuario..."
              className="pl-9 w-56"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={loadDocs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{docs.length}</p>
                <p className="text-xs text-muted-foreground">Total documentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{new Set(docs.map((d) => d.user_email || d.user_id)).size}</p>
                <p className="text-xs text-muted-foreground">Usuarios activos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{docTypes.length}</p>
                <p className="text-xs text-muted-foreground">Tipos de documento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">
                  {docs.length > 0
                    ? new Date(docs[0].created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground">Último generado</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filterType === "" ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() => setFilterType("")}
        >
          Todos ({docs.length})
        </Button>
        {docTypes.map((t) => {
          const cfg = TYPE_CONFIG[t] || { label: t, color: "" };
          return (
            <Button
              key={t}
              variant={filterType === t ? "default" : "outline"}
              size="sm"
              className="text-xs"
              onClick={() => setFilterType(filterType === t ? "" : t)}
            >
              {cfg.label} ({typeCount[t]})
            </Button>
          );
        })}
      </div>

      {/* Document list */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground mt-2">Cargando documentos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin documentos</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || filterType ? "No hay resultados para este filtro." : "Los documentos generados por usuarios aparecerán aquí."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((d) => {
                const cfg = TYPE_CONFIG[d.document_type] || { label: d.document_type, color: "" };
                return (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.title || "Sin título"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.user_email || (d.user_id || "").slice(0, 8)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {new Date(d.created_at).toLocaleDateString("es-PE", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {filtered.length} de {docs.length} documentos
        </p>
      )}
    </div>
  );
}
