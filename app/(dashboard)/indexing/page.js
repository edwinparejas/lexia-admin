"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Database, RefreshCw, FileText, Scale, HardDrive, Layers,
  AlertCircle, CheckCircle2, Clock, Link2, BookOpen, Trash2, Globe,
  ChevronDown, Search, ExternalLink, History, Replace, RotateCcw,
} from "lucide-react";
import { apiFetch, getToken } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ===== CONSTANTS =====

const AREAS = [
  { value: "CIVIL", label: "Civil", icon: "C", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "PENAL", label: "Penal", icon: "P", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { value: "LABORAL", label: "Laboral", icon: "L", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { value: "CONSTITUCIONAL", label: "Constitucional", icon: "Co", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "TRIBUTARIO", label: "Tributario", icon: "T", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "GENERAL", label: "General", icon: "G", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
];

const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.value, a]));

const SUGGESTED_DOCS = [
  { filename: "constitucion.pdf", label: "Constitucion Politica del Peru 1993", area: "CONSTITUCIONAL", pages: 75, size: "823 KB", url: "https://drive.google.com/file/d/19zHRbWzEzPb4D8TdG-EB__1gN9Ps771a/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_civil.pdf", label: "Codigo Civil - DL 295", area: "CIVIL", pages: 724, size: "11 MB", url: "https://drive.google.com/file/d/1LP2a_jQZWlpY1VD0DTA-dAL3YemlrkLq/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_penal.pdf", label: "Codigo Penal - DL 635", area: "PENAL", pages: 259, size: "3.3 MB", url: "https://drive.google.com/file/d/1zSi1vBQzoMCP1kMaJuvlBtm9vTkkR1BU/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_procesal_civil.pdf", label: "Codigo Procesal Civil", area: "CIVIL", pages: 293, size: "2.1 MB", url: "https://drive.google.com/file/d/1rTbiIZW37xd4dPjkQs2PpuD5uAWauG3I/view?usp=sharing", source: "Google Drive" },
  { filename: "jurisprudencia_tc_tomo1.pdf", label: "Jurisprudencia Relevante TC - Tomo I", area: "CONSTITUCIONAL", pages: 992, size: "4.8 MB", url: "https://drive.google.com/file/d/1LRtqo_WDCPfsv3Ju6mh0Ev39Ajjpw8-c/view?usp=sharing", source: "Google Drive" },
];

// ===== AREA SELECTOR =====

function AreaSelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
      {AREAS.map((a) => (
        <button
          key={a.value}
          onClick={() => onChange(a.value)}
          disabled={disabled}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
            value === a.value
              ? "border-primary bg-primary/10 text-primary shadow-sm"
              : "border-border hover:bg-muted/50 text-muted-foreground"
          } disabled:opacity-50`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

// ===== STATUS BAR =====

function StatusBar({ status }) {
  if (!status) return null;

  const styles = {
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  const icons = {
    error: <AlertCircle className="h-4 w-4 shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 shrink-0" />,
    info: <Clock className="h-4 w-4 shrink-0 animate-pulse" />,
  };

  return (
    <div className={`flex items-center gap-2.5 text-sm p-3.5 rounded-lg border ${styles[status.type]}`}>
      {icons[status.type]}
      <span>{status.message}</span>
    </div>
  );
}

// ===== MAIN PAGE =====

export default function IndexingPage() {
  const [indexed, setIndexed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [area, setArea] = useState("GENERAL");
  const [urlInput, setUrlInput] = useState("");
  const [filenameInput, setFilenameInput] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filterArea, setFilterArea] = useState("ALL");
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [editedUrls, setEditedUrls] = useState({});
  const [pypdfConfirm, setPypdfConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [versions, setVersions] = useState({});
  const [expandedVersions, setExpandedVersions] = useState(null);
  const fileRef = useRef(null);

  const loadIndexed = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/indexed-documents");
      if (Array.isArray(d)) setIndexed(d);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadIndexed(); }, [loadIndexed]);

  // Upload file
  async function handleUpload() {
    const file = selectedFile;
    if (!file) {
      setStatus({ type: "error", message: "Selecciona un archivo PDF primero." });
      return;
    }
    setProcessing(true);
    setStatus({ type: "info", message: `Subiendo y procesando "${file.name}"... Puede tardar 1-5 minutos.` });
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      form.append("area", area);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/index-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: `${data.message || "Indexado correctamente."} (${data.chunks} chunks, ${data.pages} paginas)` });
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
        loadIndexed();
      } else {
        setStatus({ type: "error", message: data.error || "Error al procesar." });
      }
    } catch {
      setStatus({ type: "error", message: "Error de conexión. Si el archivo es mayor a 1MB, usa 'Indexar por URL'." });
    } finally {
      setProcessing(false);
    }
  }

  // Index from URL
  async function handleIndexUrl(url, filename, docArea, forcePypdf = false) {
    const finalUrl = url || urlInput;
    const finalFilename = filename || filenameInput || finalUrl.split("/").pop()?.split("?")[0] || "document.pdf";
    const finalArea = docArea || area;

    if (!finalUrl) {
      setStatus({ type: "error", message: "Ingresa una URL." });
      return;
    }

    setProcessing(true);
    setStatus({ type: "info", message: forcePypdf
      ? `Reintentando con PyPDF "${finalFilename}"…`
      : `Descargando y procesando "${finalFilename}"… Puede tardar 2-10 minutos.`
    });
    try {
      const res = await apiFetch("/api/admin/index-document-url", {
        method: "POST",
        body: JSON.stringify({ url: finalUrl, filename: finalFilename, area: finalArea, force_pypdf: forcePypdf }),
      });
      if (res.status === "confirm_pypdf") {
        // LlamaParse falló, pedir confirmación para PyPDF
        setProcessing(false);
        setStatus(null);
        setPypdfConfirm({ url: finalUrl, filename: finalFilename, area: finalArea, message: res.message });
        return;
      }
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento procesado correctamente." });
        setUrlInput("");
        setFilenameInput("");
        setPypdfConfirm(null);
        loadIndexed();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Error al procesar." });
    } finally {
      setProcessing(false);
    }
  }

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Solo se aceptan archivos PDF." });
      return;
    }
    setSelectedFile(file);
    setStatus(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileSelect(file);
  }

  // Delete document
  async function handleDelete(docId) {
    setProcessing(true);
    setStatus({ type: "info", message: "Eliminando documento y vectores..." });
    try {
      const res = await apiFetch(`/api/admin/delete-document/${docId}`, { method: "DELETE" });
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento eliminado." });
        loadIndexed();
      }
    } catch (err) {
      setStatus({ type: "error", message: "Error al eliminar." });
    } finally {
      setProcessing(false);
      setDeleteConfirm(null);
    }
  }

  // Replace document
  async function handleReplace(docId, url, forcePypdf = false) {
    if (!url) { setStatus({ type: "error", message: "URL requerida." }); return; }
    setProcessing(true);
    setStatus({ type: "info", message: "Reemplazando documento... Puede tardar varios minutos." });
    try {
      const res = await apiFetch(`/api/admin/replace-document/${docId}`, {
        method: "POST",
        body: JSON.stringify({ url, force_pypdf: forcePypdf }),
      });
      if (res.status === "confirm_pypdf") {
        setProcessing(false);
        setStatus(null);
        setPypdfConfirm({ ...res, docId, url });
        return;
      }
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento reemplazado." });
        setReplaceDoc(null);
        setReplaceUrl("");
        loadIndexed();
      }
    } catch (err) {
      setStatus({ type: "error", message: "Error al reemplazar." });
    } finally {
      setProcessing(false);
    }
  }

  // Load versions for a document
  async function loadVersions(docId) {
    try {
      const data = await apiFetch(`/api/admin/document-versions/${docId}`);
      if (Array.isArray(data)) setVersions((prev) => ({ ...prev, [docId]: data }));
    } catch {}
  }

  // Stats
  const totalChunks = indexed.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = indexed.reduce((s, d) => s + (d.total_pages || 0), 0);
  const areaCount = {};
  indexed.forEach((d) => {
    const key = (d.document_type || "general").toUpperCase();
    areaCount[key] = (areaCount[key] || 0) + 1;
  });
  const indexedFilenames = new Set(indexed.map((d) => d.filename));

  const filteredDocs = filterArea === "ALL"
    ? indexed
    : indexed.filter((d) => (d.document_type || "").toUpperCase() === filterArea);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Base Legal</h1>
          <p className="text-sm text-muted-foreground">Documentos indexados en Pinecone para búsqueda RAG</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadIndexed} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: FileText, color: "text-blue-400", value: indexed.length, label: "Documentos" },
          { icon: Layers, color: "text-purple-400", value: totalChunks.toLocaleString(), label: "Chunks" },
          { icon: HardDrive, color: "text-green-400", value: totalPages.toLocaleString(), label: "Paginas" },
          { icon: Scale, color: "text-amber-400", value: Object.keys(areaCount).length, label: "Areas" },
        ].map(({ icon: Icon, color, value, label }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className={`h-4.5 w-4.5 ${color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status */}
      <StatusBar status={status} />

      {/* PyPDF Confirmation Dialog */}
      {pypdfConfirm && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">LlamaParse no pudo extraer texto</p>
                <p className="text-xs text-muted-foreground mt-1">{pypdfConfirm.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>PyPDF</strong> es una alternativa que extrae texto básico sin formato (sin tablas ni estructura markdown).
                  La calidad de búsqueda puede ser menor pero el contenido legal estará disponible.
                </p>
              </div>
            </div>
            <div className="flex gap-2 ml-8">
              <Button
                size="sm"
                onClick={() => {
                  handleIndexUrl(pypdfConfirm.url, pypdfConfirm.filename, pypdfConfirm.area, true);
                }}
                disabled={processing}
              >
                {processing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Continuar con PyPDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => setPypdfConfirm(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Indexing Tabs */}
      <Card>
        <CardContent className="p-5">
          <Tabs defaultValue="suggested">
            <TabsList className="mb-4">
              <TabsTrigger value="suggested"><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Documentos sugeridos</TabsTrigger>
              <TabsTrigger value="url"><Link2 className="h-3.5 w-3.5 mr-1.5" /> Indexar por URL</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1.5" /> Subir archivo</TabsTrigger>
            </TabsList>

            {/* Tab: Suggested Documents */}
            <TabsContent value="suggested">
              <p className="text-xs text-muted-foreground mb-4">
                Códigos y normas oficiales del Perú. Puedes editar la URL si cambió. Click en "Indexar" para que el servidor descargue e indexe el PDF.
              </p>
              <div className="space-y-2">
                {SUGGESTED_DOCS.map((doc, idx) => {
                  const isIndexed = indexedFilenames.has(doc.filename);
                  const areaInfo = AREA_MAP[doc.area];
                  const editedUrl = editedUrls[idx];
                  const currentUrl = editedUrl !== undefined ? editedUrl : doc.url;
                  const isExpanded = expandedDoc === idx;

                  return (
                    <div key={doc.filename} className={`rounded-lg border transition-colors ${isIndexed ? "bg-green-500/5 border-green-500/20" : "hover:bg-muted/20"}`}>
                      {/* Row principal */}
                      <div className="flex items-center gap-3 p-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <FileText className={`h-4.5 w-4.5 ${isIndexed ? "text-green-400" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{doc.label}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {doc.pages} pags · {doc.size} · {doc.source}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${areaInfo?.color || ""}`}>
                          {doc.area}
                        </Badge>
                        {isIndexed ? (
                          <Badge className="bg-green-500/10 text-green-400 text-[10px] shrink-0">Indexado</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={processing || !currentUrl}
                            onClick={() => handleIndexUrl(currentUrl, doc.filename, doc.area)}
                            className="shrink-0"
                          >
                            {processing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                            Indexar
                          </Button>
                        )}
                        <button
                          onClick={() => setExpandedDoc(isExpanded ? null : idx)}
                          className="p-1 hover:bg-muted rounded transition-colors shrink-0"
                          title="Ver/editar URL"
                        >
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                      </div>
                      {/* Detalle expandido: URL editable + link */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 space-y-2 border-t mx-3 mt-0 pt-2">
                          <div>
                            <label className="text-[10px] font-medium text-muted-foreground block mb-1">URL de descarga</label>
                            <div className="flex gap-2">
                              <input
                                type="url"
                                value={currentUrl}
                                onChange={(e) => setEditedUrls({ ...editedUrls, [idx]: e.target.value })}
                                placeholder="https://..."
                                className="flex-1 px-2.5 py-1.5 bg-muted border rounded-md text-xs font-mono focus:border-primary focus:outline-none"
                              />
                              {currentUrl && (
                                <a
                                  href={currentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1.5 text-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                                >
                                  <ExternalLink className="h-3 w-3" /> Abrir
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-4 text-[10px] text-muted-foreground">
                            <span>Archivo: <span className="font-mono text-foreground/70">{doc.filename}</span></span>
                            <span>Area: <span className="text-foreground/70">{doc.area}</span></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* Tab: Index by URL */}
            <TabsContent value="url">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Pega la URL de un PDF. El servidor lo descarga e indexa directamente (sin límite de tamaño).
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">URL del PDF</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://ejemplo.com/documento.pdf"
                        className="flex-1 px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                        disabled={processing}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Nombre del archivo (opcional)</label>
                    <input
                      type="text"
                      value={filenameInput}
                      onChange={(e) => setFilenameInput(e.target.value)}
                      placeholder="codigo_laboral.pdf (se detecta automaticamente de la URL)"
                      className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Area legal</label>
                    <AreaSelector value={area} onChange={setArea} disabled={processing} />
                  </div>
                  <Button onClick={() => handleIndexUrl()} disabled={processing || !urlInput} className="w-auto">
                    {processing ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                    ) : (
                      <><Link2 className="h-4 w-4 mr-2" /> Indexar desde URL</>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Upload File */}
            <TabsContent value="upload">
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">
                  Sube un PDF directamente. Límite ~1MB por restricción del servidor. Para archivos grandes usa "Indexar por URL".
                </p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    dragActive ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Upload className={`h-7 w-7 mx-auto mb-2 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                      <button onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-xs text-red-400 hover:underline mt-1">
                        Quitar archivo
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Arrastra un PDF aqui</p>
                      <p className="text-xs text-muted-foreground mb-2">o selecciona uno</p>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} disabled={processing} />
                  {!selectedFile && (
                    <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={processing}>
                      Seleccionar archivo
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Area legal</label>
                      <AreaSelector value={area} onChange={setArea} disabled={processing} />
                    </div>
                    <Button onClick={handleUpload} disabled={processing} className="w-auto">
                      {processing ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" /> Indexar documento</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Indexed Documents Table */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Database className="h-4 w-4" />
              Documentos indexados ({indexed.length})
            </h2>
            {indexed.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterArea("ALL")}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${filterArea === "ALL" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                >
                  Todos
                </button>
                {Object.entries(areaCount).map(([a, count]) => {
                  const info = AREA_MAP[a];
                  return (
                    <button
                      key={a}
                      onClick={() => setFilterArea(a)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${filterArea === a ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      {info?.label || a} ({count})
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
            </div>
          ) : indexed.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin documentos indexados</p>
              <p className="text-xs text-muted-foreground mt-1">Usa la pestaña "Documentos sugeridos" para empezar.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredDocs.filter((d) => d.status !== "archived").map((d) => {
                const areaKey = (d.document_type || "general").toUpperCase();
                const areaInfo = AREA_MAP[areaKey];
                const isExpVer = expandedVersions === d.id;
                const docVersions = versions[d.id] || [];
                const statusColors = {
                  active: "bg-green-500/10 text-green-500",
                  processing: "bg-amber-500/10 text-amber-500",
                  error: "bg-red-500/10 text-red-500",
                  archived: "bg-zinc-500/10 text-zinc-400",
                };

                return (
                  <div key={d.id} className="rounded-lg border hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3 p-3 group">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{d.filename}</p>
                          {d.current_version > 1 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">v{d.current_version}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {d.total_pages > 0 ? `${d.total_pages} págs` : "? págs"} · {d.chunks_created} chunks
                          <span className={`ml-1.5 ${d.parse_method === "PyPDF" ? "text-amber-400/60" : "text-muted-foreground/50"}`}>
                            · {d.parse_method || "LlamaParse"}
                          </span>
                          {d.uploaded_by && (
                            <span className="ml-1.5 text-muted-foreground/40">· {d.uploaded_by}</span>
                          )}
                        </p>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[d.status] || statusColors.active}`}>
                        {d.status === "active" ? "Activo" : d.status === "processing" ? "Procesando" : d.status === "error" ? "Error" : d.status}
                      </span>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${areaInfo?.color || ""}`}>
                        {areaInfo?.label || d.document_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(d.updated_at || d.loaded_at || d.indexed_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                      </span>
                      {/* Actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setReplaceDoc(d); setReplaceUrl(""); }}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Reemplazar con nueva versión"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!isExpVer) loadVersions(d.id);
                            setExpandedVersions(isExpVer ? null : d.id);
                          }}
                          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          title="Ver historial de versiones"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(d)}
                          className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Version history */}
                    {isExpVer && (
                      <div className="px-3 pb-3 border-t mx-3 pt-2 space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Historial de versiones</p>
                        {docVersions.length === 0 ? (
                          <p className="text-[10px] text-muted-foreground/50">Cargando...</p>
                        ) : docVersions.map((v) => (
                          <div key={v.id} className="flex items-center gap-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded-full font-medium ${v.status === "active" ? "bg-green-500/10 text-green-500" : "bg-zinc-500/10 text-zinc-400"}`}>
                              v{v.version}
                            </span>
                            <span className="text-muted-foreground">{v.total_pages} págs · {v.chunks_created} chunks · {v.parse_method}</span>
                            {v.uploaded_by && <span className="text-muted-foreground/50">{v.uploaded_by}</span>}
                            <span className="text-muted-foreground/40 ml-auto">
                              {new Date(v.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Delete confirmation */}
            {deleteConfirm && (
              <div className="mt-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="text-sm font-medium">¿Eliminar "{deleteConfirm.filename}"?</p>
                <p className="text-xs text-muted-foreground mt-1">Se eliminarán todos los vectores de Pinecone. Esta acción no se puede deshacer.</p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(deleteConfirm.id)} disabled={processing}>
                    {processing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                    Eliminar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                </div>
              </div>
            )}

            {/* Replace dialog */}
            {replaceDoc && (
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <p className="text-sm font-medium">Reemplazar "{replaceDoc.filename}" (v{replaceDoc.current_version || 1} → v{(replaceDoc.current_version || 1) + 1})</p>
                <p className="text-xs text-muted-foreground mt-1">Los vectores antiguos se eliminarán y se crearán nuevos con el PDF actualizado.</p>
                <div className="flex gap-2 mt-2">
                  <input
                    type="url"
                    value={replaceUrl}
                    onChange={(e) => setReplaceUrl(e.target.value)}
                    placeholder="URL del PDF actualizado"
                    className="flex-1 px-2.5 py-1.5 bg-muted border rounded-md text-xs focus:border-primary focus:outline-none"
                    disabled={processing}
                  />
                  <Button size="sm" onClick={() => handleReplace(replaceDoc.id, replaceUrl)} disabled={processing || !replaceUrl}>
                    {processing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 mr-1.5" />}
                    Reemplazar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>Cancelar</Button>
                </div>
              </div>
            )}
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold mb-2">Cómo funciona la indexación</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-blue-400">1</div>
              <div><p className="font-medium text-foreground">Descarga</p><p>El servidor descarga el PDF</p></div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-purple-400">2</div>
              <div><p className="font-medium text-foreground">Parseo</p><p>LlamaParse extrae el texto</p></div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-400">3</div>
              <div><p className="font-medium text-foreground">Fragmentación</p><p>Se divide en chunks de 512 tokens</p></div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-green-400">4</div>
              <div><p className="font-medium text-foreground">Indexación</p><p>OpenAI Embeddings + Pinecone</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
