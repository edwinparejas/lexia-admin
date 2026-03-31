"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSession, apiFetch } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Users, Key, Settings, CreditCard, ScrollText, FileText,
  Database, Shield, ChevronLeft, Sun, Moon, LogOut, Bell, Activity,
  ChevronUp, Lock, ExternalLink, User, Cpu, BookOpen, Sparkles,
} from "lucide-react";

const NAV = [
  { label: "GENERAL", items: [
    { href: "/", icon: BarChart3, label: "Metricas", exact: true },
    { href: "/users", icon: Users, label: "Usuarios" },
  ]},
  { label: "GESTION", items: [
    { href: "/codes", icon: Key, label: "Codigos" },
    { href: "/config", icon: Settings, label: "Configuracion" },
    { href: "/payments", icon: CreditCard, label: "Pagos" },
    { href: "/notifications", icon: Bell, label: "Notificaciones" },
  ]},
  { label: "CONTENIDO", items: [
    { href: "/documents", icon: FileText, label: "Documentos" },
    { href: "/indexing", icon: Database, label: "Base Legal" },
    { href: "/indexing/templates", icon: BookOpen, label: "Plantillas" },
  ]},
  { label: "SISTEMA", items: [
    { href: "/providers", icon: Cpu, label: "Proveedores LLM" },
    { href: "/cache", icon: Sparkles, label: "Cache IA" },
    { href: "/audit", icon: ScrollText, label: "Audit Log" },
    { href: "/health", icon: Activity, label: "Salud del Sistema" },
  ]},
];

function AdminUserMenu({ user, darkMode, toggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = require("react").useRef(null);
  const pathname = usePathname();

  require("react").useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const initials = (user?.name || user?.identifier || "A").slice(0, 2).toUpperCase();

  return (
    <div className="relative p-2" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-left ${open ? "bg-accent" : "hover:bg-accent/50"}`}
      >
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium truncate">{user?.name || "Admin"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{user?.identifier}</p>
        </div>
        <ChevronUp className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover text-popover-foreground border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || "Admin"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.identifier}</p>
              </div>
            </div>
          </div>
          <div className="py-1">
            <Link href="/profile" onClick={() => setOpen(false)} className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${pathname === "/profile" ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}>
              <User className="h-4 w-4" />
              Mi perfil
            </Link>
            <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors text-left">
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {darkMode ? "Modo claro" : "Modo oscuro"}
            </button>
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://lexia-pe.vercel.app/dashboard"}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Ir al dashboard usuario
            </a>
          </div>
          <Separator />
          <div className="py-1">
            <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left">
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("lexia_admin_theme");
    if (saved === "light") {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("lexia_admin_theme", next ? "dark" : "light");
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function handleLogout() {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      await sb.auth.signOut();
    } catch {}
    router.push("/login");
  }

  useEffect(() => {
    async function checkAuth() {
      try {
        const session = await getSession();
        if (!session) { router.replace("/login"); return; }
        const me = await apiFetch("/api/me");
        if (!me || me.role !== "admin") { router.replace("/login"); return; }
        setUser(me);
      } catch { router.replace("/login"); }
      finally { setLoading(false); }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Shield className="h-8 w-8 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <ToastProvider>
    <ConfirmProvider>
    <div className="flex h-screen bg-background">
      <aside className="w-56 border-r bg-card flex flex-col shrink-0">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
                <path d="M7 21h10"/><path d="M12 3v18"/>
                <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>
              </svg>
            </div>
            <span className="font-bold text-sm">LexIA Admin</span>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? pathname === item.href
                    : item.href === "/indexing"
                      ? pathname === "/indexing"
                      : pathname.startsWith(item.href) && item.href !== "/";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Separator />

        <AdminUserMenu user={user} darkMode={darkMode} toggleTheme={toggleTheme} onLogout={handleLogout} />
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
    </ConfirmProvider>
    </ToastProvider>
  );
}
