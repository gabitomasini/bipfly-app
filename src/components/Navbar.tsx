"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Plane, Compass, Settings, RefreshCw, BarChart2, Terminal, Sparkles } from "lucide-react";
import { SchedulerStatus, AppSettings } from "@/lib/types";
import { useToast } from "@/components/Toast";

interface NavbarProps {
  onSearchTriggered?: () => void;
}

export default function Navbar({ onSearchTriggered }: NavbarProps) {
  const pathname = usePathname();
  const { addToast } = useToast();
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const fetchStatusAndSettings = async () => {
    try {
      const [schRes, setRes] = await Promise.all([
        fetch("/api/scheduler").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]);

      if (schRes?.success) setSchedulerStatus(schRes.data);
      if (setRes?.success) setAppSettings(setRes.data);
    } catch {}
  };

  useEffect(() => {
    fetchStatusAndSettings();
    const interval = setInterval(fetchStatusAndSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAllNow = async () => {
    if (isSearching) return;
    setIsSearching(true);
    addToast("Consultando passagens de todas as rotas...", "info");
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
      const json = await res.json();
      if (json.success) {
        const successes = json.data?.successes ?? json.data?.sucessos ?? 0;
        addToast(`Varredura concluída! ${successes} rota(s) atualizadas.`, "success");
        fetchStatusAndSettings();
        if (onSearchTriggered) onSearchTriggered();
      } else {
        addToast(`Erro: ${json.error || "Falha na busca"}`, "error");
      }
    } catch (err: any) {
      addToast(`Erro de conexão: ${err.message}`, "error");
    } finally {
      setIsSearching(false);
    }
  };

  const navLinks = [
    { href: "/", label: "Dashboard", icon: Compass },
    { href: "/rotas", label: "Rotas", icon: Plane },
    { href: "/historico", label: "Histórico", icon: BarChart2 },
    { href: "/logs", label: "Logs", icon: Terminal },
    { href: "/configuracoes", label: "Ajustes", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 gap-4">
          {/* Brand / Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group py-1">
            <div className="flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-slate-900 text-white shadow-xs group-hover:bg-sky-600 transition-colors">
              <Plane className="w-4.5 h-4.5 transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-slate-900">
                  Radar de Passagens
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                  SaaS
                </span>
              </div>
            </div>
          </Link>

          {/* Navigation Links - Centered & Prominent active state */}
          <nav className="hidden md:flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 transition-colors ${
                      isActive ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Search Trigger CTA */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleRunAllNow}
              disabled={isSearching}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                isSearching
                  ? "bg-sky-50 border border-sky-200 text-sky-700"
                  : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white"
              } disabled:opacity-75`}
              title="Executar varredura agora para todas as rotas ativas"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSearching ? "animate-spin text-sky-600" : "text-slate-300"
                }`}
              />
              <span>{isSearching ? "Varrendo rotas..." : "Buscar Todos"}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
