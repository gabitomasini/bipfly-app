"use client";

import { useMemo } from "react";
import { Sparkles, Flame, CheckCircle, Info, TrendingDown, HelpCircle, Activity, BarChart3 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
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
  origin = "Origem",
  destination = "Destino",
  departureDate = "",
}: StatisticalAnalysisCardProps) {
  const analysis = useMemo(() => {
    if (!history || history.length === 0) return null;
    const prices = history.map((h) => h.lowestPrice);
    const activePrice = currentPrice !== undefined && currentPrice !== null ? currentPrice : prices[prices.length - 1];
    return analyzeFlightPrice(origin, destination, departureDate, activePrice, prices);
  }, [history, currentPrice, origin, destination, departureDate]);

  if (!analysis) return null;

  const { sampleSize, mean, stdDev, zScore, dealLevel, isDeal, discountPercent, message } = analysis;

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
              <span>Inteligência Estatística & Detecção de Promoções (Z-Score)</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Baseado na média móvel e desvio padrão amostral dos últimos 30 dias ({sampleSize} cotações)
            </p>
          </div>
        </div>

        {/* Badge de Status Estatístico */}
        <div>
          {dealLevel === "IMPERDIVEL" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
              <Flame className="w-4 h-4 text-emerald-600" />
              Promoção Imperdível
            </span>
          ) : dealLevel === "OPORTUNIDADE" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Oportunidade de Compra
            </span>
          ) : sampleSize < 5 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <Info className="w-3.5 h-3.5 text-amber-600" />
              Amostra em Coleta ({sampleSize}/5)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
              Preço em Faixa Normal
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
          <p className="font-semibold leading-relaxed">{message}</p>
        </div>
      </div>

      {/* Grid de Métricas Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Média */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Média Histórica (μ)
          </span>
          <span className="text-base font-extrabold text-slate-900">
            {mean !== null ? formatCurrency(mean) : "Calculando..."}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            Preço médio observado
          </span>
        </div>

        {/* Desvio Padrão */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Desvio Padrão (σ)
          </span>
          <span className="text-base font-extrabold text-slate-900">
            {stdDev !== null ? formatCurrency(stdDev) : "Calculando..."}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            Volatilidade da rota
          </span>
        </div>

        {/* Z-Score */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5 flex items-center justify-between">
            <span>Z-Score Atual</span>
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
            {zScore !== null ? zScore : "Sem dados"}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            Desvios da média
          </span>
        </div>

        {/* Desconto Real vs Média */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 block mb-0.5">
            Variação vs Média
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
            {discountPercent !== null && discountPercent > 0 ? "Abaixo da média" : "Em relação à média"}
          </span>
        </div>
      </div>

      {/* Escala Visual de Z-Score (Curva Normal) */}
      {zScore !== null && (
        <div className="pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1.5">
            <span>Escala de Anomalia Estatística (Z-Score):</span>
            <span className="font-bold text-slate-700">
              Posição: <strong>{zScore}σ</strong>
            </span>
          </div>

          <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden flex border border-slate-200">
            {/* Faixa Imperdível (Z <= -2.0) */}
            <Tooltip content="Imperdível (Z <= -2.0)">
              <div className="w-1/4 bg-emerald-400/80 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Oportunidade (-2.0 < Z <= -1.5) */}
            <Tooltip content="Oportunidade (-2.0 < Z <= -1.5)">
              <div className="w-1/6 bg-sky-300/80 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Normal (-1.5 < Z < +1.5) */}
            <Tooltip content="Normal (-1.5 a +1.5)">
              <div className="w-1/3 bg-slate-200/90 border-r border-white h-full" />
            </Tooltip>
            {/* Faixa Alto (Z >= +1.5) */}
            <Tooltip content="Preço Alto (Z >= +1.5)">
              <div className="w-1/4 bg-rose-300/80 h-full" />
            </Tooltip>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-medium px-1">
            <span className="text-emerald-700 font-bold">🔥 Imperdível (&le; -2σ)</span>
            <span className="text-sky-700 font-bold">✨ Oportunidade (&le; -1.5σ)</span>
            <span className="text-slate-600">📊 Normal (0σ)</span>
            <span className="text-rose-700 font-bold">⚠️ Alto (&ge; +1.5σ)</span>
          </div>
        </div>
      )}
    </div>
  );
}
