"use client";

import React, { useEffect, useState } from "react";
import { useScanning } from "@/context/ScanningContext";
import { useTranslation } from "@/lib/i18n/context";
import { RefreshCw, CheckCircle2, Plane, Sparkles, History } from "lucide-react";

export default function ScanningIndicator() {
  const { isScanning, activeRouteLabel, customTitle, elapsedSeconds, isCompleted } = useScanning();
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

  const isHistoryImport = customTitle?.toLowerCase().includes("histórico") || customTitle?.toLowerCase().includes("history");

  return (
    <>
      {/* Top Slim Scanning Progress Bar */}
      {isScanning && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[110] bg-slate-200/80 overflow-hidden">
          <div className="h-full w-2/5 bg-gradient-to-r from-sky-400 via-indigo-600 to-sky-400 rounded-full animate-progress-indeterminate shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
        </div>
      )}

      {/* Floating Status Card (Desktop & Mobile) */}
      <aside
        aria-live="polite"
        className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[95] max-w-sm w-[calc(100%-2rem)] sm:w-88 transition-all duration-300 ease-out transform translate-y-0"
      >
        {isScanning ? (
          <div className="bg-white/95 backdrop-blur-md text-slate-900 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden flex flex-col gap-2.5 animate-fadeIn">
            {/* Top Accent Animated Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 animate-progress-indeterminate" />
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                </span>
                <span className="text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                  <span>{t.scanning.inProgress}</span>
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                {formatTimer(elapsedSeconds)}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 mt-0.5 shadow-2xs">
                {isHistoryImport ? (
                  <History className="w-4.5 h-4.5 animate-pulse" />
                ) : (
                  <Plane className="w-4.5 h-4.5 animate-pulse" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                  {customTitle || t.scanning.activeTitle}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5 font-medium">
                  {activeRouteLabel
                    ? activeRouteLabel.startsWith("Rota") || activeRouteLabel.includes("→") || activeRouteLabel.includes("•")
                    ? activeRouteLabel
                    : `${t.scanning.scanningRoute} ${activeRouteLabel}`
                    : t.scanning.activeSubtitle}
                </p>
              </div>
            </div>

            {/* Indeterminate Animated Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden relative border border-slate-200/60">
              <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-sky-400 via-indigo-600 to-sky-400 rounded-full animate-progress-indeterminate shadow-sm" />
            </div>
          </div>
        ) : isCompleted ? (
          <div className="bg-white/95 backdrop-blur-md text-slate-900 border border-emerald-200 rounded-2xl p-3.5 sm:p-4 shadow-xl relative overflow-hidden flex items-center gap-3 animate-fadeIn">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                <span>{t.scanning.completed}</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                {t.scanning.completedDesc}
              </p>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
