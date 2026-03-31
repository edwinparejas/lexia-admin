"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, X, RefreshCw, BookOpen, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { apiFetch } from "@/lib/auth";
import { AREAS, AREA_MAP } from "../_lib/constants";
import Link from "next/link";

function TemplateForm({ template, onSave, onCancel, processing }) {
  const [form, setForm] = useState({
    filename: template?.filename || "",
    label: template?.label || "",
    description: template?.description || "",
    area: template?.area || "GENERAL",
    url: template?.url || "",
    source: template?.source || "url",
    expected_pages: template?.expected_pages || "",
    expected_size: template?.expected_size || "",
    is_active: template?.is_active !== false,
  });

  function set(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-background rounded-xl border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">{template ? "Editar plantilla" : "Nueva plantilla"}</p>
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Nombre de archivo</label>
              <input type="text" value={form.filename} onChange={(e) => set("filename", e.target.value)} placeholder="codigo_civil.pdf" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Etiqueta</label>
              <input type="text" value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Código Civil - DL 295" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">URL del documento</label>
            <input type="url" value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://drive.google.com/file/d/..." className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Descripción (opcional)</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none resize-none" placeholder="Descripción del documento..." />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">Área legal</label>
            <div className="grid grid-cols-4 gap-1">
              {AREAS.map((a) => (
                <button key={a.value} onClick={() => set("area", a.value)} className={`rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all ${form.area === a.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50 text-muted-foreground"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">Fuente</label>
              <input type="text" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Google Drive" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Páginas (est.)</label>
              <input type="number" value={form.expected_pages} onChange={(e) => set("expected_pages", e.target.value ? parseInt(e.target.value) : "")} className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Tamaño (est.)</label>
              <input type="text" value={form.expected_size} onChange={(e) => set("expected_size", e.target.value)} placeholder="2.5 MB" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" onClick={() => onSave(form)} disabled={processing || !form.filename || !form.label || !form.url}>
            {processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {template ? "Guardar" : "Crear"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/document-templates");
      if (Array.isArray(data)) setTemplates(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    setProcessing(true);
    try {
      if (editTemplate) {
        await apiFetch(`/api/admin/document-templates/${editTemplate.id}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/admin/document-templates", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      await load();
      setShowForm(false);
      setEditTemplate(null);
    } catch {} finally { setProcessing(false); }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    setProcessing(true);
    try {
      await apiFetch(`/api/admin/document-templates/${deleteConfirm.id}`, { method: "DELETE" });
      await load();
      setDeleteConfirm(null);
    } catch {} finally { setProcessing(false); }
  }

  async function toggleActive(t) {
    setProcessing(true);
    try {
      await apiFetch(`/api/admin/document-templates/${t.id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      await load();
    } catch {} finally { setProcessing(false); }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/indexing">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1.5" /> Volver</Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Plantillas de Documentos</h1>
          <p className="text-xs text-muted-foreground">Gestiona los documentos base disponibles para indexar rápidamente</p>
        </div>
        <Button size="sm" onClick={() => { setEditTemplate(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Nueva plantilla
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">Sin plantillas</p>
          <p className="text-xs text-muted-foreground mt-1">Crea tu primera plantilla de documento legal</p>
          <Button size="sm" className="mt-3" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Crear</Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs">Nombre</TableHead>
                <TableHead className="text-xs">Etiqueta</TableHead>
                <TableHead className="text-xs">Área</TableHead>
                <TableHead className="text-xs">Fuente</TableHead>
                <TableHead className="text-xs text-right">Págs</TableHead>
                <TableHead className="text-xs">Tamaño</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs w-[120px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => {
                const areaInfo = AREA_MAP[t.area];
                return (
                  <TableRow key={t.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="text-sm font-medium">{t.filename}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px] block">{t.label}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>{areaInfo?.label || t.area}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{t.source || "url"}</span>
                        {t.url && (
                          <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-right">{t.expected_pages || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.expected_size || "—"}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleActive(t)} disabled={processing} className="flex items-center gap-1.5">
                        {t.is_active !== false ? (
                          <><ToggleRight className="h-4 w-4 text-green-500" /><span className="text-[10px] text-green-500">Activa</span></>
                        ) : (
                          <><ToggleLeft className="h-4 w-4 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Inactiva</span></>
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => { setEditTemplate(t); setShowForm(true); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(t)} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <TemplateForm
          template={editTemplate}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditTemplate(null); }}
          processing={processing}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Eliminar plantilla "{deleteConfirm.label}"</p>
            <p className="text-xs text-muted-foreground mt-2">Esta acción no afecta documentos ya indexados.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={processing}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
