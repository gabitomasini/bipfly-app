"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MonitoredRoute, SchedulerStatus } from "@/lib/types";
import { Plane, TrendingDown, Target, Clock, ArrowUpRight, CheckCircle2, Zap, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useScanning } from "@/context/ScanningContext";
import Tooltip from "@/components/Tooltip";

interface MetricCardsProps {
  routes: MonitoredRoute[];
  schedulerStatus?: SchedulerStatus | null;
  loading?: boolean;
}

export default function MetricCards({ routes, schedulerStatus, loading = false }: MetricCardsProps) {
  const router = useRouter();
  const { t, formatCurrency, formatUsdEstimate, locale } = useTranslation();
  const { isScanning, scanAllRoutes } = useScanning();
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const totalCount = routes.length;
  const activeRoutes = routes.filter((r) => r.isActive);
  const activeCount = activeRoutes.length;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const onTargetRoutes = routes.filter(
    (r) => r.isActive && r.latestPrice !== null && r.latestPrice !== undefined && r.latestPrice <= r.targetPrice
  );
  const onTargetCount = onTargetRoutes.length;

  let lowestOverallPrice: number | null = null;
  let lowestPriceRoute: MonitoredRoute | null = null;

  for (const r of routes) {
    if (r.latestPrice !== null && r.latestPrice !== undefined) {
      if (lowestOverallPrice === null || r.latestPrice < lowestOverallPrice) {
        lowestOverallPrice = r.latestPrice;
        lowestPriceRoute = r;
      }
    }
  }

  // Next run date computation
  const nextRunDate = useMemo(() => {
    if (schedulerStatus?.nextRun) {
      const d = new Date(schedulerStatus.nextRun);
      if (!isNaN(d.getTime())) return d;
    }
    const hours = schedulerStatus?.scheduleHours || ["03:00", "14:00"];
    const parsed = hours
      .map((h) => {
        const [hh, mm] = h.split(":").map(Number);
        return { str: h, mins: hh * 60 + mm };
      })
      .sort((a, b) => a.mins - b.mins);

    const currentMins = now.getHours() * 60 + now.getMinutes();
    for (const item of parsed) {
      if (item.mins > currentMins) {
        const d = new Date(now);
        const [hh, mm] = item.str.split(":").map(Number);
        d.setHours(hh, mm, 0, 0);
        return d;
      }
    }
    const first = parsed[0] || { str: "03:00" };
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    const [hh, mm] = first.str.split(":").map(Number);
    d.setHours(hh, mm, 0, 0);
    return d;
  }, [schedulerStatus?.nextRun, schedulerStatus?.scheduleHours, now]);

  // Format next run time
  const nextRunText = nextRunDate.toLocaleTimeString(locale === "pt" ? "pt-BR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: locale === "en",
  });

  const isSchedulerActive = schedulerStatus?.running !== false;

  // Real progress and remaining time calculation
  const { progressPercent, remainingMs } = useMemo(() => {
    const hours = schedulerStatus?.scheduleHours?.length
      ? schedulerStatus.scheduleHours
      : ["03:00", "14:00"];

    const sortedMins = hours
      .map((h) => {
        const [hh, mm] = h.split(":").map(Number);
        return hh * 60 + mm;
      })
      .sort((a, b) => a - b);

    const nextHour = nextRunDate.getHours();
    const nextMin = nextRunDate.getMinutes();
    const nextTotalMins = nextHour * 60 + nextMin;

    let idx = sortedMins.indexOf(nextTotalMins);
    if (idx === -1) {
      idx = sortedMins.findIndex((m) => m >= nextTotalMins);
      if (idx === -1) idx = 0;
    }

    const prevIdx = (idx - 1 + sortedMins.length) % sortedMins.length;
    const prevMins = sortedMins[prevIdx];

    const prevRunDate = new Date(nextRunDate);
    const prevH = Math.floor(prevMins / 60);
    const prevM = prevMins % 60;

    if (prevMins >= nextTotalMins) {
      prevRunDate.setDate(prevRunDate.getDate() - 1);
    }
    prevRunDate.setHours(prevH, prevM, 0, 0);

    const total = nextRunDate.getTime() - prevRunDate.getTime();
    const elapsed = now.getTime() - prevRunDate.getTime();
    const pct = total > 0 ? Math.min(100, Math.max(0, (elapsed / total) * 100)) : 0;
    const rem = Math.max(0, nextRunDate.getTime() - now.getTime());

    return { progressPercent: pct, remainingMs: rem };
  }, [schedulerStatus?.scheduleHours, nextRunDate, now]);

  const remainingFormatted = useMemo(() => {
    if (!mounted) {
      return isSchedulerActive ? (locale === "en" ? "Calculating..." : "Calculando...") : (locale === "en" ? "Paused" : "Pausado");
    }
    if (!isSchedulerActive) {
      return locale === "en" ? "Paused" : "Pausado";
    }
    if (remainingMs <= 0) {
      return locale === "en" ? "Running now" : "Executando agora";
    }

    const totalSecs = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    if (hours > 0) {
      return locale === "en" ? `in ${hours}h ${minutes}m ${seconds}s` : `em ${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
      return locale === "en" ? `in ${minutes}m ${seconds}s` : `em ${minutes}m ${seconds}s`;
    }
    return locale === "en" ? `in ${seconds}s` : `em ${seconds}s`;
  }, [remainingMs, locale, isSchedulerActive, mounted]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1: Monitored / Active Routes */}
      <div
        onClick={() => !loading && router.push("/routes?filter=active")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.dashboard.kpis.monitoredRoutes}
          </span>
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform">
            <Plane className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="space-y-2 py-1">
              <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
                  {activeCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {locale === "en"
                    ? `of ${totalCount} routes`
                    : `de ${totalCount} rotas`}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
                  {activePercent}% {t.dashboard.kpis.active}
                </span>
                {totalCount - activeCount > 0 && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {totalCount - activeCount} {t.common.paused.toLowerCase()}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2: Lowest Price Found */}
      <div
        onClick={() => !loading && router.push("/routes")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.dashboard.kpis.lowestPriceFound}
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <TrendingDown className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="space-y-2 py-1">
              <div className="h-8 w-24 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-28 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums truncate">
                  {lowestOverallPrice !== null ? formatCurrency(lowestOverallPrice) : "—"}
                </span>
                {locale === "en" && lowestOverallPrice !== null && (
                  <span className="text-xs font-bold text-slate-400">
                    ({formatUsdEstimate(lowestOverallPrice, "~")})
                  </span>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 truncate">
                {lowestPriceRoute ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 truncate">
                    <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0 rotate-45" />
                    {lowestPriceRoute.origin} → {lowestPriceRoute.destination}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {t.dashboard.kpis.noRoutesYet}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 3: Deals Found / Target Met */}
      <div
        onClick={() => !loading && router.push("/routes?filter=target")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.dashboard.kpis.dealsFound}
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
              onTargetCount > 0
                ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                : "bg-slate-50 border border-slate-100 text-slate-400"
            }`}
          >
            <Target className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="space-y-2 py-1">
              <div className="h-8 w-16 bg-slate-200 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded-md animate-pulse" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-black tracking-tight tabular-nums ${
                    onTargetCount > 0 ? "text-emerald-600" : "text-slate-900"
                  }`}
                >
                  {onTargetCount}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {locale === "en"
                    ? `of ${activeCount} active`
                    : `de ${activeCount} ativas`}
                </span>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                {onTargetCount > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {locale === "en"
                      ? `${onTargetCount} ${onTargetCount === 1 ? "deal ready to book" : "deals ready to book"}`
                      : `${onTargetCount} ${onTargetCount === 1 ? "pronta p/ compra" : "prontas p/ compra"}`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                    {locale === "en" ? "Waiting for price drop" : "Aguardando queda"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4: Scanning Cycle */}
      <div
        onClick={() => router.push("/settings")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t.dashboard.kpis.avgCycle}
          </span>
          <div className="flex items-center gap-1.5">
            <Tooltip
              content={
                isScanning
                  ? t.nav.scanning
                  : locale === "en"
                  ? "Scan all routes now"
                  : "Escanear todas as rotas agora"
              }
              position="top"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scanAllRoutes();
                }}
                disabled={isScanning}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  isScanning
                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                    : "bg-slate-100 hover:bg-violet-50 text-slate-700 hover:text-violet-700 border border-slate-200/80 hover:border-violet-200 hover:shadow-xs"
                } disabled:opacity-75`}
                aria-label={locale === "en" ? "Scan now" : "Escanear agora"}
              >
                {isScanning ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-violet-600 shrink-0" />
                ) : (
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                )}
                <span>
                  {isScanning
                    ? locale === "en"
                      ? "Scanning..."
                      : "Buscando..."
                    : locale === "en"
                    ? "Scan Now"
                    : "Escanear"}
                </span>
              </button>
            </Tooltip>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span suppressHydrationWarning className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              {mounted ? nextRunText : "--:--"}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              {isSchedulerActive ? t.common.active : t.common.paused}
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${mounted && isSchedulerActive ? Math.min(100, Math.max(2, Math.round(progressPercent))) : 0}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>{t.dashboard.kpis.autoScraper}</span>
              <span suppressHydrationWarning className="font-semibold text-indigo-600 tabular-nums">
                {remainingFormatted}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
