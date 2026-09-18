"use client";

import { useMemo } from "react";
import { Sparkles, Flame, CheckCircle, Info, TrendingDown, HelpCircle, Activity, BarChart3 } from "lucide-react";
import { formatCurrencyLocale, formatUsdEstimate } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { analyzeFlightPrice } from "@/lib/stats/flight-anomaly-detector";
import { FlightHistoryEntry } from "@/lib/types";
import Tooltip from "./Tooltip";

interface StatisticalAnalysisCardProps {
  history: FlightHistoryEntry[];
  currentPrice?: number | null;
  origin?: string;
  destination?: string;
  departureDate?: string;
}

export default function StatisticalAnalysisCard({
  history,
  currentPrice,
  origin = "Origin",
  destination = "Destination",
  departureDate = "",
}: StatisticalAnalysisCardProps) {
  const { t, locale } = useTranslation();

  const activePrice = useMemo(() => {
    if (!history || history.length === 0) return 0;
    const prices = history.map((h) => h.lowestPrice);
    return currentPrice !== undefined && currentPrice !== null ? currentPrice : prices[prices.length - 1];
  }, [history, currentPrice]);

  const analysis = useMemo(() => {
    if (!history || history.length === 0) return null;
    const prices = history.map((h) => h.lowestPrice);
    return analyzeFlightPrice(origin, destination, departureDate, activePrice, prices);
  }, [history, activePrice, origin, destination, departureDate]);

  if (!analysis) return null;

  const { sampleSize, mean, stdDev, zScore, dealLevel, isDeal, discountPercent, message } = analysis;

  // Custom localized advice message if applicable
  const localizedMessage = useMemo(() => {
    if (dealLevel === "IMPERDIVEL") {
      return locale === "en"
        ? `🔥 Incredible Deal! At ${formatCurrencyLocale(activePrice, "BRL", locale)}, this fare is ${discountPercent}% below the 30-day average (${formatCurrencyLocale(mean, "BRL", locale)}). Z-Score anomaly of ${zScore}σ — Book immediately before seats sell out.`
        : message;
    }
    if (dealLevel === "OPORTUNIDADE") {
      return locale === "en"
        ? `✨ Great Opportunity! At ${formatCurrencyLocale(activePrice, "BRL", locale)}, this fare is ${discountPercent}% below the 30-day average (${formatCurrencyLocale(mean, "BRL", locale)}). Good time to purchase.`
        : message;
    }
    if (sampleSize < 5) {
      return locale === "en"
        ? `Collecting price samples (${sampleSize}/5 queries). Once at least 5 quotes are logged, statistical anomaly detection will activate.`
        : message;
    }
    return locale === "en"
      ? `Price within normal statistical variance (Z-Score: ${zScore}σ). Current fare is aligned with the historical mean of ${formatCurrencyLocale(mean, "BRL", locale)}.`
      : message;
  }, [dealLevel, sampleSize, mean, zScore, discountPercent, message, locale, activePrice]);

  return (
    <div className="glass-panel p-5 bg-white border border-slate-200 shadow-xs rounded-2xl space-y-4">
      {/* Header do Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>{t.stats.title}</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {t.stats.subtitle.replace("{sampleSize}", String(sampleSize))}
            </p>
          </div>
        </div>

        {/* Badge de Status Estatístico */}
        <div>
          {dealLevel === "IMPERDIVEL" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
              <Flame className="w-4 h-4 text-emerald-600" />
              {t.stats.stealDeal}
            </span>
          ) : dealLevel === "OPORTUNIDADE" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
              <Sparkles className="w-4 h-4 text-sky-600" />
              {t.stats.greatPrice}
            </span>
          ) : sampleSize < 5 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              {t.stats.collectingSample.replace("{sampleSize}", String(sampleSize))}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
              {t.stats.normalRange}
            </span>
          )}
        </div>
      </div>

      {/* Banner Explicativo */}
      <div
        className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
          dealLevel === "IMPERDIVEL"
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : dealLevel === "OPORTUNIDADE"
            ? "bg-sky-50/80 border-sky-200 text-sky-900"
            : sampleSize < 5
            ? "bg-amber-50/70 border-amber-200 text-amber-900"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {dealLevel === "IMPERDIVEL" ? (
            <Flame className="w-4 h-4 text-emerald-600" />
          ) : dealLevel === "OPORTUNIDADE" ? (
            <Sparkles className="w-4 h-4 text-sky-600" />
          ) : sampleSize < 5 ? (
            <Info className="w-4 h-4 text-amber-600" />
          ) : (
            <BarChart3 className="w-4 h-4 text-slate-500" />
          )}
        </div>
        <div>
          <p className="font-semibold leading-relaxed">{localizedMessage}</p>
        </div>
      </div>

      {/* Grid de Métricas Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Média */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            {t.stats.mean}
          </span>
          <span className="text-base font-extrabold text-slate-900">
            {mean !== null ? formatCurrencyLocale(mean, "BRL", locale) : t.stats.calculating}
          </span>
          {locale === "en" && mean !== null && (
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              ({formatUsdEstimate(mean, "~")})
            </span>
          )}
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            {t.stats.meanDesc}
          </span>
        </div>

        {/* Desvio Padrão */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            {t.stats.stdDev}
          </span>
          <span className="text-base font-extrabold text-slate-900">
            {stdDev !== null ? formatCurrencyLocale(stdDev, "BRL", locale) : t.stats.calculating}
          </span>
          {locale === "en" && stdDev !== null && (
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              ({formatUsdEstimate(stdDev, "~")})
            </span>
          )}
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            {t.stats.stdDevDesc}
          </span>
        </div>

        {/* Z-Score */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5 flex items-center justify-between">
            <span>{t.stats.zScoreCurrent}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                zScore !== null && zScore <= -2
                  ? "bg-emerald-200 text-emerald-900"
                  : zScore !== null && zScore <= -1.5
                  ? "bg-sky-200 text-sky-900"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {zScore !== null ? `${zScore > 0 ? `+${zScore}` : zScore}σ` : "--"}
            </span>
          </span>
          <span
            className={`text-base font-black ${
              zScore !== null && zScore <= -1.5
                ? "text-emerald-700"
                : zScore !== null && zScore > 1.5
                ? "text-rose-700"
                : "text-slate-900"
            }`}
          >
            {zScore !== null ? zScore : t.stats.noData}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            {t.stats.zScoreDesc}
          </span>
        </div>

        {/* Desconto Real vs Média */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            {t.stats.varVsMean}
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-base font-extrabold ${
                discountPercent !== null && discountPercent > 0
                  ? "text-emerald-700"
                  : discountPercent !== null && discountPercent < 0
                  ? "text-rose-700"
                  : "text-slate-700"
              }`}
            >
              {discountPercent !== null
                ? discountPercent > 0
                  ? `-${discountPercent}%`
                  : `+${Math.abs(discountPercent)}%`
                : "--"}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            {discountPercent !== null && discountPercent > 0 ? t.stats.belowMean : t.stats.relativeToMean}
          </span>
        </div>
      </div>

      {/* Escala Visual de Z-Score (Curva Normal) */}
      {zScore !== null && (
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
            <span>{t.stats.scaleTitle}</span>
            <span className="font-bold text-slate-700">
              {t.stats.scalePosition} <strong>{zScore}σ</strong>
            </span>
          </div>

          <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
            {/* Faixa Imperdível (Z <= -2.0) */}
            <Tooltip content={`${t.stats.stealDeal} (Z <= -2.0)`}>
              <div className="w-1/4 bg-emerald-400/80 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Oportunidade (-2.0 < Z <= -1.5) */}
            <Tooltip content={`${t.stats.greatPrice} (-2.0 < Z <= -1.5)`}>
              <div className="w-1/6 bg-sky-300/80 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Normal (-1.5 < Z < +1.5) */}
            <Tooltip content={`${t.stats.normalRange} (-1.5 a +1.5)`}>
              <div className="w-1/3 bg-slate-200/90 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Alto (Z >= +1.5) */}
            <Tooltip content={`${t.stats.scaleHigh} (Z >= +1.5)`}>
              <div className="w-1/4 bg-rose-300/80 h-full" />
            </Tooltip>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium px-1">
            <span className="text-emerald-700 font-bold">{t.stats.scaleStealDeal}</span>
            <span className="text-sky-700 font-bold">{t.stats.scaleGreatDeal}</span>
            <span className="text-slate-600">{t.stats.scaleNormal}</span>
            <span className="text-rose-700 font-bold">{t.stats.scaleHigh}</span>
          </div>
        </div>
      )}
    </div>
  );
}
