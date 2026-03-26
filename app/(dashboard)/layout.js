"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getSession, apiFetch } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, Users, Key, Settings, CreditCard, ScrollText, FileText,
  Database, Shield, ChevronLeft, Sun, Moon, LogOut, Bell,
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
  ]},
  { label: "CONTENIDO", items: [
    { href: "/documents", icon: FileText, label: "Documentos" },
    { href: "/indexing", icon: Database, label: "Base Legal" },
  ]},
  { label: "SISTEMA", items: [
    { href: "/audit", icon: ScrollText, label: "Audit Log" },
  ]},
];

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
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
            {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>

        <Separator />

        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-semibold text-muted-foreground tracking-wider mb-1">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/";
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

        <div className="p-2">
          <p className="px-3 text-[10px] text-muted-foreground truncate mb-1">{user?.identifier}</p>
          <Link
            href={process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://lexia-three.vercel.app/dashboard"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-[13px] text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Ir al dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
