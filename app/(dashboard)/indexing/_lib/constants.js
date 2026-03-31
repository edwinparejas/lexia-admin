export const AREAS = [
  { value: "CIVIL", label: "Civil", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "PENAL", label: "Penal", color: "bg-red-500/10 text-red-400 border-red-500/20" },
  { value: "LABORAL", label: "Laboral", color: "bg-green-500/10 text-green-400 border-green-500/20" },
  { value: "CONSTITUCIONAL", label: "Constitucional", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { value: "TRIBUTARIO", label: "Tributario", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  { value: "ADMINISTRATIVO", label: "Administrativo", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { value: "FAMILIAR", label: "Familiar", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
  { value: "GENERAL", label: "General", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
];

export const AREA_MAP = Object.fromEntries(AREAS.map((a) => [a.value, a]));

export const TAGS = [
  { value: "codigo", label: "Código", color: "bg-blue-500/10 text-blue-400" },
  { value: "decreto_legislativo", label: "Decreto Legislativo", color: "bg-indigo-500/10 text-indigo-400" },
  { value: "decreto_supremo", label: "Decreto Supremo", color: "bg-violet-500/10 text-violet-400" },
  { value: "ley", label: "Ley", color: "bg-emerald-500/10 text-emerald-400" },
  { value: "jurisprudencia", label: "Jurisprudencia", color: "bg-amber-500/10 text-amber-400" },
  { value: "resolucion", label: "Resolución", color: "bg-rose-500/10 text-rose-400" },
  { value: "reglamento", label: "Reglamento", color: "bg-teal-500/10 text-teal-400" },
  { value: "constitucion", label: "Constitución", color: "bg-yellow-500/10 text-yellow-400" },
];

export const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.value, t]));

export const STATUS_CONFIG = {
  active: { label: "Activo", color: "bg-green-500/10 text-green-500", dot: "bg-green-500" },
  processing: { label: "Procesando", color: "bg-amber-500/10 text-amber-500", dot: "bg-amber-500" },
  error: { label: "Error", color: "bg-red-500/10 text-red-500", dot: "bg-red-500" },
  archived: { label: "Archivado", color: "bg-zinc-500/10 text-zinc-400", dot: "bg-zinc-400" },
};

export const SUGGESTED_DOCS = [
  { filename: "constitucion.pdf", label: "Constitución Política del Perú 1993", area: "CONSTITUCIONAL", pages: 75, size: "823 KB", url: "https://drive.google.com/file/d/19zHRbWzEzPb4D8TdG-EB__1gN9Ps771a/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_civil.pdf", label: "Código Civil - DL 295", area: "CIVIL", pages: 724, size: "11 MB", url: "https://drive.google.com/file/d/1LP2a_jQZWlpY1VD0DTA-dAL3YemlrkLq/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_penal.pdf", label: "Código Penal - DL 635", area: "PENAL", pages: 259, size: "3.3 MB", url: "https://drive.google.com/file/d/1zSi1vBQzoMCP1kMaJuvlBtm9vTkkR1BU/view?usp=sharing", source: "Google Drive" },
  { filename: "codigo_procesal_civil.pdf", label: "Código Procesal Civil", area: "CIVIL", pages: 293, size: "2.1 MB", url: "https://drive.google.com/file/d/1rTbiIZW37xd4dPjkQs2PpuD5uAWauG3I/view?usp=sharing", source: "Google Drive" },
  { filename: "jurisprudencia_tc_tomo1.pdf", label: "Jurisprudencia Relevante TC - Tomo I", area: "CONSTITUCIONAL", pages: 992, size: "4.8 MB", url: "https://drive.google.com/file/d/1LRtqo_WDCPfsv3Ju6mh0Ev39Ajjpw8-c/view?usp=sharing", source: "Google Drive" },
];

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

export function getPreviewUrl(url) {
  if (!url) return null;
  // Google Drive → embed preview
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
  // Supabase Storage or direct PDF URLs
  if (url.includes("supabase.co/storage") || url.endsWith(".pdf")) return url;
  return null;
}

// Keep old name for backwards compat
export const getGDrivePreviewUrl = getPreviewUrl;
