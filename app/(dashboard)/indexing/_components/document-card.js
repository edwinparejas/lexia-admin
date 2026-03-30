"use client";

import { FileText, RotateCcw, History, Trash2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AREA_MAP, STATUS_CONFIG } from "../_lib/constants";

export default function DocumentCard({ doc, onSelect, onReplace, onDelete, onViewPdf }) {
  const areaInfo = AREA_MAP[(doc.document_type || "general").toUpperCase()];
  const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.active;

  return (
    <div
      className="rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onSelect(doc)}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{doc.filename}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {doc.total_pages > 0 ? `${doc.total_pages} páginas` : "? páginas"} · {doc.chunks_created} chunks
            </p>
          </div>
          {doc.current_version > 1 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
              v{doc.current_version}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>
          {areaInfo?.label || doc.document_type}
        </Badge>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
        <span className="text-[10px] text-muted-foreground/50 ml-auto">
          {doc.parse_method || "LlamaParse"}
        </span>
      </div>

      {/* Date + actions bar */}
      <div className="px-4 py-2.5 border-t flex items-center">
        <span className="text-[10px] text-muted-foreground">
          {new Date(doc.updated_at || doc.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        {doc.uploaded_by && (
          <span className="text-[10px] text-muted-foreground/40 ml-2 truncate max-w-[100px]">{doc.uploaded_by}</span>
        )}
        {/* Hover actions */}
        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onViewPdf && (
            <button onClick={(e) => { e.stopPropagation(); onViewPdf(doc); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Ver PDF">
              <Eye className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={(e) => { e.stopPropagation(); onReplace(doc); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Reemplazar">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(doc); }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Eliminar">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
