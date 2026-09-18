"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Plane, Settings, RefreshCw, BarChart2, Terminal, Sparkles, Zap } from "lucide-react";
import { SchedulerStatus, AppSettings } from "@/lib/types";
import Tooltip from "@/components/Tooltip";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/lib/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface NavbarProps {
  onSearchTriggered?: () => void;
}

export default function Navbar({ onSearchTriggered }: NavbarProps) {
  const pathname = usePathname();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isSearching, setIsSearching] = useState(false);

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
    setIsSearching(true);
    addToast(`${t.toasts.searchStarted} ${t.toasts.searchStartedDesc}`, "info");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        addToast(
          `${t.toasts.searchStarted} ${t.toasts.searchStartedDesc}`,
          "success"
        );
        onSearchTriggered?.();
      } else {
        addToast(data.error || t.toasts.searchFailed, "error");
      }
    } catch {
      addToast(t.toasts.connError, "error");
    } finally {
      setIsSearching(false);
      fetchStatusAndSettings();
    }
  };

  const navLinks = [
    { href: "/", label: t.nav.dashboard, icon: BarChart2 },
    { href: "/routes", label: t.nav.routes, icon: Plane },
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

          {/* Right Actions: Language Switcher + Search Trigger CTA */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <LanguageSwitcher />

            <Tooltip content={t.nav.scanAllTooltip}>
              <button
                onClick={handleRunAllNow}
                disabled={isSearching}
                className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:translate-y-0 ${
                  isSearching
                    ? "bg-violet-50 border border-violet-200 text-violet-700"
                    : "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 text-white shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/35 hover:-translate-y-0.5"
                } disabled:opacity-75 disabled:hover:translate-y-0`}
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600 shrink-0" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                )}
                <span className="hidden sm:inline">
                  {isSearching ? t.nav.scanning : t.nav.scanAll}
                </span>
                <span className="sm:hidden">
                  {isSearching ? "..." : t.nav.scanAll}
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
