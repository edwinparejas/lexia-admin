"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload, Database, RefreshCw, FileText, Scale, HardDrive, Layers,
  AlertCircle, CheckCircle2, Clock, Link2, BookOpen, Trash2, Globe,
  ChevronDown, Search,
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
  { filename: "constitucion.pdf", label: "Constitucion Politica del Peru 1993", area: "CONSTITUCIONAL", pages: 75, size: "823 KB", url: "https://www.tc.gob.pe/wp-content/uploads/2021/05/Constitucion-Politica-del-Peru-1993.pdf", source: "Tribunal Constitucional" },
  { filename: "codigo_civil.pdf", label: "Codigo Civil - DL 295", area: "CIVIL", pages: 724, size: "11 MB", url: "https://spijlibre.minjus.gob.pe/content/publicaciones_oficiales/img/Codigo-Civil.pdf", source: "SPIJ - Ministerio de Justicia" },
  { filename: "codigo_penal.pdf", label: "Codigo Penal - DL 635", area: "PENAL", pages: 259, size: "3.3 MB", url: "http://spijlibre.minjus.gob.pe/content/publicaciones_oficiales/img/CODIGOPENAL.pdf", source: "SPIJ - Ministerio de Justicia" },
  { filename: "codigo_procesal_civil.pdf", label: "Codigo Procesal Civil", area: "CIVIL", pages: 293, size: "2.1 MB", url: "https://www.munlima.gob.pe/wp-content/uploads/2021/07/Codigo-Procesal-Civil.pdf", source: "Municipalidad de Lima" },
  { filename: "jurisprudencia_tc_tomo1.pdf", label: "Jurisprudencia Relevante TC - Tomo I", area: "CONSTITUCIONAL", pages: 992, size: "4.8 MB", url: "https://www.tc.gob.pe/wp-content/uploads/2018/10/Jurisprudencia-relevante-Tomo-I.pdf", source: "Tribunal Constitucional" },
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
    setStatus({ type: "info", message: `Subiendo y procesando "${file.name}"... Esto puede tardar 1-5 minutos.` });
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
      setStatus({ type: "error", message: "Error de conexion. Si el archivo es mayor a 1MB, usa 'Indexar por URL'." });
    } finally {
      setProcessing(false);
    }
  }

  // Index from URL
  async function handleIndexUrl(url, filename, docArea) {
    const finalUrl = url || urlInput;
    const finalFilename = filename || filenameInput || finalUrl.split("/").pop()?.split("?")[0] || "document.pdf";
    const finalArea = docArea || area;

    if (!finalUrl) {
      setStatus({ type: "error", message: "Ingresa una URL." });
      return;
    }

    setProcessing(true);
    setStatus({ type: "info", message: `Descargando e indexando "${finalFilename}"... El servidor descarga el PDF directamente. Puede tardar 2-10 minutos.` });
    try {
      const res = await apiFetch("/api/admin/index-document-url", {
        method: "POST",
        body: JSON.stringify({ url: finalUrl, filename: finalFilename, area: finalArea }),
      });
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: `${res.message || "Indexado correctamente."} (${res.chunks} chunks, ${res.pages} paginas)` });
        setUrlInput("");
        setFilenameInput("");
        loadIndexed();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Error al indexar desde URL." });
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
          <p className="text-sm text-muted-foreground">Documentos indexados en Pinecone para busqueda RAG</p>
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
                Codigos y normas oficiales del Peru. Click en "Indexar" para que el servidor descargue e indexe el PDF directamente.
              </p>
              <div className="space-y-2">
                {SUGGESTED_DOCS.map((doc) => {
                  const isIndexed = indexedFilenames.has(doc.filename);
                  const areaInfo = AREA_MAP[doc.area];
                  return (
                    <div key={doc.filename} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${isIndexed ? "bg-green-500/5 border-green-500/20" : "hover:bg-muted/30"}`}>
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className={`h-5 w-5 ${isIndexed ? "text-green-400" : "text-muted-foreground"}`} />
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
                          disabled={processing}
                          onClick={() => handleIndexUrl(doc.url, doc.filename, doc.area)}
                          className="shrink-0"
                        >
                          {processing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                          Indexar
                        </Button>
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
                  Pega la URL de un PDF. El servidor lo descarga e indexa directamente (sin limite de tamano).
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
                  Sube un PDF directamente. Limite ~1MB por restriccion del servidor. Para archivos grandes usa "Indexar por URL".
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
              <p className="text-xs text-muted-foreground mt-1">Usa la pestana "Documentos sugeridos" para empezar.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredDocs.map((d) => {
                const areaKey = (d.document_type || "general").toUpperCase();
                const areaInfo = AREA_MAP[areaKey];
                return (
                  <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.filename}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {d.total_pages > 0 ? `${d.total_pages} pags` : "? pags"} · {d.chunks_created} chunks
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${areaInfo?.color || ""}`}>
                      {areaInfo?.label || d.document_type}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(d.loaded_at || d.indexed_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold mb-2">Como funciona la indexacion</h3>
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
              <div><p className="font-medium text-foreground">Fragmentacion</p><p>Se divide en chunks de 512 tokens</p></div>
            </div>
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-green-400">4</div>
              <div><p className="font-medium text-foreground">Indexacion</p><p>OpenAI Embeddings + Pinecone</p></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
