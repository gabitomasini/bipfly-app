"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Plane, Settings, RefreshCw, BarChart2, Terminal, Sparkles } from "lucide-react";
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
        fetch("/api/scheduler").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]);

      if (schRes?.success) setSchedulerStatus(schRes.data);
      if (setRes?.success) setAppSettings(setRes.data);
    } catch {}
  };

  useEffect(() => {
    fetchStatusAndSettings();
    const interval = setInterval(fetchStatusAndSettings, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAllNow = async () => {
    setIsSearching(true);
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
    }
  };

  const navLinks = [
    { href: "/", label: t.nav.dashboard, icon: Sparkles },
    { href: "/routes", label: t.nav.routes, icon: Plane },
    { href: "/history", label: t.nav.history, icon: BarChart2 },
    { href: "/logs", label: t.nav.logs, icon: Terminal },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0 transition-opacity hover:opacity-90"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Plane className="w-5 h-5 -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-slate-900 tracking-tight">
                  {t.nav.brand}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60">
                  {t.nav.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                {t.nav.subtitle}
              </p>
            </div>
          </Link>

          {/* Navigation Links with Active Indicator Pill */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60 overflow-x-auto max-w-full">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap select-none ${
                    isActive
                      ? "bg-white text-slate-900 shadow-2xs font-bold ring-1 ring-slate-900/5"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-sky-600 font-bold" : "text-slate-400"
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isSearching
                    ? "bg-sky-50 border border-sky-200 text-sky-700"
                    : "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white"
                } disabled:opacity-75`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isSearching ? "animate-spin text-sky-600" : "text-slate-300"
                  }`}
                />
                <span className="hidden sm:inline">
                  {isSearching ? t.nav.scanning : t.nav.scanAll}
                </span>
                <span className="sm:hidden">
                  {isSearching ? "..." : t.common.refresh}
                </span>
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
