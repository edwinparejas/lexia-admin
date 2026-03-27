"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Key, CreditCard, Zap, Shield, CheckCircle2, Save,
  AlertTriangle, Info, ExternalLink,
} from "lucide-react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PaymentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mode = searchParams.get("mode") || "code";
  const setMode = (value) => router.replace(`${pathname}?mode=${value}`, { scroll: false });
  const [cards, setCards] = useState("4242424242424242");

  async function loadConfig() {
    setLoading(true);
    try {
      const d = await apiFetch("/api/admin/payment-config");
      if (d) {
        setConfig(d);
        if (!searchParams.get("mode")) setMode(d.mode || "code");
        setCards((d.accepted_cards || ["4242424242424242"]).join("\n"));
      }
    } catch {} finally { setLoading(false); }
  }
  useEffect(() => { loadConfig(); }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const cardList = cards.split("\n").map((c) => c.trim().replace(/\s/g, "")).filter(Boolean);
      await apiFetch("/api/admin/config/payment_config", {
        method: "PUT",
        body: JSON.stringify({
          value: {
            mode,
            mock_card: { number: cardList[0] || "4242424242424242", enabled: mode === "card" },
            accepted_cards: cardList,
            stripe: { enabled: mode === "stripe" },
          },
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      loadConfig();
    } catch {} finally { setSaving(false); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <CreditCard className="h-8 w-8 text-muted-foreground animate-pulse mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Cargando configuración de pagos...</p>
        </div>
      </div>
    );
  }

  const modes = [
    {
      id: "code",
      label: "Código de activación",
      desc: "Generas códigos manualmente y los compartes con los usuarios. Ideal para pruebas internas y clientes directos.",
      icon: Key,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      pros: ["Control total sobre quién accede", "Sin integración de pagos", "Ideal para beta"],
    },
    {
      id: "card",
      label: "Tarjeta simulada",
      desc: "Simula el flujo de pago con tarjetas de prueba. Los usuarios ven un formulario real pero el cobro es ficticio.",
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      pros: ["Experiencia realista para demos", "Sin cargos reales", "Configurable"],
    },
    {
      id: "stripe",
      label: "Stripe (pagos reales)",
      desc: "Integración completa con Stripe Checkout. Los usuarios pagan con tarjeta real y el plan se activa automáticamente.",
      icon: Zap,
      color: "text-green-400",
      bg: "bg-green-500/10",
      pros: ["Cobros reales automáticos", "Stripe Dashboard completo", "Webhooks configurados"],
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Pagos</h1>
        <p className="text-sm text-muted-foreground">
          Selecciona cómo los usuarios activan sus planes de suscripción
        </p>
      </div>

      {/* Current mode indicator */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">Modo actual:</span>
        <Badge className={`${modes.find((m) => m.id === mode)?.bg || ""} ${modes.find((m) => m.id === mode)?.color || ""}`}>
          {modes.find((m) => m.id === mode)?.label || mode}
        </Badge>
        {saved && (
          <Badge className="bg-green-500/10 text-green-400 ml-auto">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Guardado
          </Badge>
        )}
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {modes.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <Card
              key={m.id}
              className={`cursor-pointer transition-all ${
                active ? "ring-2 ring-primary border-primary" : "hover:border-muted-foreground/30"
              }`}
              onClick={() => setMode(m.id)}
            >
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${m.color}`} />
                  </div>
                  {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.desc}</p>
                </div>
                <ul className="space-y-1">
                  {m.pros.map((p, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Mode-specific config */}
      {mode === "card" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Tarjetas aceptadas
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Números de tarjeta que el sistema acepta como válidos. Un número por línea, sin espacios ni guiones.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={cards}
              onChange={(e) => setCards(e.target.value)}
              className="w-full h-24 p-3 rounded-lg border bg-muted font-mono text-sm resize-none focus:border-primary focus:outline-none"
              placeholder="4242424242424242"
            />
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>El primer número de la lista se usa como tarjeta por defecto en el formulario de pago.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "stripe" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Configuración de Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-medium">Modo Test</p>
              <p className="text-xs text-muted-foreground">
                Usa la tarjeta <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">4242 4242 4242 4242</code> para simular pagos exitosos.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-xs text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Variables de entorno requeridas:</p>
                <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                  <li>STRIPE_SECRET_KEY</li>
                  <li>STRIPE_WEBHOOK_SECRET</li>
                </ul>
                <p className="mt-1 text-muted-foreground">Configúralas en EasyPanel antes de activar este modo.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "code" && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 text-xs text-blue-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Gestión de códigos</p>
                <p className="mt-1 text-muted-foreground">
                  Los códigos de activación se crean y administran desde la sección <strong>Códigos</strong> del menú lateral.
                  Cada código tiene un plan y cantidad de usos asociados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
        <Save className="h-4 w-4 mr-2" />
        {saving ? "Guardando..." : "Guardar configuración"}
      </Button>
    </div>
  );
}
