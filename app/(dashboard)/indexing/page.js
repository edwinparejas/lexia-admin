"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Database, RefreshCw, Plus } from "lucide-react";
import { apiFetch, getToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AREAS = ["CIVIL", "PENAL", "LABORAL", "CONSTITUCIONAL", "TRIBUTARIO", "GENERAL"];

export default function IndexingPage() {
  const [indexed, setIndexed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [area, setArea] = useState("GENERAL");
  const fileRef = useRef(null);

  async function loadIndexed() {
    setLoading(true);
    try { const d = await apiFetch("/api/admin/indexed-documents"); if (Array.isArray(d)) setIndexed(d); } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadIndexed(); }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !file.name.endsWith(".pdf")) { setStatus("Solo archivos PDF"); return; }
    setUploading(true);
    setStatus("Procesando... puede tardar 1-5 minutos.");
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      form.append("area", area);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/index-document`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      setStatus(res.ok ? data.message : `Error: ${data.error}`);
      if (res.ok) { fileRef.current.value = ""; loadIndexed(); }
    } catch { setStatus("Error de conexion"); }
    finally { setUploading(false); }
  }

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Base Legal</h1><p className="text-sm text-muted-foreground">Indexar documentos legales en Pinecone</p></div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Subir nuevo documento</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">El PDF se parsea con LlamaParse, se fragmenta en chunks de 512 tokens y se indexa en Pinecone con metadata del area legal.</p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground block mb-1">Archivo PDF</label>
              <input ref={fileRef} type="file" accept=".pdf" className="w-full text-sm border rounded-md px-3 py-1.5 bg-background" disabled={uploading} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Area legal</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="h-9 bg-background border rounded-md px-3 text-sm" disabled={uploading}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <Button onClick={handleUpload} disabled={uploading} size="sm">
              {uploading ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Procesando...</> : <><Plus className="h-4 w-4 mr-1" />Indexar</>}
            </Button>
          </div>
          {status && <div className={`text-xs p-3 rounded-md ${status.startsWith("Error") ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-400"}`}>{status}</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Documentos indexados</CardTitle></CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Paginas</TableHead>
              <TableHead>Chunks</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indexed.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-sm">{d.filename}</TableCell>
                <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                <TableCell>{d.total_pages}</TableCell>
                <TableCell>{d.chunks_created}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(d.indexed_at).toLocaleDateString("es-PE")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
