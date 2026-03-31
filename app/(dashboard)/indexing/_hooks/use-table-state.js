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
    sortField,
    sortDir,
    searchQuery,
    selectedArea,
    selectedStatus,
    page: safePage,
    pageSize,
    visibleColumns,
    activeDocs,
    filtered,
    sorted,
    paginated,
    totalPages,
    totalFiltered: filtered.length,
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
