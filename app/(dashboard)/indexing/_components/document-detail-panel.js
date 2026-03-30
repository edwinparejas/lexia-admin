"use client";

import { useState, useEffect } from "react";
import { X, FileText, RotateCcw, Trash2, Eye, ExternalLink, Clock, User, Layers, HardDrive, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AREA_MAP, STATUS_CONFIG, getGDrivePreviewUrl } from "../_lib/constants";

function MetaRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-xs font-medium truncate">{value}</span>
    </div>
  );
}

export default function DocumentDetailPanel({ doc, versions, onClose, onReplace, onDelete, onViewPdf, onLoadVersions }) {
  const [showInlinePdf, setShowInlinePdf] = useState(false);

  useEffect(() => {
    if (doc) onLoadVersions?.(doc.id);
  }, [doc?.id]);

  if (!doc) return null;

  const areaInfo = AREA_MAP[(doc.document_type || "general").toUpperCase()];
  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.active;
  const previewUrl = getGDrivePreviewUrl(doc.source_url);

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] bg-background border-l shadow-xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{doc.filename}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={`text-[9px] ${areaInfo?.color || ""}`}>
              {areaInfo?.label || doc.document_type}
            </Badge>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            {doc.current_version > 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">v{doc.current_version}</span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metadata */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Información</p>
          <div className="rounded-lg border p-3 space-y-0.5">
            <MetaRow icon={HardDrive} label="Páginas" value={doc.total_pages || "—"} />
            <MetaRow icon={Layers} label="Chunks" value={doc.chunks_created || "—"} />
            <MetaRow icon={Cpu} label="Método" value={doc.parse_method || "LlamaParse"} />
            <MetaRow icon={Clock} label="Cargado" value={new Date(doc.loaded_at || doc.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
            {doc.updated_at && doc.updated_at !== doc.loaded_at && (
              <MetaRow icon={Clock} label="Actualizado" value={new Date(doc.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
            )}
            <MetaRow icon={User} label="Subido por" value={doc.uploaded_by || "—"} />
          </div>
        </div>

        {/* Source URL */}
        {doc.source_url && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fuente</p>
            <a
              href={doc.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline truncate"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {doc.source_url.length > 50 ? doc.source_url.slice(0, 50) + "..." : doc.source_url}
            </a>
          </div>
        )}

        {/* PDF Viewer inline */}
        {previewUrl && (
          <div>
            <button
              onClick={() => setShowInlinePdf(!showInlinePdf)}
              className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 hover:text-foreground"
            >
              <Eye className="h-3 w-3" />
              {showInlinePdf ? "Ocultar vista previa" : "Vista previa del PDF"}
            </button>
            {showInlinePdf && (
              <div className="rounded-lg border overflow-hidden bg-muted" style={{ height: 350 }}>
                <iframe src={previewUrl} className="w-full h-full" title={doc.filename} />
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Version History */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Historial de versiones</p>
          {!versions || versions.length === 0 ? (
            <p className="text-xs text-muted-foreground/50">Cargando versiones...</p>
          ) : (
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
              {versions.map((v, i) => (
                <div key={v.id} className="relative mb-3 last:mb-0">
                  {/* Dot */}
                  <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-background ${v.status === "active" ? "bg-green-500" : "bg-zinc-400"}`} />
                  <div className="ml-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${v.status === "active" ? "text-green-500" : "text-muted-foreground"}`}>
                        v{v.version}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {v.total_pages} págs · {v.chunks_created} chunks · {v.parse_method}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(v.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {v.uploaded_by && (
                        <span className="text-[10px] text-muted-foreground/40">{v.uploaded_by}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions footer */}
      <div className="p-4 border-t flex items-center gap-2">
        {previewUrl && (
          <Button variant="outline" size="sm" onClick={() => onViewPdf(doc)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            PDF completo
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onReplace(doc)}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Reemplazar
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => onDelete(doc)}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
