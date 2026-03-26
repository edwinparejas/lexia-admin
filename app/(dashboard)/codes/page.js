"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Key } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newPlan, setNewPlan] = useState("basico");
  const [newMaxUses, setNewMaxUses] = useState("1");

  async function loadCodes() {
    setLoading(true);
    try { const d = await apiFetch("/api/admin/codes?all=true"); if (Array.isArray(d)) setCodes(d); } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadCodes(); }, []);

  async function handleCreate() {
    if (!newCode.trim()) return;
    try { await apiFetch("/api/admin/codes", { method: "POST", body: JSON.stringify({ code: newCode, plan: newPlan, max_uses: parseInt(newMaxUses) || 1 }) }); setNewCode(""); loadCodes(); } catch {}
  }

  async function handleRevoke(id) {
    try { await apiFetch(`/api/admin/codes/${id}`, { method: "DELETE" }); loadCodes(); } catch {}
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Codigos de Activacion</h1>
        <p className="text-sm text-muted-foreground">Crear y gestionar codigos para activar planes</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Crear codigo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Codigo</label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} placeholder="MI-CODIGO-2026" className="w-48 font-mono" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Plan</label>
              <select value={newPlan} onChange={(e) => setNewPlan(e.target.value)} className="h-9 bg-background border rounded-md px-3 text-sm">
                <option value="basico">Basico</option><option value="profesional">Profesional</option><option value="estudio">Estudio</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max usos</label>
              <Input type="number" value={newMaxUses} onChange={(e) => setNewMaxUses(e.target.value)} className="w-20" />
            </div>
            <Button onClick={handleCreate} size="sm"><Plus className="h-4 w-4 mr-1" />Crear</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codigo</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.map((c) => (
              <TableRow key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                <TableCell><code className="font-mono font-bold text-sm">{c.code}</code></TableCell>
                <TableCell><Badge variant="outline">{c.plan}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{c.times_used}/{c.max_uses}</TableCell>
                <TableCell>{c.is_active ? <Badge variant="outline" className="text-green-400 border-green-500/20">Activo</Badge> : <Badge variant="destructive">Revocado</Badge>}</TableCell>
                <TableCell className="text-right">{c.is_active && <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRevoke(c.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
