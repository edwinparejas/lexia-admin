"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/admin/documents").then((d) => { if (Array.isArray(d)) setDocs(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Documentos de Usuarios</h1><p className="text-sm text-muted-foreground">{docs.length} documentos generados</p></div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : docs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Sin documentos</TableCell></TableRow>
            ) : docs.map((d) => (
              <TableRow key={d.id}>
                <TableCell><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">{d.title}</span></div></TableCell>
                <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{d.user_email || (d.user_id || "").slice(0, 8)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(d.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
