# Gestor Documental Profesional - Plan de Implementación

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la página de indexación de documentos legales en un gestor documental profesional con tabla avanzada, panel de propiedades, historial de versiones, sistema de plantillas, y upload inteligente con hash comparison.

**Architecture:** Layout de 3 paneles (sidebar izq, tabla central, detalle derecho). La tabla central es el componente principal con sort, filtros, paginación y columnas configurables. El panel derecho es un drawer que muestra propiedades, preview PDF, historial de versiones, y acciones. El upload se hace desde un modal con múltiples fuentes (URL, archivo, drag&drop, plantillas). Las plantillas se administran en una sub-página dedicada.

**Tech Stack:** Next.js 16, React 19, shadcn/ui (base-ui), Tailwind CSS 4, Lucide icons, recharts. Backend: FastAPI + Supabase + Pinecone.

---

## Análisis del Estado Actual

### Lo que YA existe y funciona:
- **Backend completo:** CRUD de documentos, versionamiento, indexación con LlamaParse/PyPDF, upload por archivo y URL, replace, delete, versiones
- **Frontend parcial:** Vista grid/tabla básica, panel de detalle inline, upload modal con tabs (sugeridos/URL/archivo), preview PDF, historial de versiones
- **Componentes extraídos pero NO usados:** `document-table.js` (con sort), `document-detail-panel.js` (como drawer), `pdf-viewer-modal.js`, `document-card.js`, `document-toolbar.js`
- **Hook `useDocuments`:** loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions

### Lo que FALTA (features solicitados):
1. **Tabla profesional:** Sort por columnas, filtros combinados, paginación, columnas configurables (mostrar/ocultar)
2. **Panel de propiedades tipo Windows Explorer:** Drawer derecho con toda la metadata, como "click derecho > propiedades"
3. **Preview/Modal de archivo:** Preview inline toggleable + abrir en modal fullscreen
4. **Historial de versiones expandible:** En la lista principal, expandir fila para ver últimas 10 versiones
5. **Upload inteligente:** Hash comparison para solo subir si el archivo cambió
6. **Múltiples fuentes de carga:** URL, drag&drop, explorador de archivos, desde plantillas (NO plantillas por defecto como ahora)
7. **Sistema de plantillas administrable:** CRUD para gestionar las "plantillas" (actualmente hardcoded como SUGGESTED_DOCS)
8. **Metadata de origen:** Mostrar si vino de plantilla, URL u otra fuente
9. **Edición de documento:** Modificar metadata, re-subir archivo (genera nueva versión)

---

## Estructura de Archivos

```
lexia-admin/app/(dashboard)/indexing/
├── page.js                              # MODIFICAR - Layout principal simplificado
├── _lib/
│   ├── constants.js                     # MODIFICAR - Agregar column definitions
│   └── utils.js                         # CREAR - Helpers de sort, filtro, paginación
├── _hooks/
│   ├── use-documents.js                 # MODIFICAR - Agregar hash check, templates CRUD
│   └── use-table-state.js              # CREAR - Estado de tabla (sort, filtros, paginación, columnas)
├── _components/
│   ├── document-table.js               # REESCRIBIR - Tabla profesional con sort, expandable rows
│   ├── document-detail-panel.js        # REESCRIBIR - Drawer con propiedades, preview, versiones
│   ├── document-toolbar.js             # REESCRIBIR - Barra con búsqueda, filtros, columnas, paginación
│   ├── upload-panel.js                 # MODIFICAR - Quitar plantillas como default, agregar hash check
│   ├── version-history.js              # CREAR - Timeline de versiones reutilizable
│   ├── column-selector.js             # CREAR - Dropdown para mostrar/ocultar columnas
│   ├── pdf-viewer-modal.js            # MODIFICAR - Modal fullscreen para PDF
│   ├── document-card.js               # MANTENER - Vista grid (secundaria)
│   └── edit-document-modal.js         # CREAR - Modal para editar metadata y re-subir
│
├── templates/
│   └── page.js                         # CREAR - Sub-página para administrar plantillas

lexia-backend/
├── app/admin_routes.py                 # MODIFICAR - Agregar endpoints de plantillas y hash
├── migrations/
│   └── 002_document_templates.sql      # CREAR - Tabla de plantillas
```

---

## Chunk 1: Tabla Profesional con Sort, Filtros y Paginación

### Task 1: Hook de estado de tabla (`use-table-state.js`)

**Files:**
- Create: `app/(dashboard)/indexing/_hooks/use-table-state.js`

- [ ] **Step 1: Crear el hook de estado de tabla**

```js
"use client";

import { useState, useMemo, useCallback } from "react";

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZES = [10, 20, 50, 100];

export function useTableState(documents) {
  const [sortField, setSortField] = useState("updated_at");
  const [sortDir, setSortDir] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArea, setSelectedArea] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [visibleColumns, setVisibleColumns] = useState({
    filename: true,
    area: true,
    status: true,
    total_pages: true,
    chunks_created: true,
    parse_method: false,
    current_version: true,
    uploaded_by: false,
    source_url: false,
    updated_at: true,
  });

  const activeDocs = useMemo(
    () => documents.filter((d) => d.status !== "archived"),
    [documents],
  );

  const filtered = useMemo(() => {
    let result = activeDocs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          (d.uploaded_by || "").toLowerCase().includes(q),
      );
    }
    if (selectedArea !== "ALL")
      result = result.filter(
        (d) => (d.document_type || "").toUpperCase() === selectedArea,
      );
    if (selectedStatus !== "ALL")
      result = result.filter((d) => d.status === selectedStatus);
    return result;
  }, [activeDocs, searchQuery, selectedArea, selectedStatus]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];
      if (sortField === "updated_at" || sortField === "loaded_at") {
        va = new Date(va || a.loaded_at || 0).getTime();
        vb = new Date(vb || b.loaded_at || 0).getTime();
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  );

  const handleSort = useCallback(
    (field) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortField],
  );

  const toggleColumn = useCallback((col) => {
    setVisibleColumns((prev) => ({ ...prev, [col]: !prev[col] }));
  }, []);

  // Reset page when filters change
  const setSearchQueryAndReset = useCallback((q) => {
    setSearchQuery(q);
    setPage(1);
  }, []);
  const setSelectedAreaAndReset = useCallback((a) => {
    setSelectedArea(a);
    setPage(1);
  }, []);
  const setSelectedStatusAndReset = useCallback((s) => {
    setSelectedStatus(s);
    setPage(1);
  }, []);

  return {
    // State
    sortField,
    sortDir,
    searchQuery,
    selectedArea,
    selectedStatus,
    page: safePage,
    pageSize,
    visibleColumns,
    // Data
    activeDocs,
    filtered,
    sorted,
    paginated,
    totalPages,
    totalFiltered: filtered.length,
    // Actions
    handleSort,
    setSearchQuery: setSearchQueryAndReset,
    setSelectedArea: setSelectedAreaAndReset,
    setSelectedStatus: setSelectedStatusAndReset,
    setPage,
    setPageSize: (s) => {
      setPageSize(s);
      setPage(1);
    },
    toggleColumn,
    setVisibleColumns,
    PAGE_SIZES,
  };
}
```

- [ ] **Step 2: Verificar que se importa correctamente**

Run: `cd "E:/Cursos/Datapath/IA Developers/Proyecto/lexia-admin" && npx next lint app/\(dashboard\)/indexing/_hooks/use-table-state.js 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/indexing/_hooks/use-table-state.js
git commit -m "feat(indexing): add useTableState hook with sort, filter, pagination"
```

---

### Task 2: Actualizar constantes con definiciones de columnas

**Files:**
- Modify: `app/(dashboard)/indexing/_lib/constants.js`

- [ ] **Step 1: Agregar COLUMNS al archivo de constantes**

Agregar al final de `constants.js`:

```js
export const COLUMNS = [
  { key: "filename", label: "Documento", sortable: true, default: true, minWidth: 200 },
  { key: "area", label: "Área", sortable: false, default: true, minWidth: 90 },
  { key: "status", label: "Estado", sortable: false, default: true, minWidth: 80 },
  { key: "total_pages", label: "Páginas", sortable: true, default: true, align: "right", minWidth: 70 },
  { key: "chunks_created", label: "Chunks", sortable: true, default: true, align: "right", minWidth: 70 },
  { key: "parse_method", label: "Método", sortable: false, default: false, minWidth: 100 },
  { key: "current_version", label: "Versión", sortable: true, default: true, minWidth: 70 },
  { key: "uploaded_by", label: "Subido por", sortable: true, default: false, minWidth: 120 },
  { key: "source_url", label: "Fuente", sortable: false, default: false, minWidth: 80 },
  { key: "updated_at", label: "Actualizado", sortable: true, default: true, minWidth: 100 },
];

export const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "active", label: "Activo" },
  { value: "processing", label: "Procesando" },
  { value: "error", label: "Error" },
];
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/indexing/_lib/constants.js
git commit -m "feat(indexing): add column definitions and status options to constants"
```

---

### Task 3: Toolbar profesional con búsqueda, filtros, columnas y paginación

**Files:**
- Rewrite: `app/(dashboard)/indexing/_components/document-toolbar.js`

- [ ] **Step 1: Reescribir document-toolbar.js**

```js
"use client";

import { Search, LayoutGrid, List, RefreshCw, Upload, SlidersHorizontal, ChevronLeft, ChevronRight, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AREAS, STATUS_OPTIONS, COLUMNS } from "../_lib/constants";

function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-primary/15 text-primary border border-primary/30"
          : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

export default function DocumentToolbar({
  searchQuery, onSearch,
  selectedArea, onAreaChange,
  selectedStatus, onStatusChange,
  viewMode, onViewModeChange,
  visibleColumns, onToggleColumn,
  page, totalPages, totalFiltered, pageSize, onPageChange, onPageSizeChange, pageSizes,
  onRefresh, loading,
  onUpload,
}) {
  return (
    <div className="space-y-3 mb-4">
      {/* Row 1: Search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o usuario..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />

        {/* Column selector */}
        <div className="relative group">
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            <Columns3 className="h-3.5 w-3.5" /> Columnas
          </Button>
          <div className="absolute right-0 top-full mt-1 w-48 bg-background border rounded-lg shadow-lg p-2 hidden group-hover:block z-20">
            {COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={visibleColumns[col.key] ?? col.default}
                  onChange={() => onToggleColumn(col.key)}
                  className="rounded border-border"
                />
                {col.label}
              </label>
            ))}
          </div>
        </div>

        {/* View mode */}
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => onViewModeChange("table")} className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <List className="h-4 w-4" />
          </button>
          <button onClick={() => onViewModeChange("grid")} className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <Button size="sm" onClick={onUpload} className="h-8">
          <Upload className="h-3.5 w-3.5 mr-1.5" /> Subir
        </Button>
      </div>

      {/* Row 2: Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1" />

        {/* Area filters */}
        <FilterPill label="Todas" active={selectedArea === "ALL"} onClick={() => onAreaChange("ALL")} />
        {AREAS.map((a) => (
          <FilterPill key={a.value} label={a.label} active={selectedArea === a.value} onClick={() => onAreaChange(a.value)} />
        ))}

        <div className="w-px h-5 bg-border mx-1" />

        {/* Status filters */}
        {STATUS_OPTIONS.map((s) => (
          <FilterPill key={s.value} label={s.label} active={selectedStatus === s.value} onClick={() => onStatusChange(s.value)} />
        ))}

        <div className="flex-1" />

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {totalFiltered} doc{totalFiltered !== 1 ? "s" : ""}
          </span>
          <div className="w-px h-4 bg-border" />
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 px-1.5 text-[11px] bg-muted border rounded-md"
          >
            {pageSizes.map((s) => (
              <option key={s} value={s}>{s}/pág</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] min-w-[60px] text-center">
              {page} / {totalPages}
            </span>
            <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/indexing/_components/document-toolbar.js
git commit -m "feat(indexing): rewrite toolbar with filters, column selector, pagination"
```

---

### Task 4: Tabla profesional con sort y filas expandibles para versiones

**Files:**
- Rewrite: `app/(dashboard)/indexing/_components/document-table.js`

- [ ] **Step 1: Reescribir document-table.js con sort, columnas dinámicas y filas expandibles**

```js
"use client";

import { useState } from "react";
import { FileText, RotateCcw, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight, ExternalLink, Calendar, User, Cpu, Layers } from "lucide-react";
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
  onSelect, onReplace, onDelete, onViewPdf,
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
              <>
                <TableRow
                  key={d.id}
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
                  <TableRow key={`${d.id}-expanded`} className="bg-muted/10">
                    <TableCell colSpan={cols.length + 2} className="p-0">
                      <div className="px-10 py-4 border-t border-dashed">
                        <VersionHistory versions={versions[d.id] || []} compact />
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/indexing/_components/document-table.js
git commit -m "feat(indexing): rewrite table with dynamic columns, sort, expandable version rows"
```

---

### Task 5: Componente de historial de versiones reutilizable

**Files:**
- Create: `app/(dashboard)/indexing/_components/version-history.js`

- [ ] **Step 1: Crear componente de timeline de versiones**

```js
"use client";

import { Calendar, User, Cpu, Layers, HardDrive } from "lucide-react";

function formatDate(date, full = false) {
  return new Date(date).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(full ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export default function VersionHistory({ versions, compact = false }) {
  if (!versions || versions.length === 0) {
    return <p className="text-xs text-muted-foreground/50 italic">Sin historial registrado</p>;
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Últimas {versions.length} versiones
        </p>
        <div className="grid gap-1.5">
          {versions.slice(0, 10).map((v) => (
            <div key={v.id} className="flex items-center gap-3 text-xs py-1">
              <div className={`w-2 h-2 rounded-full shrink-0 ${v.status === "active" ? "bg-green-500" : "bg-zinc-400"}`} />
              <span className={`font-semibold w-8 ${v.status === "active" ? "text-green-500" : "text-muted-foreground"}`}>
                v{v.version}
              </span>
              {v.status === "active" && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-semibold">ACTUAL</span>
              )}
              <span className="text-muted-foreground">{v.total_pages} págs</span>
              <span className="text-muted-foreground">{v.chunks_created} chunks</span>
              <span className="text-muted-foreground">{v.parse_method}</span>
              <span className="text-muted-foreground/50 ml-auto">{formatDate(v.created_at)}</span>
              {v.uploaded_by && <span className="text-muted-foreground/40 truncate max-w-[100px]">{v.uploaded_by}</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full timeline version (for detail panel)
  return (
    <div className="relative pl-5 space-y-3">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
      {versions.map((v) => (
        <div key={v.id} className="relative">
          <div className={`absolute -left-5 top-2 w-3 h-3 rounded-full border-2 border-card ${v.status === "active" ? "bg-green-500" : "bg-zinc-400"}`} />
          <div className={`rounded-lg border p-3 ${v.status === "active" ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-bold ${v.status === "active" ? "text-green-600" : "text-muted-foreground"}`}>v{v.version}</span>
              {v.status === "active" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 font-semibold">ACTUAL</span>}
              {v.status === "replaced" && <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-zinc-500/10 text-zinc-400 font-medium">Reemplazada</span>}
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <div className="bg-background rounded px-2 py-1">
                <span className="text-muted-foreground/60 block">Págs</span>
                <span className="font-semibold">{v.total_pages}</span>
              </div>
              <div className="bg-background rounded px-2 py-1">
                <span className="text-muted-foreground/60 block">Chunks</span>
                <span className="font-semibold">{v.chunks_created}</span>
              </div>
              <div className="bg-background rounded px-2 py-1">
                <span className="text-muted-foreground/60 block">Método</span>
                <span className="font-semibold">{v.parse_method}</span>
              </div>
            </div>
            {v.embedding_model && (
              <div className="mt-1.5 text-[9px] text-muted-foreground/40">
                Embedding: {v.embedding_model}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-[9px] text-muted-foreground/50">
              <Calendar className="h-2.5 w-2.5" />
              {formatDate(v.created_at, true)}
              {v.uploaded_by && <><span>·</span><User className="h-2.5 w-2.5" />{v.uploaded_by}</>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/indexing/_components/version-history.js
git commit -m "feat(indexing): add reusable VersionHistory component with compact/full modes"
```

---

### Task 6: Panel de detalle/propiedades tipo Windows Explorer

**Files:**
- Rewrite: `app/(dashboard)/indexing/_components/document-detail-panel.js`

- [ ] **Step 1: Reescribir panel de detalle como drawer profesional**

```js
"use client";

import { useState } from "react";
import { X, FileText, RotateCcw, Trash2, Eye, ExternalLink, Pencil, ChevronDown, HardDrive, Layers, Cpu, Calendar, User, BarChart3, Hash, Globe, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  const [showPdf, setShowPdf] = useState(false);

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
            {/* General */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">General</p>
              <div className="rounded-lg border p-2">
                <PropRow icon={FileText} label="Nombre" value={doc.filename} />
                <PropRow icon={BarChart3} label="Área legal" value={area?.label || doc.document_type} />
                <PropRow icon={Hash} label="ID" value={doc.id} mono />
              </div>
            </div>

            {/* Indexing */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Indexación</p>
              <div className="rounded-lg border p-2">
                <PropRow icon={HardDrive} label="Páginas" value={doc.total_pages || "—"} />
                <PropRow icon={Layers} label="Chunks" value={doc.chunks_created?.toLocaleString() || "—"} />
                <PropRow icon={Cpu} label="Método de parseo" value={doc.parse_method || "LlamaParse"} />
                <PropRow icon={BarChart3} label="Versión actual" value={`v${doc.current_version || 1}`} />
              </div>
            </div>

            {/* Dates & Audit */}
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

            {/* Source */}
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/indexing/_components/document-detail-panel.js
git commit -m "feat(indexing): rewrite detail panel with tabs (properties, preview, versions)"
```

---

### Task 7: Reescribir page.js usando los nuevos componentes

**Files:**
- Rewrite: `app/(dashboard)/indexing/page.js`

- [ ] **Step 1: Reescribir page.js simplificado que orquesta los componentes**

El nuevo `page.js` debe:
1. Usar `useDocuments` para data
2. Usar `useTableState` para estado de tabla
3. Renderizar layout: Sidebar | Toolbar+Table | DetailPanel
4. Conectar todos los callbacks
5. Manejar modales de delete/replace/upload/pdf

```js
"use client";

import { useState, useEffect } from "react";
import { RefreshCw, FileText, Layers, HardDrive, Scale, FolderOpen, Upload, X, RotateCcw, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDocuments } from "./_hooks/use-documents";
import { useTableState } from "./_hooks/use-table-state";
import { AREAS, AREA_MAP, getGDrivePreviewUrl } from "./_lib/constants";
import DocumentToolbar from "./_components/document-toolbar";
import DocumentTable from "./_components/document-table";
import DocumentDetailPanel from "./_components/document-detail-panel";
import UploadPanel from "./_components/upload-panel";

export default function IndexingPage() {
  const {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
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
          selectedArea={table.selectedArea}
          onAreaChange={table.setSelectedArea}
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
        ) : (
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
            onViewPdf={setPdfViewDoc}
            versions={docVersions}
            onLoadVersions={handleLoadVersions}
          />
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
          onEdit={() => {/* TODO: Task 11 */}}
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
              <a href={pdfViewDoc.source_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="sm"><span className="mr-1.5">↗</span> Original</Button></a>
              <button onClick={() => setPdfViewDoc(null)} className="p-2 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 p-2" onClick={(e) => e.stopPropagation()}>
              <iframe src={url} className="w-full h-full rounded-lg" title={pdfViewDoc.filename} />
            </div>
          </div>
        );
      })()}

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
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que la build pasa**

Run: `cd "E:/Cursos/Datapath/IA Developers/Proyecto/lexia-admin" && npx next build 2>&1 | tail -30`

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/indexing/page.js
git commit -m "feat(indexing): rewrite page with professional table, toolbar, detail panel"
```

---

## Chunk 2: Sistema de Plantillas y Upload Inteligente

### Task 8: Backend - Tabla y endpoints de plantillas

**Files:**
- Create: `migrations/002_document_templates.sql`
- Modify: `app/admin_routes.py` — agregar CRUD de templates

- [ ] **Step 1: Crear migración para plantillas**

```sql
-- Migration: Document Templates
-- Date: 2026-03-30
-- Description: Allows admins to manage document templates
--   that can be used to quickly index common legal documents

CREATE TABLE IF NOT EXISTS document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT DEFAULT '',
  area TEXT NOT NULL DEFAULT 'GENERAL',
  url TEXT NOT NULL,
  source TEXT DEFAULT 'url',
  expected_pages INTEGER,
  expected_size TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT '',
  created_by_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_area ON document_templates(area);
CREATE INDEX IF NOT EXISTS idx_templates_active ON document_templates(is_active);

-- Seed with current SUGGESTED_DOCS
INSERT INTO document_templates (filename, label, area, url, source, expected_pages, expected_size)
VALUES
  ('constitucion.pdf', 'Constitución Política del Perú 1993', 'CONSTITUCIONAL', 'https://drive.google.com/file/d/19zHRbWzEzPb4D8TdG-EB__1gN9Ps771a/view?usp=sharing', 'Google Drive', 75, '823 KB'),
  ('codigo_civil.pdf', 'Código Civil - DL 295', 'CIVIL', 'https://drive.google.com/file/d/1LP2a_jQZWlpY1VD0DTA-dAL3YemlrkLq/view?usp=sharing', 'Google Drive', 724, '11 MB'),
  ('codigo_penal.pdf', 'Código Penal - DL 635', 'PENAL', 'https://drive.google.com/file/d/1zSi1vBQzoMCP1kMaJuvlBtm9vTkkR1BU/view?usp=sharing', 'Google Drive', 259, '3.3 MB'),
  ('codigo_procesal_civil.pdf', 'Código Procesal Civil', 'CIVIL', 'https://drive.google.com/file/d/1rTbiIZW37xd4dPjkQs2PpuD5uAWauG3I/view?usp=sharing', 'Google Drive', 293, '2.1 MB'),
  ('jurisprudencia_tc_tomo1.pdf', 'Jurisprudencia Relevante TC - Tomo I', 'CONSTITUCIONAL', 'https://drive.google.com/file/d/1LRtqo_WDCPfsv3Ju6mh0Ev39Ajjpw8-c/view?usp=sharing', 'Google Drive', 992, '4.8 MB')
ON CONFLICT DO NOTHING;
```

- [ ] **Step 2: Agregar endpoints de templates en admin_routes.py**

Agregar después del endpoint `replace-document`:

```python
# ---- Document Templates CRUD ----

@router.get("/document-templates")
async def admin_list_templates(token_payload: dict = Depends(verify_supabase_token)):
    """Lista todas las plantillas de documentos."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    from app.integrations.supabase_client import supabase
    result = supabase.table("document_templates").select("*").order("area").order("label").execute()
    return result.data or []


@router.post("/document-templates")
async def admin_create_template(request: Request, token_payload: dict = Depends(verify_supabase_token)):
    """Crea una nueva plantilla."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    from app.integrations.supabase_client import supabase
    body = await request.json()

    required = ["filename", "label", "url", "area"]
    for field in required:
        if not body.get(field, "").strip():
            return JSONResponse({"error": f"Campo requerido: {field}"}, status_code=400)

    template = {
        "filename": body["filename"].strip(),
        "label": body["label"].strip(),
        "description": body.get("description", "").strip(),
        "area": body["area"].upper(),
        "url": body["url"].strip(),
        "source": body.get("source", "url"),
        "expected_pages": body.get("expected_pages"),
        "expected_size": body.get("expected_size", ""),
        "is_active": body.get("is_active", True),
        "created_by": admin["identifier"],
        "created_by_id": admin["id"],
    }

    result = supabase.table("document_templates").insert(template).execute()
    await log_action("admin.template.create", actor_id=admin["id"], actor_email=admin["identifier"], target_type="template", target_id=template["filename"], details=template)
    return result.data[0] if result.data else template


@router.put("/document-templates/{template_id}")
async def admin_update_template(template_id: str, request: Request, token_payload: dict = Depends(verify_supabase_token)):
    """Actualiza una plantilla existente."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    from app.integrations.supabase_client import supabase
    body = await request.json()

    updates = {"updated_at": "now()"}
    for field in ["filename", "label", "description", "area", "url", "source", "expected_pages", "expected_size", "is_active"]:
        if field in body:
            updates[field] = body[field]

    supabase.table("document_templates").update(updates).eq("id", template_id).execute()
    await log_action("admin.template.update", actor_id=admin["id"], actor_email=admin["identifier"], target_type="template", target_id=template_id, details=updates)
    return {"status": "ok"}


@router.delete("/document-templates/{template_id}")
async def admin_delete_template(template_id: str, token_payload: dict = Depends(verify_supabase_token)):
    """Elimina una plantilla."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    from app.integrations.supabase_client import supabase
    supabase.table("document_templates").delete().eq("id", template_id).execute()
    await log_action("admin.template.delete", actor_id=admin["id"], actor_email=admin["identifier"], target_type="template", target_id=template_id)
    return {"status": "ok"}
```

- [ ] **Step 3: Commit**

```bash
git add migrations/002_document_templates.sql app/admin_routes.py
git commit -m "feat(backend): add document_templates table and CRUD endpoints"
```

---

### Task 9: Backend - Hash comparison para upload inteligente

**Files:**
- Modify: `app/admin_routes.py` — agregar hash al index-document y check endpoint
- Modify: `migrations/002_document_templates.sql` — agregar columna file_hash

- [ ] **Step 1: Agregar columna file_hash a legal_documents**

Agregar al final de `002_document_templates.sql`:

```sql
-- Add file hash to legal_documents for dedup
ALTER TABLE legal_documents
  ADD COLUMN IF NOT EXISTS file_hash TEXT DEFAULT '';

-- Add file hash to document_versions
ALTER TABLE document_versions
  ADD COLUMN IF NOT EXISTS file_hash TEXT DEFAULT '';
```

- [ ] **Step 2: Agregar cálculo de hash en `_index_pdf`**

En la función `_index_pdf` de `admin_routes.py`, al principio de `do_index()`, después de leer el archivo, calcular el hash:

```python
import hashlib

# Calculate file hash
with open(file_path, "rb") as fh:
    file_hash = hashlib.sha256(fh.read()).hexdigest()

# Check if same hash already exists for this document
if document_id:
    existing = supabase.table("document_versions").select("file_hash").eq("document_id", document_id).eq("status", "active").limit(1).execute()
    if existing.data and existing.data[0].get("file_hash") == file_hash:
        return {
            "status": "same_hash",
            "message": f"El archivo es idéntico a la versión actual (hash: {file_hash[:12]}...). No se requiere actualización.",
            "filename": filename,
            "hash": file_hash,
        }
```

Y en los inserts de `legal_documents` y `document_versions`, agregar `"file_hash": file_hash`.

- [ ] **Step 3: Agregar endpoint de check-hash**

```python
@router.post("/check-document-hash")
async def admin_check_hash(request: Request, token_payload: dict = Depends(verify_supabase_token)):
    """Verifica si un archivo ya existe comparando su hash SHA-256."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    form = await request.form()
    file = form.get("file")
    if not file:
        return JSONResponse({"error": "Archivo requerido"}, status_code=400)

    import hashlib
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    from app.integrations.supabase_client import supabase
    existing = (
        supabase.table("document_versions")
        .select("document_id, version, filename")
        .eq("file_hash", file_hash)
        .eq("status", "active")
        .limit(1)
        .execute()
    )

    if existing.data:
        match = existing.data[0]
        return {
            "exists": True,
            "hash": file_hash,
            "document_id": match["document_id"],
            "version": match["version"],
            "filename": match["filename"],
            "message": f"Este archivo ya está indexado como '{match['filename']}' (v{match['version']})",
        }

    return {"exists": False, "hash": file_hash}
```

- [ ] **Step 4: Commit**

```bash
git add migrations/002_document_templates.sql app/admin_routes.py
git commit -m "feat(backend): add SHA-256 hash comparison for smart uploads"
```

---

### Task 10: Frontend - Actualizar upload-panel para usar plantillas desde API

**Files:**
- Modify: `app/(dashboard)/indexing/_components/upload-panel.js`
- Modify: `app/(dashboard)/indexing/_hooks/use-documents.js`

- [ ] **Step 1: Agregar métodos de plantillas al hook**

Agregar a `use-documents.js`:

```js
async function loadTemplates() {
  try {
    const data = await apiFetch("/api/admin/document-templates");
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function checkHash(file) {
  try {
    const token = await getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/check-document-hash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    return await res.json();
  } catch { return { exists: false }; }
}
```

Y agregar al return: `loadTemplates, checkHash`.

- [ ] **Step 2: Actualizar UploadPanel para cargar plantillas desde API**

Reemplazar el uso de `SUGGESTED_DOCS` hardcoded por llamada a `loadTemplates()` en el `useEffect` del componente. El tab "Sugeridos" pasa a llamarse "Plantillas" y solo muestra los templates activos.

Agregar verificación de hash antes de subir:
- Al seleccionar un archivo, llamar `checkHash(file)`
- Si `exists === true`, mostrar warning: "Este archivo ya está indexado como X (vY)"
- Permitir continuar de todos modos con un botón "Subir de todas formas"

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/indexing/_hooks/use-documents.js app/\(dashboard\)/indexing/_components/upload-panel.js
git commit -m "feat(indexing): load templates from API, add hash check before upload"
```

---

### Task 11: Modal de edición de metadata

**Files:**
- Create: `app/(dashboard)/indexing/_components/edit-document-modal.js`

- [ ] **Step 1: Crear modal de edición**

El modal permite:
- Cambiar área legal (document_type)
- Cambiar descripción
- Re-subir archivo (genera nueva versión con hash check)
- Ver metadata de solo lectura (filename, id, cargado por, fecha)

Se necesita un endpoint `PUT /api/admin/update-document/{document_id}` en el backend para actualizar metadata sin re-indexar.

- [ ] **Step 2: Agregar endpoint de update metadata en backend**

```python
@router.put("/update-document/{document_id}")
async def admin_update_document_meta(document_id: str, request: Request, token_payload: dict = Depends(verify_supabase_token)):
    """Actualiza metadata de un documento sin re-indexar."""
    auth_id = token_payload["sub"]
    admin = await obtener_usuario_por_auth_id(auth_id)
    if not admin or admin.get("role") != "admin":
        return JSONResponse({"error": "No autorizado"}, status_code=403)

    from app.integrations.supabase_client import supabase
    body = await request.json()

    updates = {"updated_at": "now()"}
    allowed_fields = ["document_type", "description", "filename"]
    for field in allowed_fields:
        if field in body:
            updates[field] = body[field]

    supabase.table("legal_documents").update(updates).eq("id", document_id).execute()

    await log_action("admin.document.update_meta", actor_id=admin["id"], actor_email=admin["identifier"],
                      target_type="document", target_id=document_id, details=updates)
    return {"status": "ok"}
```

- [ ] **Step 3: Conectar el modal al page.js**

Agregar estado `editDoc` y renderizar `EditDocumentModal` cuando no sea null. Conectar el callback `onEdit` del `DocumentDetailPanel`.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/indexing/_components/edit-document-modal.js app/admin_routes.py app/\(dashboard\)/indexing/page.js app/\(dashboard\)/indexing/_hooks/use-documents.js
git commit -m "feat(indexing): add edit document modal for metadata changes"
```

---

## Chunk 3: Página de Administración de Plantillas

### Task 12: Página de administración de plantillas

**Files:**
- Create: `app/(dashboard)/indexing/templates/page.js`

- [ ] **Step 1: Crear la página de administración de plantillas**

Una página con:
- Tabla de plantillas existentes con: nombre, label, área, URL, páginas, tamaño, activa/inactiva
- Botón de agregar nueva plantilla
- Editar plantilla inline o en modal
- Eliminar plantilla con confirmación
- Toggle activa/inactiva
- Botón "Indexar" directo si la plantilla no está ya indexada
- Link de regreso a la página principal de indexación

- [ ] **Step 2: Agregar link en el sidebar de la página principal**

En `page.js`, agregar debajo del botón "Subir documento":

```js
<Link href="/dashboard/indexing/templates" className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[13px] text-foreground/70 hover:bg-muted">
  <BookOpen className="h-4 w-4" /> Gestionar plantillas
</Link>
```

- [ ] **Step 3: Agregar a la navegación del sidebar global**

Verificar si hay que agregar el link en el sidebar principal del admin.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/indexing/templates/page.js app/\(dashboard\)/indexing/page.js
git commit -m "feat(indexing): add template management page"
```

---

## Chunk 4: Pulido y Testing

### Task 13: Quitar componentes no usados y limpiar

**Files:**
- Delete or clean: `_components/document-card.js` (si ya no se usa en grid mode)

- [ ] **Step 1: Verificar que la vista grid usa document-card o inline**

Si la vista grid se mantiene, integrar `document-card.js`. Si no, eliminar el archivo.

- [ ] **Step 2: Limpiar imports no usados del page.js**

- [ ] **Step 3: Commit**

```bash
git commit -m "chore(indexing): clean up unused components and imports"
```

---

### Task 14: Testing manual end-to-end

- [ ] **Step 1: Verificar tabla con sort**
  - Click en cada header sortable → datos se reordenan
  - Indicador de dirección (↑/↓) visible

- [ ] **Step 2: Verificar filtros**
  - Filtro por área → solo muestra documentos de esa área
  - Filtro por estado → solo muestra documentos con ese estado
  - Búsqueda → filtra por nombre y usuario
  - Los filtros se combinan correctamente

- [ ] **Step 3: Verificar paginación**
  - Cambiar tamaño de página → tabla se actualiza
  - Navegar entre páginas → datos correctos
  - Contador de total muestra número correcto

- [ ] **Step 4: Verificar columnas configurables**
  - Hover sobre "Columnas" → dropdown aparece
  - Toggle columnas → se muestran/ocultan correctamente

- [ ] **Step 5: Verificar panel de detalle**
  - Click en documento → panel se abre a la derecha
  - Tab Propiedades → muestra toda la metadata
  - Tab Vista previa → muestra PDF (si tiene source_url)
  - Tab Versiones → muestra timeline de versiones
  - Botones de acción funcionan (Editar, Reemplazar, Eliminar)

- [ ] **Step 6: Verificar filas expandibles**
  - Click en chevron → fila se expande mostrando versiones compactas
  - Se colapsa al clickear de nuevo

- [ ] **Step 7: Verificar upload**
  - Subir por URL → funciona
  - Subir por archivo → funciona
  - Hash check → muestra warning si archivo ya existe
  - Plantillas desde API → se cargan correctamente

- [ ] **Step 8: Verificar gestión de plantillas**
  - Crear nueva plantilla
  - Editar plantilla existente
  - Eliminar plantilla
  - Toggle activa/inactiva

- [ ] **Step 9: Build de producción pasa**

Run: `cd "E:/Cursos/Datapath/IA Developers/Proyecto/lexia-admin" && npx next build`

---

## Resumen de Cambios por Archivo

| Archivo | Acción | Task |
|---------|--------|------|
| `_hooks/use-table-state.js` | CREAR | 1 |
| `_lib/constants.js` | MODIFICAR | 2 |
| `_components/document-toolbar.js` | REESCRIBIR | 3 |
| `_components/document-table.js` | REESCRIBIR | 4 |
| `_components/version-history.js` | CREAR | 5 |
| `_components/document-detail-panel.js` | REESCRIBIR | 6 |
| `page.js` | REESCRIBIR | 7 |
| `migrations/002_document_templates.sql` | CREAR | 8, 9 |
| `admin_routes.py` | MODIFICAR | 8, 9, 11 |
| `_hooks/use-documents.js` | MODIFICAR | 10 |
| `_components/upload-panel.js` | MODIFICAR | 10 |
| `_components/edit-document-modal.js` | CREAR | 11 |
| `templates/page.js` | CREAR | 12 |

**Total: 14 tasks, 4 chunks, ~13 archivos afectados**
