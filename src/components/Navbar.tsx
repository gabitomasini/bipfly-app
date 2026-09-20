"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Plane, Settings, RefreshCw, BarChart2, Terminal, Sparkles, Zap, LogIn, LogOut } from "lucide-react";
import { SchedulerStatus, AppSettings } from "@/lib/types";
import Tooltip from "@/components/Tooltip";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { useScanning } from "@/context/ScanningContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface NavbarProps {
  onSearchTriggered?: () => void;
}

export default function Navbar({ onSearchTriggered }: NavbarProps) {
  const pathname = usePathname();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const { user, logout, openAuthModal } = useAuth();
  const { isScanning, scanAllRoutes } = useScanning();
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const fetchStatusAndSettings = async () => {
    try {
      const [schRes, setRes] = await Promise.all([
        fetch("/api/scheduler").then((r) => r.json()).catch(() => null),
        fetch("/api/settings").then((r) => r.json()).catch(() => null),
      ]);
      if (schRes?.success) setSchedulerStatus(schRes.data);
      if (setRes?.success) setAppSettings(setRes.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchStatusAndSettings();
    const interval = setInterval(fetchStatusAndSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAllNow = async () => {
    const success = await scanAllRoutes();
    if (success) {
      onSearchTriggered?.();
    }
    fetchStatusAndSettings();
  };

  const navLinks = [
    { href: "/", label: t.nav.dashboard, icon: Sparkles },
    { href: "/routes", label: t.nav.routes, icon: Plane },
    { href: "/history", label: t.nav.history, icon: BarChart2 },
    { href: "/settings", label: t.nav.settings, icon: Settings },
    { href: "/logs", label: t.nav.logs, icon: Terminal },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link
            href="/"
            className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:shadow-lg group-hover:shadow-sky-500/30 group-hover:scale-105 transition-all">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-slate-900 group-hover:text-sky-600 transition-colors">
                  Flight Radar
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-700">
                  {t.nav.badge}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 font-medium -mt-0.5">
                {t.nav.subtitle}
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Auth status + Language Switcher + Search Trigger CTA */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* User Auth State */}
            {user ? (
              <div className="flex items-center gap-1.5 bg-slate-100/90 py-1 pl-2.5 pr-1.5 rounded-xl border border-slate-200/70 text-xs text-slate-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate text-slate-800 font-semibold" title={user.email}>
                  {user.name || user.email.split("@")[0]}
                </span>
                <Tooltip content={t.auth.logoutTooltip} position="bottom">
                  <button
                    onClick={() => logout()}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    aria-label={t.auth.logout}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal({ mode: "login" })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">{t.auth.alreadyMonitor}</span>
                <span>{t.auth.login}</span>
              </button>
            )}

            <LanguageSwitcher />

            <Tooltip content={t.nav.scanAllTooltip} position="bottom">
              <button
                onClick={handleRunAllNow}
                disabled={isScanning}
                className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:translate-y-0 ${
                  isScanning
                    ? "bg-violet-50 border border-violet-200 text-violet-700"
                    : "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/35 hover:-translate-y-0.5"
                } disabled:opacity-75 disabled:hover:translate-y-0`}
              >
                {isScanning ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600 shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                )}
                <span className="hidden sm:inline">
                  {isScanning ? t.nav.scanning : t.nav.scanAll}
                </span>
                <span className="sm:hidden">
                  {isScanning ? "..." : t.nav.scanAll}
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
