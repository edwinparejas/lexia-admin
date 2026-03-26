"use client";

import { useState, useEffect } from "react";
import { Key, CreditCard, Zap } from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PaymentsPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("code");
  const [cards, setCards] = useState("4242424242424242");

  async function loadConfig() {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/payment-config");
      if (d) { setConfig(d); setMode(d.mode || "code"); setCards((d.accepted_cards || ["4242424242424242"]).join("\n")); }
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadConfig(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const cardList = cards.split("\n").map(c => c.trim().replace(/\s/g, "")).filter(Boolean);
      await apiFetch("/api/admin/config/payment_config", { method: "PUT", body: JSON.stringify({ value: { mode, mock_card: { number: cardList[0] || "4242424242424242", enabled: mode === "card" }, accepted_cards: cardList, stripe: { enabled: mode === "stripe" } } }) });
      loadConfig();
    } catch {} finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><p className="text-sm text-muted-foreground">Cargando...</p></div>;

  const modes = [
    { id: "code", label: "Codigo de activacion", desc: "Usuarios ingresan un codigo que tu proporcionas.", icon: Key },
    { id: "card", label: "Tarjeta mock", desc: "Tarjeta simulada para demos. Configura numeros aceptados.", icon: CreditCard },
    { id: "stripe", label: "Stripe (real)", desc: "Pagos reales con Stripe Checkout. Requiere STRIPE_SECRET_KEY.", icon: Zap },
  ];

  return (
    <div className="p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">Pagos</h1><p className="text-sm text-muted-foreground">Configura el modo de pago</p></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <Card key={m.id} className={`cursor-pointer transition-all ${active ? "ring-2 ring-primary" : "hover:border-muted-foreground/30"}`} onClick={() => setMode(m.id)}>
              <CardContent className="pt-5">
                <Icon className={`h-6 w-6 mb-3 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="font-medium text-sm">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {mode === "card" && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tarjetas aceptadas</CardTitle></CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Un numero por linea, sin espacios.</p>
            <textarea value={cards} onChange={(e) => setCards(e.target.value)} className="w-full h-24 p-3 rounded-md border bg-background font-mono text-sm resize-none" placeholder="4242424242424242" />
          </CardContent>
        </Card>
      )}

      {mode === "stripe" && (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm">Stripe usa la tarjeta <code className="font-mono bg-muted px-1.5 py-0.5 rounded">4242 4242 4242 4242</code> en modo test.</p>
            <p className="text-xs text-muted-foreground mt-2">Requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET en las variables de entorno del backend.</p>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "Guardar configuracion"}</Button>
    </div>
  );
}
