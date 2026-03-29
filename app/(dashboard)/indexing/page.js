"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Upload, Database, RefreshCw, Plus, FileText, Scale, HardDrive, Layers, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { apiFetch, getToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AREAS = [
  { value: "CIVIL", label: "Civil", desc: "Código Civil, obligaciones, contratos, familia" },
  { value: "PENAL", label: "Penal", desc: "Código Penal, delitos, penas, proceso penal" },
  { value: "LABORAL", label: "Laboral", desc: "Trabajo, despido, beneficios sociales, CTS" },
  { value: "CONSTITUCIONAL", label: "Constitucional", desc: "Constitución, TC, derechos fundamentales" },
  { value: "TRIBUTARIO", label: "Tributario", desc: "SUNAT, impuestos, código tributario" },
  { value: "GENERAL", label: "General", desc: "Otras normas y legislación" },
];

const AREA_COLORS = {
  CIVIL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  PENAL: "bg-red-500/10 text-red-400 border-red-500/20",
  LABORAL: "bg-green-500/10 text-green-400 border-green-500/20",
  CONSTITUCIONAL: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TRIBUTARIO: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  GENERAL: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function IndexingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [indexed, setIndexed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: "success"|"error"|"info", message }
  const area = searchParams.get("area") || "GENERAL";
  const setArea = (value) => router.replace(`${pathname}?area=${value}`, { scroll: false });
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef(null);

  async function loadIndexed() {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/indexed-documents");
      if (Array.isArray(d)) setIndexed(d);
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadIndexed(); }, []);

  async function handleUpload(file) {
    if (!file) {
      file = fileRef.current?.files?.[0];
    }
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ type: "error", message: "Solo se aceptan archivos PDF." });
      return;
    }
    setUploading(true);
    setStatus({ type: "info", message: `Procesando "${file.name}"... Esto puede tardar 1-5 minutos según el tamaño del documento.` });
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
        setStatus({ type: "success", message: data.message || `"${file.name}" indexado correctamente.` });
        if (fileRef.current) fileRef.current.value = "";
        loadIndexed();
      } else {
        setStatus({ type: "error", message: data.error || "Error al procesar el documento." });
      }
    } catch {
      setStatus({ type: "error", message: "Error de conexión con el servidor." });
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  }

  // Stats
  const totalChunks = indexed.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = indexed.reduce((s, d) => s + (d.total_pages || 0), 0);
  const areaCount = {};
  indexed.forEach((d) => { areaCount[d.document_type] = (areaCount[d.document_type] || 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Base Legal</h1>
          <p className="text-sm text-muted-foreground">Gestiona los documentos legales indexados en Pinecone para búsqueda RAG</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadIndexed} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{indexed.length}</p>
                <p className="text-xs text-muted-foreground">Documentos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{totalChunks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Chunks en Pinecone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{totalPages.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Páginas procesadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-amber-400" />
              <div>
                <p className="text-2xl font-bold">{Object.keys(areaCount).length}</p>
                <p className="text-xs text-muted-foreground">Áreas cubiertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Indexar nuevo documento
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            El PDF se parsea con LlamaParse, se fragmenta en chunks de 512 tokens y se indexa en Pinecone con metadata del área legal.
            Cada chunk queda disponible para búsqueda RAG inmediatamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/50"
            }`}
          >
            <Upload className={`h-8 w-8 mx-auto mb-3 ${dragActive ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-sm font-medium mb-1">Arrastra un archivo PDF aquí</p>
            <p className="text-xs text-muted-foreground mb-3">o selecciona uno manualmente</p>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }} disabled={uploading} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              Seleccionar archivo
            </Button>
          </div>

          {/* Area selector */}
          <div>
            <label className="text-xs font-medium block mb-2">Área legal del documento</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setArea(a.value)}
                  disabled={uploading}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    area === a.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <p className="text-sm font-medium">{a.label}</p>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Upload button */}
          <Button onClick={() => handleUpload()} disabled={uploading} className="w-auto">
            {uploading ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Procesando...</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" />Indexar documento</>
            )}
          </Button>

          {/* Status message */}
          {status && (
            <div className={`flex items-start gap-2 text-xs p-3 rounded-lg ${
              status.type === "error" ? "bg-destructive/10 text-destructive" :
              status.type === "success" ? "bg-green-500/10 text-green-400" :
              "bg-blue-500/10 text-blue-400"
            }`}>
              {status.type === "error" ? <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> :
               status.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> :
               <Clock className="h-4 w-4 shrink-0 mt-0.5 animate-pulse" />}
              <span>{status.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indexed documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Database className="h-4 w-4" />
              Documentos indexados
            </CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(areaCount).map(([a, count]) => (
                <Badge key={a} variant="outline" className={`text-[10px] ${AREA_COLORS[a] || ""}`}>
                  {a} ({count})
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Cargando documentos...</p>
            </div>
          ) : indexed.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Database className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Sin documentos indexados</p>
              <p className="text-xs text-muted-foreground mt-1">Sube un PDF para comenzar a construir la base legal.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {indexed.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{d.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {d.total_pages} páginas · {d.chunks_created} chunks
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${AREA_COLORS[d.document_type] || ""}`}>
                    {d.document_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(d.indexed_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
