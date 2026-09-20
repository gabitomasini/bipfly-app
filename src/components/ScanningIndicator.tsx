"use client";

import React, { useEffect, useState } from "react";
import { useScanning } from "@/context/ScanningContext";
import { useTranslation } from "@/lib/i18n/context";
import { RefreshCw, CheckCircle2, Plane, Sparkles } from "lucide-react";

export default function ScanningIndicator() {
  const { isScanning, activeRouteLabel, elapsedSeconds, isCompleted } = useScanning();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!isScanning && !isCompleted) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}s`;
  };

  return (
    <>
      {/* Top Slim Scanning Glow Bar */}
      {isScanning && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[110] bg-slate-900 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-sky-400 via-violet-500 to-fuchsia-500 animate-pulse" />
        </div>
      )}

      {/* Floating Status Card (Desktop & Mobile) */}
      <aside
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[95] max-w-sm w-[calc(100%-2rem)] sm:w-88 transition-all duration-300 ease-out transform translate-y-0"
      >
        {isScanning ? (
          <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-sky-950/40 relative overflow-hidden flex flex-col gap-2.5 animate-fadeIn">
            {/* Shimmer background accent */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500" />

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
                </span>
                <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  {t.scanning.inProgress}
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold bg-slate-800/90 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700/60">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <Plane className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  {t.scanning.activeTitle}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-300 truncate mt-0.5">
                  {activeRouteLabel
                    ? `${t.scanning.scanningRoute} ${activeRouteLabel}`
                    : t.scanning.activeSubtitle}
                </p>
              </div>
            </div>

            {/* Indeterminate Animated Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden relative mt-0.5">
              <div className="h-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 rounded-full w-2/3 animate-pulse" />
            </div>
          </div>
        ) : isCompleted ? (
          <div className="bg-slate-900/95 backdrop-blur-md text-white border border-emerald-500/40 rounded-2xl p-3.5 sm:p-4 shadow-2xl shadow-emerald-950/40 relative overflow-hidden flex items-center gap-3 animate-fadeIn">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                <span>{t.scanning.completed}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {t.scanning.completedDesc}
              </p>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
