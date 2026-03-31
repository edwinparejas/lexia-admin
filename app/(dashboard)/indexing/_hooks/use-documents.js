"use client";

import { useState, useCallback } from "react";
import { apiFetch, getToken } from "@/lib/auth";

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/indexed-documents");
      if (Array.isArray(d)) setDocuments(d);
    } catch {} finally { setLoading(false); }
  }, []);

  async function deleteDocument(docId) {
    setProcessing(true);
    setStatus({ type: "info", message: "Eliminando documento y vectores..." });
    try {
      const res = await apiFetch(`/api/admin/delete-document/${docId}`, { method: "DELETE" });
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento eliminado." });
        await loadDocuments();
      }
    } catch {
      setStatus({ type: "error", message: "Error al eliminar." });
    } finally {
      setProcessing(false);
    }
  }

  async function replaceDocument(docId, url, forcePypdf = false) {
    if (!url) { setStatus({ type: "error", message: "URL requerida." }); return null; }
    setProcessing(true);
    setStatus({ type: "info", message: "Reemplazando documento... Puede tardar varios minutos." });
    try {
      const res = await apiFetch(`/api/admin/replace-document/${docId}`, {
        method: "POST",
        body: JSON.stringify({ url, force_pypdf: forcePypdf }),
      });
      if (res.status === "confirm_pypdf") {
        setProcessing(false);
        setStatus(null);
        return res;
      }
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento reemplazado." });
        await loadDocuments();
      }
    } catch {
      setStatus({ type: "error", message: "Error al reemplazar." });
    } finally {
      setProcessing(false);
    }
    return null;
  }

  async function indexFromUrl(url, filename, area, forcePypdf = false) {
    if (!url) { setStatus({ type: "error", message: "URL requerida." }); return null; }
    setProcessing(true);
    setStatus({ type: "info", message: forcePypdf
      ? `Reintentando con PyPDF "${filename}"...`
      : `Descargando y procesando "${filename}"... Puede tardar 2-10 minutos.`
    });
    try {
      const res = await apiFetch("/api/admin/index-document-url", {
        method: "POST",
        body: JSON.stringify({ url, filename, area, force_pypdf: forcePypdf }),
      });
      if (res.status === "confirm_pypdf") {
        setProcessing(false);
        setStatus(null);
        return res;
      }
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: res.message || "Documento procesado." });
        await loadDocuments();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message || "Error al procesar." });
    } finally {
      setProcessing(false);
    }
    return null;
  }

  async function uploadFile(file, area) {
    setProcessing(true);
    setStatus({ type: "info", message: `Subiendo "${file.name}"... Puede tardar 1-5 minutos.` });
    try {
      const token = await getToken();
      const form = new FormData();
      form.append("file", file);
      form.append("area", area);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/api/admin/index-document`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({ type: "success", message: data.message || "Indexado correctamente." });
        await loadDocuments();
      } else {
        setStatus({ type: "error", message: data.error || "Error al procesar." });
      }
    } catch {
      setStatus({ type: "error", message: "Error de conexión." });
    } finally {
      setProcessing(false);
    }
  }

  async function loadVersions(docId) {
    try {
      const data = await apiFetch(`/api/admin/document-versions/${docId}`);
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }

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

  async function updateDocumentMeta(docId, updates) {
    setProcessing(true);
    try {
      const res = await apiFetch(`/api/admin/update-document/${docId}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      if (res.error) {
        setStatus({ type: "error", message: res.error });
      } else {
        setStatus({ type: "success", message: "Documento actualizado." });
        await loadDocuments();
      }
    } catch {
      setStatus({ type: "error", message: "Error al actualizar." });
    } finally {
      setProcessing(false);
    }
  }

  return {
    documents, loading, processing, status, setStatus,
    loadDocuments, deleteDocument, replaceDocument, indexFromUrl, uploadFile, loadVersions,
    loadTemplates, checkHash, updateDocumentMeta,
  };
}
