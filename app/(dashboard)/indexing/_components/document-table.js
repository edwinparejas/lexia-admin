"use client";

import { FileText, RotateCcw, Trash2, Eye, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AREA_MAP, STATUS_CONFIG } from "../_lib/constants";

export default function DocumentTable({ documents, onSelect, onReplace, onDelete, onViewPdf, sortField, sortDir, onSort }) {
  function SortHead({ field, children }) {
    const isActive = sortField === field;
    return (
      <TableHead
        className="cursor-pointer hover:text-foreground select-none text-xs"
        onClick={() => onSort(field, isActive && sortDir === "asc" ? "desc" : "asc")}
      >
        <div className="flex items-center gap-1">
          {children}
          {isActive && <ArrowUpDown className="h-3 w-3 text-primary" />}
        </div>
      </TableHead>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <SortHead field="filename">Documento</SortHead>
            <TableHead className="text-xs">Área</TableHead>
            <TableHead className="text-xs">Estado</TableHead>
            <SortHead field="total_pages">Págs</SortHead>
            <SortHead field="chunks_created">Chunks</SortHead>
            <TableHead className="text-xs">Método</TableHead>
            <TableHead className="text-xs">Versión</TableHead>
            <SortHead field="updated_at">Actualizado</SortHead>
            <TableHead className="text-xs w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((d) => {
            const areaInfo = AREA_MAP[(d.document_type || "general").toUpperCase()];
            const statusCfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.active;
            return (
              <TableRow
                key={d.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => onSelect(d)}
              >
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{d.filename}</p>
                      {d.uploaded_by && <p className="text-[10px] text-muted-foreground/40">{d.uploaded_by}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${areaInfo?.color || ""}`}>
                    {areaInfo?.label || d.document_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    <span className="text-xs">{statusCfg.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs">{d.total_pages || "—"}</TableCell>
                <TableCell className="text-xs">{d.chunks_created || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{d.parse_method || "LlamaParse"}</TableCell>
                <TableCell>
                  <span className="text-xs font-medium">v{d.current_version || 1}</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(d.updated_at || d.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5">
                    {onViewPdf && (
                      <button onClick={(e) => { e.stopPropagation(); onViewPdf(d); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onReplace(d); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(d); }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
