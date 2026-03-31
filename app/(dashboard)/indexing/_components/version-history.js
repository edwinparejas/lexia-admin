"use client";

import { Calendar, User } from "lucide-react";

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
