"use client";

import { useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AREAS } from "../_lib/constants";

export default function EditDocumentModal({ doc, onClose, onSave, processing }) {
  const [filename, setFilename] = useState(doc.filename);
  const [area, setArea] = useState((doc.document_type || "general").toUpperCase());
  const [description, setDescription] = useState(doc.description || "");

  async function handleSave() {
    const updates = {};
    if (filename !== doc.filename) updates.filename = filename;
    if (area.toLowerCase() !== (doc.document_type || "general")) updates.document_type = area.toLowerCase();
    if (description !== (doc.description || "")) updates.description = description;

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }
    await onSave(doc.id, updates);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-background rounded-xl border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Editar documento</p>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium block mb-1.5">Nombre del archivo</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none"
              disabled={processing}
            />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5">Área legal</label>
            <div className="grid grid-cols-4 gap-1">
              {AREAS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setArea(a.value)}
                  disabled={processing}
                  className={`rounded-md border px-2 py-1.5 text-[10px] font-medium transition-all ${
                    area === a.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  } disabled:opacity-50`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium block mb-1.5">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:border-primary focus:outline-none resize-none"
              placeholder="Descripción del documento..."
              disabled={processing}
            />
          </div>

          {/* Read-only info */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Información (solo lectura)</p>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono text-[10px]">{doc.id}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Versión</span>
              <span>v{doc.current_version || 1}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Subido por</span>
              <span>{doc.uploaded_by || "Sistema"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Fecha</span>
              <span>{new Date(doc.loaded_at || doc.updated_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSave} disabled={processing || !filename.trim()}>
            {processing && <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
