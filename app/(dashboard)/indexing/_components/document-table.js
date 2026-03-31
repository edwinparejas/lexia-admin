"use client";

import { useState, Fragment } from "react";
import { FileText, RotateCcw, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AREA_MAP, STATUS_CONFIG, COLUMNS, getGDrivePreviewUrl } from "../_lib/constants";
import VersionHistory from "./version-history";

function SortableHead({ field, sortField, sortDir, onSort, align, children }) {
  const isActive = sortField === field;
  return (
    <TableHead
      className={`cursor-pointer hover:text-foreground select-none text-xs ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {isActive ? (
          sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/30" />
        )}
      </div>
    </TableHead>
  );
}

function CellContent({ col, doc }) {
  const area = AREA_MAP[(doc.document_type || "general").toUpperCase()];
  const st = STATUS_CONFIG[doc.status] || STATUS_CONFIG.active;

  switch (col.key) {
    case "filename":
      return (
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate max-w-[250px]">{doc.filename}</p>
          </div>
        </div>
      );
    case "area":
      return <Badge variant="outline" className={`text-[10px] ${area?.color || ""}`}>{area?.label || doc.document_type}</Badge>;
    case "status":
      return (
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          <span className="text-xs">{st.label}</span>
        </div>
      );
    case "total_pages":
      return <span className="text-xs">{doc.total_pages || "—"}</span>;
    case "chunks_created":
      return <span className="text-xs">{doc.chunks_created?.toLocaleString() || "—"}</span>;
    case "parse_method":
      return <span className="text-xs text-muted-foreground">{doc.parse_method || "LlamaParse"}</span>;
    case "current_version":
      return <span className="text-xs font-medium">v{doc.current_version || 1}</span>;
    case "uploaded_by":
      return <span className="text-xs text-muted-foreground truncate max-w-[120px]">{doc.uploaded_by || "—"}</span>;
    case "source_url":
      return doc.source_url ? (
        <a href={doc.source_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : <span className="text-xs text-muted-foreground">—</span>;
    case "updated_at":
      return (
        <span className="text-xs text-muted-foreground">
          {new Date(doc.updated_at || doc.loaded_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      );
    default:
      return null;
  }
}

export default function DocumentTable({
  documents, selectedDoc,
  visibleColumns, sortField, sortDir, onSort,
  onSelect, onReplace, onDelete,
  versions, onLoadVersions,
}) {
  const [expandedRow, setExpandedRow] = useState(null);

  const cols = COLUMNS.filter((c) => visibleColumns[c.key]);

  function handleExpand(e, doc) {
    e.stopPropagation();
    if (expandedRow === doc.id) {
      setExpandedRow(null);
    } else {
      setExpandedRow(doc.id);
      onLoadVersions(doc.id);
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs w-8" />
            {cols.map((col) =>
              col.sortable ? (
                <SortableHead key={col.key} field={col.key} sortField={sortField} sortDir={sortDir} onSort={onSort} align={col.align}>
                  {col.label}
                </SortableHead>
              ) : (
                <TableHead key={col.key} className={`text-xs ${col.align === "right" ? "text-right" : ""}`}>
                  {col.label}
                </TableHead>
              ),
            )}
            <TableHead className="text-xs w-[100px]">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((d) => {
            const isExpanded = expandedRow === d.id;
            const isSelected = selectedDoc?.id === d.id;
            return (
              <Fragment key={d.id}>
                <TableRow
                  className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
                  onClick={() => onSelect(d)}
                >
                  <TableCell className="w-8 px-2">
                    <button onClick={(e) => handleExpand(e, d)} className="p-0.5 rounded hover:bg-muted">
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </button>
                  </TableCell>
                  {cols.map((col) => (
                    <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}>
                      <CellContent col={col} doc={d} />
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); onReplace(d); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Reemplazar">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(d); }} className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500" title="Eliminar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow className="bg-muted/10">
                    <TableCell colSpan={cols.length + 2} className="p-0">
                      <div className="px-10 py-4 border-t border-dashed">
                        <VersionHistory versions={versions[d.id] || []} compact />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
