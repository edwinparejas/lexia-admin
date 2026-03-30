"use client";

import { useState, useEffect, useMemo } from "react";
import {
  RefreshCw, FileText, Layers, HardDrive, Scale, Database,
  AlertCircle, CheckCircle2, Clock, Upload, Search, FolderOpen,
  Tag, BarChart3, ChevronRight, LayoutGrid, List, Eye, RotateCcw,
  Trash2, X, Link2, Globe, BookOpen, ChevronDown, ExternalLink,
  History, User, Cpu, Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useDocuments } from "./_hooks/use-documents";
import { AREAS, AREA_MAP, STATUS_CONFIG, TAGS, TAG_MAP, SUGGESTED_DOCS, getGDrivePreviewUrl } from "./_lib/constants";

// ===== MAIN PAGE =====

export default function IndexingPage() {
  const {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
  } = useDocuments();

  // UI state
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

  // Derived data
  const activeDocs = useMemo(() => documents.filter((d) => d.status !== "archived"), [documents]);

  const areaCount = useMemo(() => {
    const counts = { ALL: activeDocs.length };
    activeDocs.forEach((d) => {
      const k = (d.document_type || "general").toUpperCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [activeDocs]);

  const filteredDocs = useMemo(() => {
    let result = activeDocs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.filename.toLowerCase().includes(q));
    }
    if (selectedArea !== "ALL") {
      result = result.filter((d) => (d.document_type || "").toUpperCase() === selectedArea);
    }
    return result.sort((a, b) => new Date(b.updated_at || b.loaded_at || 0) - new Date(a.updated_at || a.loaded_at || 0));
  }, [activeDocs, searchQuery, selectedArea]);

  const totalChunks = activeDocs.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = activeDocs.reduce((s, d) => s + (d.total_pages || 0), 0);
  const indexedFilenames = new Set(activeDocs.map((d) => d.filename));

  // Handlers
  async function handleLoadVersions(docId) {
    const vers = await loadVersions(docId);
    setDocVersions((prev) => ({ ...prev, [docId]: vers }));
  }

  function handleSelectDoc(doc) {
    setSelectedDoc(doc);
    handleLoadVersions(doc.id);
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    await deleteDocument(deleteConfirm.id);
    setDeleteConfirm(null);
    if (selectedDoc?.id === deleteConfirm.id) setSelectedDoc(null);
  }

  async function handleReplace() {
    if (!replaceDoc || !replaceUrl) return;
    const result = await replaceDocument(replaceDoc.id, replaceUrl);
    if (result?.status === "confirm_pypdf") {
      setPypdfConfirm({ ...result, docId: replaceDoc.id, url: replaceUrl });
    } else {
      setReplaceDoc(null);
      setReplaceUrl("");
    }
  }

  const versions = selectedDoc ? (docVersions[selectedDoc.id] || []) : [];

  return (
    <div className="flex h-[calc(100vh-64px)]">

      {/* ====== LEFT SIDEBAR ====== */}
      <div className="w-64 border-r bg-muted/20 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-base font-bold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Base Legal
          </h1>
          <p className="text-[10px] text-muted-foreground mt-0.5">Gestión documental</p>
        </div>

        {/* Areas navigation */}
        <div className="p-3 flex-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Áreas Legales</p>
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedArea("ALL")}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                selectedArea === "ALL" ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted"
              }`}
            >
              <FolderOpen className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Todos</span>
              <span className="text-[10px] text-muted-foreground">{areaCount.ALL || 0}</span>
            </button>
            {AREAS.map((a) => {
              const count = areaCount[a.value] || 0;
              return (
                <button
                  key={a.value}
                  onClick={() => setSelectedArea(selectedArea === a.value ? "ALL" : a.value)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                    selectedArea === a.value ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-muted"
                  }`}
                >
                  <FolderOpen className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{a.label}</span>
                  {count > 0 && <span className="text-[10px] text-muted-foreground">{count}</span>}
                </button>
              );
            })}
          </div>

          <Separator className="my-3" />

          {/* Stats */}
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Estadísticas</p>
          <div className="space-y-2 px-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><FileText className="h-3 w-3" /> Documentos</span>
              <span className="font-semibold">{activeDocs.length}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><Layers className="h-3 w-3" /> Chunks</span>
              <span className="font-semibold">{totalChunks.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><HardDrive className="h-3 w-3" /> Páginas</span>
              <span className="font-semibold">{totalPages.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5"><Scale className="h-3 w-3" /> Áreas</span>
              <span className="font-semibold">{Object.keys(areaCount).length - 1}</span>
            </div>
          </div>
        </div>

        {/* Upload button */}
        <div className="p-3 border-t">
          <Button className="w-full" size="sm" onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Subir documento
          </Button>
        </div>
      </div>

      {/* ====== MAIN CONTENT ====== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{filteredDocs.length} documento{filteredDocs.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Status */}
        {status && (
          <div className={`mx-4 mt-3 flex items-center gap-2.5 text-sm p-3 rounded-lg border ${
            status.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" :
            status.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" :
            "bg-blue-500/10 border-blue-500/20 text-blue-400"
          }`}>
            {status.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> :
             status.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> :
             <Clock className="h-4 w-4 shrink-0 animate-pulse" />}
            <span className="flex-1">{status.message}</span>
            <button onClick={() => setStatus(null)} className="p-0.5 hover:bg-white/10 rounded"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Content area - split between list and detail */}
        <div className="flex-1 flex min-h-0">
          {/* Document list */}
          <div className={`flex-1 overflow-y-auto p-4 ${selectedDoc ? "hidden lg:block lg:flex-1" : ""}`}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Cargando documentos...</p>
                </div>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Database className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium">{activeDocs.length === 0 ? "Sin documentos" : "Sin resultados"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activeDocs.length === 0 ? "Sube tu primer documento." : "Prueba con otros filtros."}</p>
                  {activeDocs.length === 0 && <Button size="sm" className="mt-3" onClick={() => setShowUpload(true)}>Subir documento</Button>}
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredDocs.map((d) => {
                  const areaInfo = AREA_MAP[(d.document_type || "general").toUpperCase()];
                  const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
                  const isSelected = selectedDoc?.id === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => handleSelectDoc(d)}
                      className={`rounded-xl border bg-card hover:shadow-sm transition-all cursor-pointer group ${
                        isSelected ? "ring-2 ring-primary border-primary/30" : "hover:border-primary/20"
                      }`}
                    >
                      <div className="p-4 pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{d.filename}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {d.total_pages || "?"} págs · {d.chunks_created} chunks · {d.parse_method || "LlamaParse"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 border-t flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>{areaInfo?.label || d.document_type}</Badge>
                        <div className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </div>
                        {(d.current_version || 1) > 1 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">v{d.current_version}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/40 ml-auto">
                          {new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table view */
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs">Documento</TableHead>
                      <TableHead className="text-xs">Área</TableHead>
                      <TableHead className="text-xs">Estado</TableHead>
                      <TableHead className="text-xs">Págs</TableHead>
                      <TableHead className="text-xs">Chunks</TableHead>
                      <TableHead className="text-xs">Método</TableHead>
                      <TableHead className="text-xs">Ver.</TableHead>
                      <TableHead className="text-xs">Actualizado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((d) => {
                      const areaInfo = AREA_MAP[(d.document_type || "general").toUpperCase()];
                      const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
                      const isSelected = selectedDoc?.id === d.id;
                      return (
                        <TableRow key={d.id} className={`cursor-pointer ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`} onClick={() => handleSelectDoc(d)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-sm font-medium truncate max-w-[180px]">{d.filename}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>{areaInfo?.label || d.document_type}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              <span className="text-xs">{statusCfg.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{d.total_pages || "—"}</TableCell>
                          <TableCell className="text-xs">{d.chunks_created || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.parse_method || "LlamaParse"}</TableCell>
                          <TableCell className="text-xs font-medium">v{d.current_version || 1}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* ====== RIGHT DETAIL PANEL ====== */}
          {selectedDoc && (() => {
            const d = selectedDoc;
            const areaInfo = AREA_MAP[(d.document_type || "general").toUpperCase()];
            const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
            const previewUrl = getGDrivePreviewUrl(d.source_url);

            return (
              <div className="w-[400px] border-l bg-background flex flex-col shrink-0 overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{d.filename}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[9px] ${areaInfo?.color || ""}`}>{areaInfo?.label || d.document_type}</Badge>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedDoc(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  {/* Metadata */}
                  <div className="p-4 space-y-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Información</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {[
                        { icon: HardDrive, label: "Páginas", value: d.total_pages || "—" },
                        { icon: Layers, label: "Chunks", value: d.chunks_created || "—" },
                        { icon: Cpu, label: "Método", value: d.parse_method || "LlamaParse" },
                        { icon: BarChart3, label: "Versión", value: `v${d.current_version || 1}` },
                        { icon: Calendar, label: "Cargado", value: new Date(d.loaded_at || d.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) },
                        { icon: User, label: "Subido por", value: d.uploaded_by || "—" },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2 py-1">
                          <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="text-xs font-medium">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {d.source_url && (
                      <a href={d.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                        <ExternalLink className="h-3 w-3" />
                        Ver fuente original
                      </a>
                    )}
                  </div>

                  <Separator />

                  {/* PDF Preview */}
                  {previewUrl && (
                    <div className="p-4">
                      <button
                        onClick={() => setShowInlinePdf(!showInlinePdf)}
                        className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 hover:text-foreground w-full"
                      >
                        <Eye className="h-3 w-3" />
                        {showInlinePdf ? "Ocultar vista previa" : "Vista previa del PDF"}
                        <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showInlinePdf ? "rotate-180" : ""}`} />
                      </button>
                      {showInlinePdf && (
                        <div className="mt-2 rounded-lg border overflow-hidden bg-muted" style={{ height: 300 }}>
                          <iframe src={previewUrl} className="w-full h-full" title={d.filename} />
                        </div>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Version History */}
                  <div className="p-4">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <History className="h-3 w-3" />
                      Historial de versiones
                    </p>
                    {versions.length === 0 ? (
                      <p className="text-xs text-muted-foreground/50">Sin historial de versiones</p>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                        {versions.map((v) => (
                          <div key={v.id} className="relative mb-4 last:mb-0">
                            <div className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full border-2 border-background ${v.status === "active" ? "bg-green-500" : "bg-zinc-400"}`} />
                            <div className="rounded-lg border p-3 bg-card">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold ${v.status === "active" ? "text-green-500" : "text-muted-foreground"}`}>
                                  Versión {v.version}
                                </span>
                                {v.status === "active" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">Actual</span>}
                                {v.status === "replaced" && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400">Reemplazada</span>}
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground">
                                <div><span className="block text-muted-foreground/50">Páginas</span>{v.total_pages}</div>
                                <div><span className="block text-muted-foreground/50">Chunks</span>{v.chunks_created}</div>
                                <div><span className="block text-muted-foreground/50">Método</span>{v.parse_method}</div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground/50">
                                <Calendar className="h-3 w-3" />
                                {new Date(v.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {v.uploaded_by && <><User className="h-3 w-3 ml-1" />{v.uploaded_by}</>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions footer */}
                <div className="p-3 border-t flex items-center gap-2">
                  {previewUrl && (
                    <Button variant="outline" size="sm" onClick={() => setPdfViewDoc(d)}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> PDF
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => { setReplaceDoc(d); setReplaceUrl(""); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reemplazar
                  </Button>
                  <div className="flex-1" />
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => setDeleteConfirm(d)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ====== MODALS ====== */}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Eliminar "{deleteConfirm.filename}"</p>
            <p className="text-xs text-muted-foreground mt-2">Se eliminarán todos los vectores de Pinecone. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={processing}>
                {processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Replace dialog */}
      {replaceDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>
          <div className="bg-background rounded-xl border p-6 max-w-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Reemplazar "{replaceDoc.filename}"</p>
            <p className="text-xs text-muted-foreground mt-1">v{replaceDoc.current_version || 1} → v{(replaceDoc.current_version || 1) + 1}</p>
            <input type="url" value={replaceUrl} onChange={(e) => setReplaceUrl(e.target.value)} placeholder="URL del PDF actualizado" className="w-full mt-3 px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" disabled={processing} />
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleReplace} disabled={processing || !replaceUrl}>
                {processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Reemplazar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer modal */}
      {pdfViewDoc && (() => {
        const previewUrl = getGDrivePreviewUrl(pdfViewDoc.source_url);
        if (!previewUrl) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setPdfViewDoc(null)}>
            <div className="flex items-center gap-3 px-4 py-3 bg-background/95 border-b" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-semibold flex-1">{pdfViewDoc.filename}</p>
              {pdfViewDoc.source_url && (
                <a href={pdfViewDoc.source_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir original</Button>
                </a>
              )}
              <button onClick={() => setPdfViewDoc(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-2" onClick={(e) => e.stopPropagation()}>
              <iframe src={previewUrl} className="w-full h-full rounded-lg" title={pdfViewDoc.filename} />
            </div>
          </div>
        );
      })()}

      {/* Upload panel modal */}
      {showUpload && (
        <UploadPanel
          onClose={() => { setShowUpload(false); setPypdfConfirm(null); }}
          processing={processing}
          onIndexUrl={async (url, fn, area) => {
            const res = await indexFromUrl(url, fn, area);
            if (res?.status === "confirm_pypdf") setPypdfConfirm({ ...res, url, filename: fn, area });
            else setShowUpload(false);
          }}
          onUploadFile={async (file, area) => { await uploadFile(file, area); }}
          indexedFilenames={indexedFilenames}
          pypdfConfirm={pypdfConfirm}
          onPypdfConfirm={async () => {
            await indexFromUrl(pypdfConfirm.url, pypdfConfirm.filename, pypdfConfirm.area, true);
            setPypdfConfirm(null);
            setShowUpload(false);
          }}
          onPypdfCancel={() => setPypdfConfirm(null)}
        />
      )}
    </div>
  );
}
