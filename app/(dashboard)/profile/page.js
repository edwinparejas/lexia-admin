"use client";

import { useState, useEffect } from "react";
import { getSession } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Shield, Lock, Eye, EyeOff, Calendar, Save, Check } from "lucide-react";

export default function ProfilePage() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passErrors, setPassErrors] = useState({});
  const [passShake, setPassShake] = useState(false);
  const newPassRef = require("react").useRef(null);
  const confirmPassRef = require("react").useRef(null);
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const session = await getSession();
        if (!session) return;
        const { apiFetch } = await import("@/lib/auth");
        const data = await apiFetch("/api/me");
        setUser(data);
        setName(data?.name || "");
      } catch {}
    }
    load();
  }, []);

  async function handleSaveName(e) {
    e.preventDefault();
    setNameLoading(true);
    try {
      const { apiFetch } = await import("@/lib/auth");
      await apiFetch("/api/me", { method: "PUT", body: JSON.stringify({ name }) });
      toast("Nombre actualizado", "success");
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 2000);
    } catch {
      toast("Error al actualizar el nombre", "error");
    } finally {
      setNameLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const errors = {};
    if (!newPass) {
      errors.newPass = "Ingresa una nueva contraseña";
    } else if (newPass.length < 6) {
      errors.newPass = "La contraseña debe tener al menos 6 caracteres";
    }
    if (!confirmPass) {
      errors.confirmPass = "Confirma tu nueva contraseña";
    } else if (newPass && newPass !== confirmPass) {
      errors.confirmPass = "Las contraseñas no coinciden";
    }
    if (Object.keys(errors).length > 0) {
      setPassErrors(errors);
      setPassShake(true);
      setTimeout(() => setPassShake(false), 500);
      if (errors.newPass) newPassRef.current?.focus();
      else if (errors.confirmPass) confirmPassRef.current?.focus();
      return;
    }
    setPassErrors({});
    setPassLoading(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast("Contraseña actualizada correctamente", "success");
      setNewPass("");
      setConfirmPass("");
      setPassSuccess(true);
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err) {
      toast(err.message || "Error al cambiar la contraseña", "error");
    } finally {
      setPassLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <User className="h-8 w-8 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  const initials = (user.name || user.identifier || "A").slice(0, 2).toUpperCase();

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Administra tu cuenta y seguridad</p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Informacion personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Avatar + basic info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-xl font-bold text-primary">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold">{user.name || "Sin nombre"}</p>
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Admin</Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.identifier}
              </p>
              {user.created_at && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  Cuenta creada el {new Date(user.created_at).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Edit name */}
          <form onSubmit={handleSaveName} className="space-y-3">
            <label className="text-sm font-medium block">Nombre</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="flex-1 px-3 py-2 bg-muted border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" disabled={nameLoading || name === user.name}>
                {nameSuccess ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4 mr-1" />}
                {nameSuccess ? "Guardado" : nameLoading ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Cambiar contraseña
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className={`space-y-4 ${passShake ? "animate-shake" : ""}`}>
            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${passErrors.newPass ? "text-destructive" : ""}`}>Nueva contraseña</label>
              <div className="relative">
                <input
                  ref={newPassRef}
                  type={showPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => { setNewPass(e.target.value); setPassErrors((p) => ({ ...p, newPass: undefined })); }}
                  placeholder="Minimo 6 caracteres"
                  className={`w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:outline-none pr-10 transition-colors ${passErrors.newPass ? "border-destructive focus:border-destructive ring-2 ring-destructive/20" : "focus:border-primary"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passErrors.newPass && <p className="text-xs text-destructive mt-1">{passErrors.newPass}</p>}
            </div>
            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${passErrors.confirmPass ? "text-destructive" : ""}`}>Confirmar contraseña</label>
              <input
                ref={confirmPassRef}
                type="password"
                value={confirmPass}
                onChange={(e) => { setConfirmPass(e.target.value); setPassErrors((p) => ({ ...p, confirmPass: undefined })); }}
                placeholder="Repite la nueva contraseña"
                className={`w-full px-3 py-2 bg-muted border rounded-lg text-sm focus:outline-none transition-colors ${passErrors.confirmPass ? "border-destructive focus:border-destructive ring-2 ring-destructive/20" : "focus:border-primary"}`}
              />
              {passErrors.confirmPass && <p className="text-xs text-destructive mt-1">{passErrors.confirmPass}</p>}
            </div>
            <Button type="submit" disabled={passLoading}>
              {passSuccess ? (
                <><Check className="h-4 w-4 mr-1" /> Contraseña actualizada</>
              ) : (
                <><Lock className="h-4 w-4 mr-1" /> {passLoading ? "Cambiando..." : "Cambiar contraseña"}</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Informacion de la cuenta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Rol</p>
              <p className="font-medium capitalize">{user.role || "admin"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Plan</p>
              <p className="font-medium capitalize">{user.plan || "trial"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Consultas</p>
              <p className="font-medium">{user.queries_used || 0} / {user.queries_limit === -1 ? "∞" : user.queries_limit || 10}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Canal</p>
              <p className="font-medium">{user.channel || "web"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
