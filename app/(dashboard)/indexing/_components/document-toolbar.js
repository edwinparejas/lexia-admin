"use client";

import { Search, LayoutGrid, List, Upload, Filter, SortAsc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AREAS, STATUS_CONFIG, TAGS } from "../_lib/constants";

export default function DocumentToolbar({
  viewMode, onViewModeChange,
  searchQuery, onSearchChange,
  filterArea, onFilterAreaChange,
  filterStatus, onFilterStatusChange,
  onUploadClick,
  documentCount,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Area filters */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onFilterAreaChange("ALL")}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterArea === "ALL" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            Todos ({documentCount})
          </button>
          {AREAS.slice(0, 5).map((a) => (
            <button
              key={a.value}
              onClick={() => onFilterAreaChange(filterArea === a.value ? "ALL" : a.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filterArea === a.value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 border-l pl-3">
          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== "archived").map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onFilterStatusChange(filterStatus === key ? "ALL" : key)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                filterStatus === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={`p-2 transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Upload button */}
        <Button size="sm" onClick={onUploadClick}>
          <Upload className="h-4 w-4 mr-1.5" />
          Subir documento
        </Button>
      </div>
    </div>
  );
}
