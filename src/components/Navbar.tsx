"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Plane, Compass, Settings, RefreshCw, BarChart2, Terminal } from "lucide-react";
import { SchedulerStatus, AppSettings } from "@/lib/types";

interface NavbarProps {
  onSearchTriggered?: () => void;
}

export default function Navbar({ onSearchTriggered }: NavbarProps) {
  const pathname = usePathname();
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

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
    setFeedbackMsg("Consultando passagens de todas as rotas...");
    try {
      const res = await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
      const json = await res.json();
      if (json.success) {
        const successes = json.data?.successes ?? json.data?.sucessos ?? 0;
        setFeedbackMsg(`Varredura concluída! ${successes} rota(s) atualizadas.`);
        fetchStatusAndSettings();
        if (onSearchTriggered) onSearchTriggered();
      } else {
        setFeedbackMsg(`Erro: ${json.error || "Falha na busca"}`);
      }
    } catch (err: any) {
      setFeedbackMsg(`Erro de conexão: ${err.message}`);
    } finally {
      setIsSearching(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-900 text-white group-hover:bg-slate-800 transition-colors">
              <Plane className="w-4 h-4 transform -rotate-45" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900">
              Radar de Passagens
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-slate-900" : "text-slate-400"}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Action: Search Now */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAllNow}
              disabled={isSearching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition-colors disabled:opacity-50"
              title="Executar varredura agora para todas as rotas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? "animate-spin text-sky-600" : "text-slate-500"}`} />
              <span>{isSearching ? "Buscando..." : "Buscar Todos"}</span>
            </button>
          </div>
        </div>

        {/* Feedback Bar */}
        {feedbackMsg && (
          <div className="py-2 px-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-900 my-1.5 flex items-center justify-between animate-fadeIn">
            <span>{feedbackMsg}</span>
            <button
              onClick={() => setFeedbackMsg(null)}
              className="text-sky-600 hover:text-sky-800 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
