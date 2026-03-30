"use client";

import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGDrivePreviewUrl } from "../_lib/constants";

export default function PdfViewerModal({ doc, onClose }) {
  if (!doc) return null;

  const previewUrl = getGDrivePreviewUrl(doc.source_url);
  if (!previewUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-background/95 border-b" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold flex-1">{doc.filename}</p>
        {doc.source_url && (
          <a href={doc.source_url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Abrir original
            </Button>
          </a>
        )}
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      {/* PDF iframe */}
      <div className="flex-1 p-2" onClick={(e) => e.stopPropagation()}>
        <iframe src={previewUrl} className="w-full h-full rounded-lg" title={doc.filename} />
      </div>
    </div>
  );
}
