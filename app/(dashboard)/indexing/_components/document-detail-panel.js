"use client";

import { X, FileText, RotateCcw, Trash2, Eye, ExternalLink, Pencil, HardDrive, Layers, Cpu, Calendar, User, BarChart3, Hash, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AREA_MAP, STATUS_CONFIG, getGDrivePreviewUrl } from "../_lib/constants";
import VersionHistory from "./version-history";

function PropRow({ icon: Icon, label, value, mono = false }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-3 py-2 px-1 group hover:bg-muted/30 rounded-md transition-colors">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className={`text-xs font-medium truncate flex-1 ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

export default function DocumentDetailPanel({
  doc, versions, onClose, onReplace, onDelete, onViewPdf, onEdit,
}) {
  if (!doc) return null;

  const area = AREA_MAP[(doc.document_type || "general").toUpperCase()];
  const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.active;
  const previewUrl = getGDrivePreviewUrl(doc.source_url);

  return (
    <div className="w-[400px] shrink-0 border-l bg-card flex flex-col h-[calc(100vh-64px)] sticky top-0">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate" title={doc.filename}>{doc.filename}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge variant="outline" className={`text-[9px] py-0 ${area?.color || ""}`}>{area?.label}</Badge>
              <span className={`text-[9px] px-1.5 py-0 rounded-full ${st.color}`}>{st.label}</span>
              <span className="text-[9px] px-1.5 py-0 rounded-full bg-primary/10 text-primary font-semibold">v{doc.current_version || 1}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content - Tabs */}
      <Tabs defaultValue="properties" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-3 shrink-0">
          <TabsTrigger value="properties" className="text-xs">Propiedades</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">Vista previa</TabsTrigger>
          <TabsTrigger value="versions" className="text-xs">Versiones ({versions?.length || 0})</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          {/* Properties Tab */}
          <TabsContent value="properties" className="px-4 py-3 space-y-4 mt-0">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">General</p>
              <div className="rounded-lg border p-2">
                <PropRow icon={FileText} label="Nombre" value={doc.filename} />
                <PropRow icon={BarChart3} label="Área legal" value={area?.label || doc.document_type} />
                <PropRow icon={Hash} label="ID" value={doc.id} mono />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Indexación</p>
              <div className="rounded-lg border p-2">
                <PropRow icon={HardDrive} label="Páginas" value={doc.total_pages || "—"} />
                <PropRow icon={Layers} label="Chunks" value={doc.chunks_created?.toLocaleString() || "—"} />
                <PropRow icon={Cpu} label="Método de parseo" value={doc.parse_method || "LlamaParse"} />
                <PropRow icon={BarChart3} label="Versión actual" value={`v${doc.current_version || 1}`} />
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Auditoría</p>
              <div className="rounded-lg border p-2">
                <PropRow icon={Calendar} label="Fecha de carga" value={new Date(doc.loaded_at || doc.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                {doc.updated_at && doc.updated_at !== doc.loaded_at && (
                  <PropRow icon={Calendar} label="Última actualización" value={new Date(doc.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                )}
                <PropRow icon={User} label="Subido por" value={doc.uploaded_by || "Sistema"} />
              </div>
            </div>

            {doc.source_url && (
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Origen</p>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {doc.source_url.includes("drive.google.com") ? "Google Drive" : "URL externa"}
                    </span>
                  </div>
                  <a href={doc.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-primary hover:underline break-all">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {doc.source_url}
                  </a>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="px-4 py-3 mt-0">
            {previewUrl ? (
              <div className="space-y-2">
                <div className="rounded-lg border overflow-hidden bg-muted" style={{ height: 500 }}>
                  <iframe src={previewUrl} className="w-full h-full" title={doc.filename} />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => onViewPdf(doc)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Abrir en pantalla completa
                </Button>
              </div>
            ) : (
              <div className="text-center py-10">
                <Eye className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Vista previa no disponible</p>
                <p className="text-[10px] text-muted-foreground/50 mt-1">Solo disponible para documentos con URL de origen</p>
              </div>
            )}
          </TabsContent>

          {/* Versions Tab */}
          <TabsContent value="versions" className="px-4 py-3 mt-0">
            <VersionHistory versions={versions || []} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Actions Footer */}
      <div className="p-3 border-t flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onEdit(doc)}>
          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
        </Button>
        <Button variant="outline" size="sm" onClick={() => onReplace(doc)}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reemplazar
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDelete(doc)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
