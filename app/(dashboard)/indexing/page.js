"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw, FileText, Layers, HardDrive, Scale, Database,
  AlertCircle, CheckCircle2, Clock, Upload, Search, FolderOpen,
  LayoutGrid, List, Eye, RotateCcw, Trash2, X, ExternalLink,
  History, User, Cpu, Calendar, ChevronDown, Link2, Globe,
  BookOpen, BarChart3, ArrowUpDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useDocuments } from "./_hooks/use-documents";
import { AREAS, AREA_MAP, STATUS_CONFIG, SUGGESTED_DOCS, getGDrivePreviewUrl } from "./_lib/constants";
import UploadPanel from "./_components/upload-panel";

export default function IndexingPage() {
  const {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
  } = useDocuments();

  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docVersions, setDocVersions] = useState({});
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [pdfViewDoc, setPdfViewDoc] = useState(null);
  const [pypdfConfirm, setPypdfConfirm] = useState(null);
  const [showInlinePdf, setShowInlinePdf] = useState(false);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const activeDocs = useMemo(() => documents.filter((d) => d.status !== "archived"), [documents]);
  const areaCount = useMemo(() => {
    const c = {};
    activeDocs.forEach((d) => { const k = (d.document_type || "general").toUpperCase(); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [activeDocs]);

  const filteredDocs = useMemo(() => {
    let result = activeDocs;
    if (searchQuery) { const q = searchQuery.toLowerCase(); result = result.filter((d) => d.filename.toLowerCase().includes(q)); }
    if (selectedArea !== "ALL") result = result.filter((d) => (d.document_type || "").toUpperCase() === selectedArea);
    return result.sort((a, b) => new Date(b.updated_at || b.loaded_at || 0) - new Date(a.updated_at || a.loaded_at || 0));
  }, [activeDocs, searchQuery, selectedArea]);

  const totalChunks = activeDocs.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = activeDocs.reduce((s, d) => s + (d.total_pages || 0), 0);
  const indexedFilenames = new Set(activeDocs.map((d) => d.filename));

  async function handleLoadVersions(docId) {
    const vers = await loadVersions(docId);
    setDocVersions((prev) => ({ ...prev, [docId]: vers }));
  }
  function handleSelectDoc(doc) { setSelectedDoc(doc); setShowInlinePdf(false); handleLoadVersions(doc.id); }
  async function handleDelete() { if (!deleteConfirm) return; await deleteDocument(deleteConfirm.id); setDeleteConfirm(null); if (selectedDoc?.id === deleteConfirm.id) setSelectedDoc(null); }
  async function handleReplace() {
    if (!replaceDoc || !replaceUrl) return;
    const r = await replaceDocument(replaceDoc.id, replaceUrl);
    if (r?.status === "confirm_pypdf") setPypdfConfirm({ ...r, docId: replaceDoc.id, url: replaceUrl });
    else { setReplaceDoc(null); setReplaceUrl(""); }
  }

  const versions = selectedDoc ? (docVersions[selectedDoc.id] || []) : [];

  return (
    <div className="flex gap-6 p-6">
      {/* ===== LEFT: SIDEBAR ===== */}
      <div className="w-56 shrink-0">
        <div className="sticky top-6 space-y-5">
          {/* Areas */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Áreas Legales</p>
            <div className="space-y-0.5">
              <button onClick={() => setSelectedArea("ALL")} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${selectedArea === "ALL" ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
                <FolderOpen className="h-4 w-4" /><span className="flex-1 text-left">Todos</span><span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{activeDocs.length}</span>
              </button>
              {AREAS.filter((a) => areaCount[a.value]).map((a) => (
                <button key={a.value} onClick={() => setSelectedArea(selectedArea === a.value ? "ALL" : a.value)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${selectedArea === a.value ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
                  <FolderOpen className="h-4 w-4" /><span className="flex-1 text-left">{a.label}</span><span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{areaCount[a.value]}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Stats */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resumen</p>
            {[
              { icon: FileText, label: "Documentos", value: activeDocs.length, color: "text-blue-400" },
              { icon: Layers, label: "Chunks vectorizados", value: totalChunks.toLocaleString(), color: "text-purple-400" },
              { icon: HardDrive, label: "Páginas indexadas", value: totalPages.toLocaleString(), color: "text-green-400" },
              { icon: Scale, label: "Áreas cubiertas", value: Object.keys(areaCount).length, color: "text-amber-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center"><Icon className={`h-3.5 w-3.5 ${color}`} /></div>
                <div><p className="text-xs font-bold">{value}</p><p className="text-[10px] text-muted-foreground leading-tight">{label}</p></div>
              </div>
            ))}
          </div>

          <Separator />

          <Button className="w-full" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1.5" /> Subir documento
          </Button>
        </div>
      </div>

      {/* ===== CENTER: DOCUMENTS ===== */}
      <div className={`flex-1 min-w-0 ${selectedDoc ? "max-w-[calc(100%-256px-420px)]" : ""}`}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{filteredDocs.length} docs</span>
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><LayoutGrid className="h-4 w-4" /></button>
            <button onClick={() => setViewMode("table")} className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><List className="h-4 w-4" /></button>
          </div>
          <Button variant="ghost" size="sm" onClick={loadDocuments} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>

        {/* Status */}
        {status && (
          <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg border ${status.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : status.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
            {status.type === "info" ? <Clock className="h-4 w-4 animate-pulse" /> : status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="flex-1">{status.message}</span>
            <button onClick={() => setStatus(null)}><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Grid / Table */}
        {loading ? (
          <div className="text-center py-20"><RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" /><p className="text-sm text-muted-foreground mt-2">Cargando...</p></div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-20"><Database className="h-8 w-8 text-muted-foreground mx-auto mb-3" /><p className="text-sm font-medium">Sin documentos</p><Button size="sm" className="mt-3" onClick={() => setShowUpload(true)}>Subir documento</Button></div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredDocs.map((d) => {
              const area = AREA_MAP[(d.document_type || "general").toUpperCase()];
              const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
              const isSel = selectedDoc?.id === d.id;
              return (
                <div key={d.id} onClick={() => handleSelectDoc(d)} className={`rounded-xl border bg-card cursor-pointer group transition-all hover:shadow-md ${isSel ? "ring-2 ring-primary border-primary/30 shadow-md" : "hover:border-primary/20"}`}>
                  {/* Top section */}
                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold truncate">{d.filename}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-[9px] py-0 ${area?.color || ""}`}>{area?.label || d.document_type}</Badge>
                          <div className={`flex items-center gap-1 text-[9px] px-1.5 py-0 rounded-full ${st.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
                        <p className="text-sm font-bold">{d.total_pages || "—"}</p>
                        <p className="text-[9px] text-muted-foreground">Páginas</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
                        <p className="text-sm font-bold">{d.chunks_created?.toLocaleString() || "—"}</p>
                        <p className="text-[9px] text-muted-foreground">Chunks</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-center">
                        <p className="text-sm font-bold">v{d.current_version || 1}</p>
                        <p className="text-[9px] text-muted-foreground">Versión</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t flex items-center text-[10px] text-muted-foreground">
                    <Cpu className="h-3 w-3 mr-1" />{d.parse_method || "LlamaParse"}
                    <span className="mx-2">·</span>
                    <Calendar className="h-3 w-3 mr-1" />{new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    {d.uploaded_by && <><span className="mx-2">·</span><User className="h-3 w-3 mr-1" /><span className="truncate max-w-[80px]">{d.uploaded_by}</span></>}
                    {/* Hover actions */}
                    <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setReplaceDoc(d); setReplaceUrl(""); }} className="p-1 rounded hover:bg-muted" title="Reemplazar"><RotateCcw className="h-3.5 w-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(d); }} className="p-1 rounded hover:bg-red-500/10 hover:text-red-500" title="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="text-xs">Documento</TableHead><TableHead className="text-xs">Área</TableHead><TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs text-right">Págs</TableHead><TableHead className="text-xs text-right">Chunks</TableHead>
                <TableHead className="text-xs">Método</TableHead><TableHead className="text-xs">Ver.</TableHead><TableHead className="text-xs">Fecha</TableHead><TableHead className="text-xs w-20"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredDocs.map((d) => {
                  const area = AREA_MAP[(d.document_type || "general").toUpperCase()];
                  const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
                  return (
                    <TableRow key={d.id} className={`cursor-pointer ${selectedDoc?.id === d.id ? "bg-primary/5" : "hover:bg-muted/30"}`} onClick={() => handleSelectDoc(d)}>
                      <TableCell><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary shrink-0" /><span className="text-sm font-medium truncate max-w-[200px]">{d.filename}</span></div></TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${area?.color || ""}`}>{area?.label || d.document_type}</Badge></TableCell>
                      <TableCell><div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} /><span className="text-xs">{st.label}</span></div></TableCell>
                      <TableCell className="text-xs text-right">{d.total_pages || "—"}</TableCell>
                      <TableCell className="text-xs text-right">{d.chunks_created?.toLocaleString() || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.parse_method || "LlamaParse"}</TableCell>
                      <TableCell className="text-xs font-medium">v{d.current_version || 1}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); setReplaceDoc(d); setReplaceUrl(""); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(d); }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ===== RIGHT: DETAIL PANEL ===== */}
      {selectedDoc && (() => {
        const d = selectedDoc;
        const area = AREA_MAP[(d.document_type || "general").toUpperCase()];
        const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
        const previewUrl = getGDrivePreviewUrl(d.source_url);
        return (
          <div className="w-[380px] shrink-0">
            <div className="sticky top-6 rounded-xl border bg-card overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0"><FileText className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{d.filename}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="outline" className={`text-[9px] py-0 ${area?.color || ""}`}>{area?.label}</Badge>
                      <span className={`text-[9px] px-1.5 py-0 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDoc(null)} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
                </div>
              </div>

              {/* Content */}
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {/* Metadata */}
                <div className="p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Información</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: HardDrive, label: "Páginas", value: d.total_pages || "—" },
                      { icon: Layers, label: "Chunks", value: d.chunks_created?.toLocaleString() || "—" },
                      { icon: Cpu, label: "Método", value: d.parse_method || "LlamaParse" },
                      { icon: BarChart3, label: "Versión", value: `v${d.current_version || 1}` },
                      { icon: Calendar, label: "Cargado", value: new Date(d.loaded_at || d.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) },
                      { icon: User, label: "Subido por", value: d.uploaded_by || "Sistema" },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0"><Icon className="h-3 w-3 text-muted-foreground" /></div>
                        <div><p className="text-[9px] text-muted-foreground">{label}</p><p className="text-xs font-semibold">{value}</p></div>
                      </div>
                    ))}
                  </div>
                  {d.source_url && (
                    <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary hover:underline mt-3">
                      <ExternalLink className="h-3 w-3" /> Ver fuente original
                    </a>
                  )}
                </div>

                <Separator />

                {/* PDF Preview */}
                {previewUrl && (
                  <>
                    <div className="p-4">
                      <button onClick={() => setShowInlinePdf(!showInlinePdf)} className="w-full text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground">
                        <Eye className="h-3 w-3" />{showInlinePdf ? "Ocultar PDF" : "Vista previa"}<ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showInlinePdf ? "rotate-180" : ""}`} />
                      </button>
                      {showInlinePdf && (
                        <>
                          <div className="mt-2 rounded-lg border overflow-hidden" style={{ height: 280 }}>
                            <iframe src={previewUrl} className="w-full h-full" title={d.filename} />
                          </div>
                          <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setPdfViewDoc(d)}>
                            <Eye className="h-3 w-3 mr-1" /> Abrir en pantalla completa
                          </Button>
                        </>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Version History */}
                <div className="p-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <History className="h-3 w-3" /> Historial de versiones
                  </p>
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground/50 italic">Sin historial registrado</p>
                  ) : (
                    <div className="relative pl-5 space-y-3">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      {versions.map((v) => (
                        <div key={v.id} className="relative">
                          <div className={`absolute -left-5 top-2 w-3 h-3 rounded-full border-2 border-card ${v.status === "active" ? "bg-green-500" : "bg-zinc-400"}`} />
                          <div className={`rounded-lg border p-3 ${v.status === "active" ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"}`}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-bold ${v.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>v{v.version}</span>
                              {v.status === "active" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-semibold">ACTUAL</span>}
                              {v.status === "replaced" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 font-medium">Reemplazada</span>}
                            </div>
                            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                              <div className="bg-background rounded px-2 py-1"><span className="text-muted-foreground/60 block">Págs</span><span className="font-semibold">{v.total_pages}</span></div>
                              <div className="bg-background rounded px-2 py-1"><span className="text-muted-foreground/60 block">Chunks</span><span className="font-semibold">{v.chunks_created}</span></div>
                              <div className="bg-background rounded px-2 py-1"><span className="text-muted-foreground/60 block">Método</span><span className="font-semibold">{v.parse_method}</span></div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-[9px] text-muted-foreground/50">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(v.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              {v.uploaded_by && <><span>·</span><User className="h-2.5 w-2.5" />{v.uploaded_by}</>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-3 border-t flex items-center gap-2">
                {previewUrl && <Button variant="outline" size="sm" onClick={() => setPdfViewDoc(d)}><Eye className="h-3.5 w-3.5 mr-1" /> PDF</Button>}
                <Button variant="outline" size="sm" onClick={() => { setReplaceDoc(d); setReplaceUrl(""); }}><RotateCcw className="h-3.5 w-3.5 mr-1" /> Reemplazar</Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteConfirm(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODALS ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Eliminar "{deleteConfirm.filename}"</p>
            <p className="text-xs text-muted-foreground mt-2">Se eliminarán todos los vectores. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={processing}>{processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      {replaceDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>
          <div className="bg-background rounded-xl border p-6 max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Reemplazar "{replaceDoc.filename}"</p>
            <p className="text-xs text-muted-foreground mt-1">v{replaceDoc.current_version || 1} → v{(replaceDoc.current_version || 1) + 1}</p>
            <input type="url" value={replaceUrl} onChange={(e) => setReplaceUrl(e.target.value)} placeholder="URL del PDF actualizado" className="w-full mt-3 px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" disabled={processing} />
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleReplace} disabled={processing || !replaceUrl}>{processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Reemplazar</Button>
            </div>
          </div>
        </div>
      )}

      {pdfViewDoc && (() => {
        const url = getGDrivePreviewUrl(pdfViewDoc.source_url);
        if (!url) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setPdfViewDoc(null)}>
            <div className="flex items-center gap-3 px-4 py-3 bg-background/95 border-b" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold flex-1">{pdfViewDoc.filename}</p>
              <a href={pdfViewDoc.source_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Original</Button></a>
              <button onClick={() => setPdfViewDoc(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-2" onClick={(e) => e.stopPropagation()}><iframe src={url} className="w-full h-full rounded-lg" title={pdfViewDoc.filename} /></div>
          </div>
        );
      })()}

      {showUpload && (
        <UploadPanel
          onClose={() => { setShowUpload(false); setPypdfConfirm(null); }}
          processing={processing}
          onIndexUrl={async (url, fn, area) => { const r = await indexFromUrl(url, fn, area); if (r?.status === "confirm_pypdf") setPypdfConfirm({ ...r, url, filename: fn, area }); else { setShowUpload(false); setPypdfConfirm(null); } }}
          onUploadFile={async (file, area) => { await uploadFile(file, area); }}
          indexedFilenames={indexedFilenames}
          pypdfConfirm={pypdfConfirm}
          onPypdfConfirm={async () => { await indexFromUrl(pypdfConfirm.url, pypdfConfirm.filename, pypdfConfirm.area, true); setPypdfConfirm(null); setShowUpload(false); }}
          onPypdfCancel={() => setPypdfConfirm(null)}
        />
      )}
    </div>
  );
}
