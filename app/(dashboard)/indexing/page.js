"use client";

import { useState, useEffect, useMemo } from "react";
import { RefreshCw, FileText, Layers, HardDrive, Scale, Database, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDocuments } from "./_hooks/use-documents";
import { AREA_MAP } from "./_lib/constants";
import DocumentToolbar from "./_components/document-toolbar";
import DocumentCard from "./_components/document-card";
import DocumentTable from "./_components/document-table";
import DocumentDetailPanel from "./_components/document-detail-panel";
import PdfViewerModal from "./_components/pdf-viewer-modal";
import UploadPanel from "./_components/upload-panel";

function StatusBar({ status }) {
  if (!status) return null;
  const styles = {
    error: "bg-red-500/10 border-red-500/20 text-red-400",
    success: "bg-green-500/10 border-green-500/20 text-green-400",
    info: "bg-blue-500/10 border-blue-500/20 text-blue-400",
  };
  const icons = { error: AlertCircle, success: CheckCircle2, info: Clock };
  const Icon = icons[status.type] || AlertCircle;
  return (
    <div className={`flex items-center gap-2.5 text-sm p-3.5 rounded-lg border ${styles[status.type]}`}>
      <Icon className={`h-4 w-4 shrink-0 ${status.type === "info" ? "animate-pulse" : ""}`} />
      <span>{status.message}</span>
    </div>
  );
}

export default function IndexingPage() {
  const {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
  } = useDocuments();

  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [sortField, setSortField] = useState("updated_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [pdfViewDoc, setPdfViewDoc] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [pypdfConfirm, setPypdfConfirm] = useState(null);
  const [docVersions, setDocVersions] = useState({});

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // Filter & sort
  const activeDocs = useMemo(() => documents.filter((d) => d.status !== "archived"), [documents]);
  const filteredDocs = useMemo(() => {
    let result = activeDocs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.filename.toLowerCase().includes(q));
    }
    if (filterArea !== "ALL") {
      result = result.filter((d) => (d.document_type || "").toUpperCase() === filterArea);
    }
    if (filterStatus !== "ALL") {
      result = result.filter((d) => d.status === filterStatus);
    }
    result.sort((a, b) => {
      let va = a[sortField], vb = b[sortField];
      if (sortField === "updated_at" || sortField === "loaded_at") {
        va = new Date(va || a.loaded_at || 0).getTime();
        vb = new Date(vb || b.loaded_at || 0).getTime();
      }
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [activeDocs, searchQuery, filterArea, filterStatus, sortField, sortDir]);

  // Stats
  const totalChunks = activeDocs.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = activeDocs.reduce((s, d) => s + (d.total_pages || 0), 0);
  const areaCount = {};
  activeDocs.forEach((d) => { const k = (d.document_type || "general").toUpperCase(); areaCount[k] = (areaCount[k] || 0) + 1; });
  const indexedFilenames = new Set(activeDocs.map((d) => d.filename));

  // Handlers
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

  async function handleLoadVersions(docId) {
    const vers = await loadVersions(docId);
    setDocVersions((prev) => ({ ...prev, [docId]: vers }));
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Base Legal</h1>
          <p className="text-sm text-muted-foreground">Gestión de documentos legales indexados en Pinecone</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDocuments} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: FileText, color: "text-blue-400", value: activeDocs.length, label: "Documentos" },
          { icon: Layers, color: "text-purple-400", value: totalChunks.toLocaleString(), label: "Chunks" },
          { icon: HardDrive, color: "text-green-400", value: totalPages.toLocaleString(), label: "Páginas" },
          { icon: Scale, color: "text-amber-400", value: Object.keys(areaCount).length, label: "Áreas" },
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

      {/* Toolbar */}
      <DocumentToolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterArea={filterArea}
        onFilterAreaChange={setFilterArea}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        onUploadClick={() => setShowUpload(true)}
        documentCount={activeDocs.length}
      />

      {/* Document list */}
      {loading ? (
        <div className="text-center py-16">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando documentos...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16">
          <Database className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">{activeDocs.length === 0 ? "Sin documentos indexados" : "Sin resultados"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeDocs.length === 0 ? "Sube tu primer documento legal para empezar." : "Prueba con otros filtros."}
          </p>
          {activeDocs.length === 0 && (
            <Button size="sm" className="mt-3" onClick={() => setShowUpload(true)}>Subir documento</Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredDocs.map((d) => (
            <DocumentCard
              key={d.id}
              doc={d}
              onSelect={setSelectedDoc}
              onReplace={(doc) => { setReplaceDoc(doc); setReplaceUrl(""); }}
              onDelete={setDeleteConfirm}
              onViewPdf={setPdfViewDoc}
            />
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={filteredDocs}
          onSelect={setSelectedDoc}
          onReplace={(doc) => { setReplaceDoc(doc); setReplaceUrl(""); }}
          onDelete={setDeleteConfirm}
          onViewPdf={setPdfViewDoc}
          sortField={sortField}
          sortDir={sortDir}
          onSort={(field, dir) => { setSortField(field); setSortDir(dir); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Eliminar "{deleteConfirm.filename}"</p>
            <p className="text-xs text-muted-foreground mt-2">Se eliminarán todos los vectores de Pinecone. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleDelete} disabled={processing}>
                {processing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
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
            <p className="text-xs text-muted-foreground mt-1">v{replaceDoc.current_version || 1} → v{(replaceDoc.current_version || 1) + 1}. Los vectores antiguos se eliminarán.</p>
            <div className="mt-3">
              <input type="url" value={replaceUrl} onChange={(e) => setReplaceUrl(e.target.value)} placeholder="URL del PDF actualizado" className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none" disabled={processing} />
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setReplaceDoc(null); setReplaceUrl(""); }}>Cancelar</Button>
              <Button size="sm" onClick={handleReplace} disabled={processing || !replaceUrl}>
                {processing ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Reemplazar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      <DocumentDetailPanel
        doc={selectedDoc}
        versions={docVersions[selectedDoc?.id] || []}
        onClose={() => setSelectedDoc(null)}
        onReplace={(doc) => { setSelectedDoc(null); setReplaceDoc(doc); setReplaceUrl(""); }}
        onDelete={(doc) => { setSelectedDoc(null); setDeleteConfirm(doc); }}
        onViewPdf={setPdfViewDoc}
        onLoadVersions={handleLoadVersions}
      />

      {/* PDF Viewer modal */}
      <PdfViewerModal doc={pdfViewDoc} onClose={() => setPdfViewDoc(null)} />

      {/* Upload panel */}
      {showUpload && (
        <UploadPanel
          onClose={() => { setShowUpload(false); setPypdfConfirm(null); }}
          processing={processing}
          onIndexUrl={async (url, fn, area) => {
            const res = await indexFromUrl(url, fn, area);
            if (res?.status === "confirm_pypdf") setPypdfConfirm({ ...res, url, filename: fn, area });
            else setShowUpload(false);
          }}
          onUploadFile={async (file, area) => {
            await uploadFile(file, area);
          }}
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

      {/* Overlay when detail panel is open (click to close) */}
      {selectedDoc && (
        <div className="fixed inset-0 z-30 bg-black/20" onClick={() => setSelectedDoc(null)} />
      )}
    </div>
  );
}
