"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bell, Send, Users, AlertCircle, Info, AlertTriangle,
  CheckCircle, RefreshCw,
} from "lucide-react";

const TYPE_OPTIONS = [
  { value: "info", label: "Informacion", icon: Info, color: "text-blue-400" },
  { value: "warning", label: "Advertencia", icon: AlertTriangle, color: "text-yellow-400" },
  { value: "alert", label: "Alerta", icon: AlertCircle, color: "text-red-400" },
];

export default function NotificationsPage() {
  // Individual notification state
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Broadcast state
  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bType, setBType] = useState("info");
  const [bSending, setBSending] = useState(false);
  const [bResult, setBResult] = useState(null);
  const [confirmBroadcast, setConfirmBroadcast] = useState(false);
  const [userCount, setUserCount] = useState(null);

  // Recent notifications
  const [recentLogs, setRecentLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchRecentLogs();
  }, []);

  async function fetchRecentLogs() {
    setLoadingLogs(true);
    try {
      const res = await apiFetch("/api/admin/audit-log?action=admin.notify&limit=20");
      const broadcastRes = await apiFetch("/api/admin/audit-log?action=admin.broadcast&limit=20");
      const all = [...(res?.logs || []), ...(broadcastRes?.logs || [])];
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentLogs(all.slice(0, 20));
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSendNotification(e) {
    e.preventDefault();
    if (!userId || !title || !message) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await apiFetch("/api/admin/notify", {
        method: "POST",
        body: JSON.stringify({ user_id: userId, title, message, type }),
      });
      setSendResult({ ok: true, message: res?.message || "Notificacion enviada" });
      setUserId("");
      setTitle("");
      setMessage("");
      setType("info");
      fetchRecentLogs();
    } catch (err) {
      setSendResult({ ok: false, message: err.message || "Error al enviar" });
    } finally {
      setSending(false);
    }
  }

  async function handleBroadcast(e) {
    e.preventDefault();
    if (!bTitle || !bMessage) return;

    if (!confirmBroadcast) {
      // Fetch user count for confirmation
      try {
        const res = await apiFetch("/api/admin/users?limit=1");
        setUserCount(res?.total || res?.count || "todos los");
      } catch {
        setUserCount("todos los");
      }
      setConfirmBroadcast(true);
      return;
    }

    setBSending(true);
    setBResult(null);
    try {
      const res = await apiFetch("/api/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ title: bTitle, message: bMessage, type: bType }),
      });
      setBResult({ ok: true, message: res?.message || "Broadcast enviado" });
      setBTitle("");
      setBMessage("");
      setBType("info");
      setConfirmBroadcast(false);
      fetchRecentLogs();
    } catch (err) {
      setBResult({ ok: false, message: err.message || "Error al enviar" });
    } finally {
      setBSending(false);
    }
  }

  const inputClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Enviar notificaciones a usuarios individuales o a todos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Send to specific user */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Enviar a usuario especifico
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  User ID
                </label>
                <Input
                  placeholder="UUID del usuario"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Titulo
                </label>
                <Input
                  placeholder="Titulo de la notificacion"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Mensaje
                </label>
                <textarea
                  className={inputClass + " min-h-[80px] py-2"}
                  placeholder="Contenido del mensaje"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Tipo
                </label>
                <select
                  className={selectClass}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="sm" disabled={sending} className="w-full">
                {sending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar notificacion
              </Button>
              {sendResult && (
                <div className={`flex items-center gap-2 text-xs ${sendResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {sendResult.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {sendResult.message}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Section 2: Broadcast */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Broadcast a todos los usuarios
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBroadcast} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Titulo
                </label>
                <Input
                  placeholder="Titulo del broadcast"
                  value={bTitle}
                  onChange={(e) => { setBTitle(e.target.value); setConfirmBroadcast(false); }}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Mensaje
                </label>
                <textarea
                  className={inputClass + " min-h-[80px] py-2"}
                  placeholder="Contenido del mensaje"
                  value={bMessage}
                  onChange={(e) => { setBMessage(e.target.value); setConfirmBroadcast(false); }}
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Tipo
                </label>
                <select
                  className={selectClass}
                  value={bType}
                  onChange={(e) => { setBType(e.target.value); setConfirmBroadcast(false); }}
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {confirmBroadcast && (
                <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Enviar a {userCount} usuarios? Presiona de nuevo para confirmar.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={bSending}
                className="w-full"
                variant={confirmBroadcast ? "destructive" : "default"}
              >
                {bSending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                {confirmBroadcast ? "Confirmar broadcast" : "Enviar broadcast"}
              </Button>
              {bResult && (
                <div className={`flex items-center gap-2 text-xs ${bResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {bResult.ok ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {bResult.message}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Recent notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">
                Notificaciones recientes enviadas
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRecentLogs} disabled={loadingLogs}>
              <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay notificaciones recientes
            </p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log, i) => (
                <div
                  key={log.id || i}
                  className="flex items-center justify-between p-2 rounded-md bg-accent/50 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {log.action === "admin.broadcast" ? "Broadcast" : "Individual"}
                    </Badge>
                    <span className="truncate text-xs">
                      {log.details?.title || log.action}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
