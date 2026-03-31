"use client";

import { Search, LayoutGrid, List, RefreshCw, Upload, ChevronLeft, ChevronRight, Columns3, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COLUMNS, STATUS_CONFIG } from "../_lib/constants";

export default function DocumentToolbar({
  searchQuery, onSearch,
  selectedStatus, onStatusChange,
  viewMode, onViewModeChange,
  visibleColumns, onToggleColumn,
  page, totalPages, totalFiltered, pageSize, onPageChange, onPageSizeChange, pageSizes,
  onRefresh, loading,
  onUpload,
}) {
  return (
    <div className="flex items-center gap-3 mb-4 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 max-w-sm min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o usuario..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Status filter - compact with dots */}
      <div className="flex items-center gap-1 border rounded-lg px-1.5 py-0.5">
        <button
          onClick={() => onStatusChange("ALL")}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
            selectedStatus === "ALL" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Todos
        </button>
        {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "archived").map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => onStatusChange(selectedStatus === key ? "ALL" : key)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
              selectedStatus === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Pagination info */}
      <span className="text-[11px] text-muted-foreground">
        {totalFiltered} doc{totalFiltered !== 1 ? "s" : ""}
      </span>

      {/* Page size */}
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="h-7 px-1.5 text-[11px] bg-muted border rounded-md"
      >
        {pageSizes.map((s) => (
          <option key={s} value={s}>{s}/pág</option>
        ))}
      </select>

      {/* Page nav */}
      <div className="flex items-center gap-0.5">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[11px] min-w-[50px] text-center">{page}/{totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="p-1 rounded hover:bg-muted disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

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

      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading} className="h-8 px-2">
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      </Button>

      <Button size="sm" onClick={onUpload} className="h-8">
        <Upload className="h-3.5 w-3.5 mr-1.5" /> Subir
      </Button>
    </div>
  );
}
