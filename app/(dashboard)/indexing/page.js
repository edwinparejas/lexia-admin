"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw, FileText, Layers, HardDrive, Scale, FolderOpen,
  Upload, X, RotateCcw, AlertCircle, CheckCircle2, Clock, Eye, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useDocuments } from "./_hooks/use-documents";
import { useTableState } from "./_hooks/use-table-state";
import { AREAS, AREA_MAP, STATUS_CONFIG, getGDrivePreviewUrl } from "./_lib/constants";
import DocumentToolbar from "./_components/document-toolbar";
import DocumentTable from "./_components/document-table";
import DocumentDetailPanel from "./_components/document-detail-panel";
import UploadPanel from "./_components/upload-panel";
import EditDocumentModal from "./_components/edit-document-modal";

export default function IndexingPage() {
  const {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
    loadTemplates, checkHash, updateDocumentMeta,
  } = useDocuments();

  const table = useTableState(documents);

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docVersions, setDocVersions] = useState({});
  const [viewMode, setViewMode] = useState("table");
  const [showUpload, setShowUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [replaceDoc, setReplaceDoc] = useState(null);
  const [replaceUrl, setReplaceUrl] = useState("");
  const [pdfViewDoc, setPdfViewDoc] = useState(null);
  const [pypdfConfirm, setPypdfConfirm] = useState(null);
  const [editDoc, setEditDoc] = useState(null);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

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
    const r = await replaceDocument(replaceDoc.id, replaceUrl);
    if (r?.status === "confirm_pypdf") {
      setPypdfConfirm({ ...r, docId: replaceDoc.id, url: replaceUrl });
    } else {
      setReplaceDoc(null);
      setReplaceUrl("");
    }
  }

  // Area counts for sidebar
  const areaCount = {};
  table.activeDocs.forEach((d) => {
    const k = (d.document_type || "general").toUpperCase();
    areaCount[k] = (areaCount[k] || 0) + 1;
  });
  const totalChunks = table.activeDocs.reduce((s, d) => s + (d.chunks_created || 0), 0);
  const totalPages = table.activeDocs.reduce((s, d) => s + (d.total_pages || 0), 0);
  const indexedFilenames = new Set(table.activeDocs.map((d) => d.filename));

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* ===== LEFT: SIDEBAR ===== */}
      <div className="w-56 shrink-0 p-4 border-r overflow-y-auto">
        <div className="space-y-5">
          {/* Areas */}
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Áreas Legales</p>
            <div className="space-y-0.5">
              <button onClick={() => table.setSelectedArea("ALL")} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${table.selectedArea === "ALL" ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
                <FolderOpen className="h-4 w-4" /><span className="flex-1 text-left">Todos</span><span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{table.activeDocs.length}</span>
              </button>
              {AREAS.filter((a) => areaCount[a.value]).map((a) => (
                <button key={a.value} onClick={() => table.setSelectedArea(table.selectedArea === a.value ? "ALL" : a.value)} className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] transition-colors ${table.selectedArea === a.value ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted"}`}>
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
              { icon: FileText, label: "Documentos", value: table.activeDocs.length, color: "text-blue-400" },
              { icon: Layers, label: "Chunks", value: totalChunks.toLocaleString(), color: "text-purple-400" },
              { icon: HardDrive, label: "Páginas", value: totalPages.toLocaleString(), color: "text-green-400" },
              { icon: Scale, label: "Áreas", value: Object.keys(areaCount).length, color: "text-amber-400" },
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

          <Link href="/indexing/templates" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-foreground/70 hover:bg-muted transition-colors">
            <BookOpen className="h-4 w-4" /> Gestionar plantillas
          </Link>
        </div>
      </div>

      {/* ===== CENTER: TABLE ===== */}
      <div className="flex-1 min-w-0 p-4 overflow-y-auto">
        {/* Status message */}
        {status && (
          <div className={`mb-4 flex items-center gap-2 text-sm p-3 rounded-lg border ${status.type === "error" ? "bg-red-500/10 border-red-500/20 text-red-400" : status.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
            {status.type === "info" ? <Clock className="h-4 w-4 animate-pulse" /> : status.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <span className="flex-1">{status.message}</span>
            <button onClick={() => setStatus(null)}><X className="h-3 w-3" /></button>
          </div>
        )}

        <DocumentToolbar
          searchQuery={table.searchQuery}
          onSearch={table.setSearchQuery}
          selectedStatus={table.selectedStatus}
          onStatusChange={table.setSelectedStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          visibleColumns={table.visibleColumns}
          onToggleColumn={table.toggleColumn}
          page={table.page}
          totalPages={table.totalPages}
          totalFiltered={table.totalFiltered}
          pageSize={table.pageSize}
          onPageChange={table.setPage}
          onPageSizeChange={table.setPageSize}
          pageSizes={table.PAGE_SIZES}
          onRefresh={loadDocuments}
          loading={loading}
          onUpload={() => setShowUpload(true)}
        />

        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
          </div>
        ) : table.paginated.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Sin documentos</p>
            <p className="text-xs text-muted-foreground mt-1">Sube tu primer documento legal</p>
            <Button size="sm" className="mt-3" onClick={() => setShowUpload(true)}>Subir documento</Button>
          </div>
        ) : viewMode === "table" ? (
          <DocumentTable
            documents={table.paginated}
            selectedDoc={selectedDoc}
            visibleColumns={table.visibleColumns}
            sortField={table.sortField}
            sortDir={table.sortDir}
            onSort={table.handleSort}
            onSelect={handleSelectDoc}
            onReplace={(d) => { setReplaceDoc(d); setReplaceUrl(""); }}
            onDelete={setDeleteConfirm}
            versions={docVersions}
            onLoadVersions={handleLoadVersions}
          />
        ) : (
          /* Grid view - simplified cards */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {table.paginated.map((d) => {
              const area = AREA_MAP[(d.document_type || "general").toUpperCase()];
              const st = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
              const isSel = selectedDoc?.id === d.id;
              return (
                <div key={d.id} onClick={() => handleSelectDoc(d)} className={`rounded-xl border bg-card cursor-pointer group transition-all hover:shadow-md ${isSel ? "ring-2 ring-primary border-primary/30 shadow-md" : "hover:border-primary/20"}`}>
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
                  <div className="px-4 py-2.5 border-t flex items-center text-[10px] text-muted-foreground">
                    <span>{d.parse_method || "LlamaParse"}</span>
                    <span className="mx-2">·</span>
                    <span>{new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    {d.uploaded_by && <><span className="mx-2">·</span><span className="truncate max-w-[80px]">{d.uploaded_by}</span></>}
                    <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setReplaceDoc(d); setReplaceUrl(""); }} className="p-1 rounded hover:bg-muted" title="Reemplazar"><RotateCcw className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== RIGHT: DETAIL PANEL ===== */}
      {selectedDoc && (
        <DocumentDetailPanel
          doc={selectedDoc}
          versions={docVersions[selectedDoc.id] || []}
          onClose={() => setSelectedDoc(null)}
          onReplace={(d) => { setReplaceDoc(d); setReplaceUrl(""); }}
          onDelete={setDeleteConfirm}
          onViewPdf={setPdfViewDoc}
          onEdit={setEditDoc}
        />
      )}

      {/* ===== MODALS ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-background rounded-xl border p-6 max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold">Eliminar "{deleteConfirm.filename}"</p>
            <p className="text-xs text-muted-foreground mt-2">Se eliminarán todos los vectores de Pinecone. Esta acción no se puede deshacer.</p>
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
              <a href={pdfViewDoc.source_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5 mr-1.5" /> Original</Button></a>
              <button onClick={() => setPdfViewDoc(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-2" onClick={(e) => e.stopPropagation()}>
              <iframe src={url} className="w-full h-full rounded-lg" title={pdfViewDoc.filename} />
            </div>
          </div>
        );
      })()}

      {editDoc && (
        <EditDocumentModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={async (docId, updates) => {
            await updateDocumentMeta(docId, updates);
            setEditDoc(null);
          }}
          processing={processing}
        />
      )}

      {showUpload && (
        <UploadPanel
          onClose={() => { setShowUpload(false); setPypdfConfirm(null); }}
          processing={processing}
          onIndexUrl={async (url, fn, area) => {
            const r = await indexFromUrl(url, fn, area);
            if (r?.status === "confirm_pypdf") setPypdfConfirm({ ...r, url, filename: fn, area });
            else { setShowUpload(false); setPypdfConfirm(null); }
          }}
          onUploadFile={async (file, area) => { await uploadFile(file, area); }}
          indexedFilenames={indexedFilenames}
          pypdfConfirm={pypdfConfirm}
          onPypdfConfirm={async () => { await indexFromUrl(pypdfConfirm.url, pypdfConfirm.filename, pypdfConfirm.area, true); setPypdfConfirm(null); setShowUpload(false); }}
          onPypdfCancel={() => setPypdfConfirm(null)}
          loadTemplates={loadTemplates}
          checkHash={checkHash}
        />
      )}
    </div>
  );
}
