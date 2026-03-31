"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Link2, Globe, RefreshCw, X, FileText, BookOpen, ExternalLink, ChevronDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AREAS, AREA_MAP } from "../_lib/constants";

function AreaSelector({ value, onChange, disabled }) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
      {AREAS.map((a) => (
        <button
          key={a.value}
          onClick={() => onChange(a.value)}
          disabled={disabled}
          className={`rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all ${
            value === a.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border hover:bg-muted/50 text-muted-foreground"
          } disabled:opacity-50`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export default function UploadPanel({
  onClose, processing, onIndexUrl, onUploadFile, indexedFilenames,
  pypdfConfirm, onPypdfConfirm, onPypdfCancel,
  loadTemplates, checkHash,
}) {
  const [area, setArea] = useState("GENERAL");
  const [urlInput, setUrlInput] = useState("");
  const [filenameInput, setFilenameInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [editedUrls, setEditedUrls] = useState({});
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [hashResults, setHashResults] = useState({});
  const [checkingHash, setCheckingHash] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (loadTemplates) {
      loadTemplates().then((t) => { setTemplates(t); setLoadingTemplates(false); });
    } else {
      setLoadingTemplates(false);
    }
  }, [loadTemplates]);

  function handleFiles(fileList) {
    const pdfs = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (pdfs.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...pdfs]);

    // Check hash for each file
    if (checkHash) {
      pdfs.forEach((file, i) => {
        const idx = selectedFiles.length + i;
        setCheckingHash((prev) => ({ ...prev, [idx]: true }));
        checkHash(file).then((result) => {
          setHashResults((prev) => ({ ...prev, [idx]: result }));
          setCheckingHash((prev) => ({ ...prev, [idx]: false }));
        });
      });
    }
  }

  async function handleUploadAll() {
    for (const file of selectedFiles) {
      await onUploadFile(file, area);
    }
    setSelectedFiles([]);
    setHashResults({});
  }

  const activeTemplates = templates.filter((t) => t.is_active !== false);

  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-xl border shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-sm font-bold">Subir documentos legales</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* PyPDF Confirmation */}
        {pypdfConfirm && (
          <div className="mx-5 mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-2">
            <p className="text-sm font-medium">LlamaParse no pudo extraer texto</p>
            <p className="text-xs text-muted-foreground">{pypdfConfirm.message}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={onPypdfConfirm} disabled={processing}>Continuar con PyPDF</Button>
              <Button size="sm" variant="outline" onClick={onPypdfCancel}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="p-5">
          <Tabs defaultValue="url">
            <TabsList className="mb-4">
              <TabsTrigger value="url"><Link2 className="h-3.5 w-3.5 mr-1.5" /> Por URL</TabsTrigger>
              <TabsTrigger value="upload"><Upload className="h-3.5 w-3.5 mr-1.5" /> Subir archivo</TabsTrigger>
              <TabsTrigger value="templates"><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Plantillas ({activeTemplates.length})</TabsTrigger>
            </TabsList>

            {/* URL */}
            <TabsContent value="url">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5">URL del PDF</label>
                  <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://ejemplo.com/documento.pdf" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" disabled={processing} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Nombre (opcional)</label>
                  <input type="text" value={filenameInput} onChange={(e) => setFilenameInput(e.target.value)} placeholder="codigo_laboral.pdf" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" disabled={processing} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Área legal</label>
                  <AreaSelector value={area} onChange={setArea} disabled={processing} />
                </div>
                <Button onClick={() => { onIndexUrl(urlInput, filenameInput || urlInput.split("/").pop()?.split("?")[0] || "document.pdf", area); setUrlInput(""); setFilenameInput(""); }} disabled={processing || !urlInput}>
                  {processing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando...</> : <><Link2 className="h-4 w-4 mr-2" /> Indexar desde URL</>}
                </Button>
              </div>
            </TabsContent>

            {/* Upload */}
            <TabsContent value="upload">
              <div className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
                >
                  <Upload className={`h-7 w-7 mx-auto mb-2 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium mb-1">Arrastra PDFs aquí</p>
                  <p className="text-xs text-muted-foreground mb-2">Puedes subir múltiples archivos</p>
                  <input ref={fileRef} type="file" accept=".pdf" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>Seleccionar archivos</Button>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((f, i) => {
                      const hash = hashResults[i];
                      const checking = checkingHash[i];
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg border ${hash?.exists ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{f.name}</p>
                            <p className="text-[10px] text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
                            {checking && <p className="text-[10px] text-blue-400">Verificando hash...</p>}
                            {hash?.exists && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                <p className="text-[10px] text-amber-500">{hash.message}</p>
                              </div>
                            )}
                          </div>
                          <button onClick={() => {
                            setSelectedFiles((prev) => prev.filter((_, j) => j !== i));
                            setHashResults((prev) => { const n = { ...prev }; delete n[i]; return n; });
                          }} className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-500">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Área legal (para todos)</label>
                      <AreaSelector value={area} onChange={setArea} disabled={processing} />
                    </div>
                    <Button onClick={handleUploadAll} disabled={processing}>
                      {processing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Procesando...</> : <><Upload className="h-4 w-4 mr-2" /> Subir {selectedFiles.length} archivo{selectedFiles.length > 1 ? "s" : ""}</>}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates">
              {loadingTemplates ? (
                <div className="text-center py-10">
                  <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Cargando plantillas...</p>
                </div>
              ) : activeTemplates.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No hay plantillas configuradas</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">Ve a la sección de plantillas para agregar documentos base</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeTemplates.map((doc) => {
                    const isIndexed = indexedFilenames.has(doc.filename);
                    const areaInfo = AREA_MAP[doc.area];
                    const currentUrl = editedUrls[doc.id] !== undefined ? editedUrls[doc.id] : doc.url;
                    const isExpanded = expandedDoc === doc.id;
                    return (
                      <div key={doc.id} className={`rounded-lg border transition-colors ${isIndexed ? "bg-green-500/5 border-green-500/20" : "hover:bg-muted/20"}`}>
                        <div className="flex items-center gap-3 p-3">
                          <FileText className={`h-4 w-4 ${isIndexed ? "text-green-400" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{doc.label}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {doc.expected_pages ? `${doc.expected_pages} págs` : ""} {doc.expected_size ? `· ${doc.expected_size}` : ""}
                              {doc.source ? ` · ${doc.source}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>{doc.area}</Badge>
                          {isIndexed ? (
                            <Badge className="bg-green-500/10 text-green-400 text-[10px]">Indexado</Badge>
                          ) : (
                            <Button size="sm" variant="outline" disabled={processing || !currentUrl} onClick={() => onIndexUrl(currentUrl, doc.filename, doc.area)}>
                              {processing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5 mr-1" />}
                              Indexar
                            </Button>
                          )}
                          <button onClick={() => setExpandedDoc(isExpanded ? null : doc.id)} className="p-1 hover:bg-muted rounded">
                            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t mx-3 pt-2">
                            <div className="flex gap-2">
                              <input type="url" value={currentUrl} onChange={(e) => setEditedUrls({ ...editedUrls, [doc.id]: e.target.value })} className="flex-1 px-2.5 py-1.5 bg-muted border rounded-md text-xs font-mono focus:border-primary focus:outline-none" />
                              {currentUrl && <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="px-2 py-1.5 text-xs text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Abrir</a>}
                            </div>
                            {doc.description && <p className="text-[10px] text-muted-foreground mt-1.5">{doc.description}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
