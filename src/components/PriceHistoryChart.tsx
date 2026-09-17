"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { FlightHistoryEntry } from "@/lib/types";
import { formatCurrency, formatDateTimeBR, formatDateBR } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus, Calendar, Filter } from "lucide-react";

interface PriceHistoryChartProps {
  data: FlightHistoryEntry[];
  targetPrice?: number;
  precoLimite?: number;
  origin?: string;
  destination?: string;
}

type TimeRange = "7d" | "15d" | "30d" | "all";

export default function PriceHistoryChart({
  data,
  targetPrice,
  precoLimite,
  origin,
  destination,
}: PriceHistoryChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const activeTargetPrice = targetPrice ?? precoLimite;

  // Filtra e ordena dados cronologicamente (mais antigo na esquerda, mais recente na direita)
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Garante ordenação cronológica crescente: do passado para o presente
    const chronological = [...data].sort((a, b) => {
      const timeA = new Date(a.searchedAt).getTime() || 0;
      const timeB = new Date(b.searchedAt).getTime() || 0;
      return timeA - timeB;
    });

    if (timeRange === "all") return chronological;

    const days = timeRange === "7d" ? 7 : timeRange === "15d" ? 15 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTime = cutoff.getTime();

    const result = chronological.filter((item) => {
      const itemTime = new Date(item.searchedAt).getTime();
      return isNaN(itemTime) || itemTime >= cutoffTime;
    });

    // Se o filtro ficou vazio por falta de dados recentes, retorna os últimos N registros
    return result.length > 0 ? result : chronological.slice(-Math.min(chronological.length, days));
  }, [data, timeRange]);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-300 rounded-2xl bg-slate-50 p-6">
        <p className="text-sm font-semibold text-slate-700">Nenhum histórico de preços registrado para esta rota.</p>
        <p className="text-xs text-slate-500 mt-1">
          Use o botão &ldquo;Puxar Histórico (30d)&rdquo; ou aguarde o próximo ciclo de varredura.
        </p>
      </div>
    );
  }

  // Prepara dados para o Recharts
  const chartData = filteredData.map((item, index) => {
    const searchedAt = item.searchedAt;
    const lowestPrice = item.lowestPrice;
    const isIsoOnly = searchedAt.includes("T12:00:00.000Z");
    const dateLabel = isIsoOnly ? formatDateBR(searchedAt.slice(0, 10)) : formatDateTimeBR(searchedAt);

    return {
      id: item.id,
      index: index + 1,
      price: lowestPrice,
      searchedAt,
      dateLabel,
      airline: item.airline || "Não informada",
      flightNumber: item.flightNumber || "",
      departureTime: item.departureTime || "",
      arrivalTime: item.arrivalTime || "",
    };
  });

  const prices = filteredData.map((d) => d.lowestPrice);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  let variationPercent = 0;
  if (firstPrice > 0) {
    variationPercent = Math.round(((lastPrice - firstPrice) / firstPrice) * 100);
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xl text-xs text-slate-800 animate-fadeIn">
          <div className="text-slate-500 font-medium mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{p.dateLabel}</span>
          </div>
          <div className="text-lg font-black text-sky-700 mb-1.5">
            {formatCurrency(p.price)}
          </div>
          {p.airline && (
            <div className="text-slate-700 font-medium">
              🏢 <strong>{p.airline}</strong> {p.flightNumber ? `(${p.flightNumber})` : ""}
            </div>
          )}
          {(p.departureTime || p.arrivalTime) && (
            <div className="text-slate-500 mt-0.5 font-medium">
              🕒 {p.departureTime || "--:--"} → {p.arrivalTime || "--:--"}
            </div>
          )}
          {activeTargetPrice && (
            <div
              className={`mt-1.5 pt-1.5 border-t border-slate-100 font-bold flex items-center gap-1 ${
                p.price <= activeTargetPrice ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {p.price <= activeTargetPrice ? "🎯 Dentro da Meta!" : "⚠️ Acima da Meta"}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      {/* Controles de Período e Métricas Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 mr-1">Período:</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            {[
              { id: "7d", label: "7 Dias" },
              { id: "15d", label: "15 Dias" },
              { id: "30d", label: "30 Dias" },
              { id: "all", label: "Tudo" },
            ].map((tab) => {
              const active = timeRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeRange(tab.id as TimeRange)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-white text-sky-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Exibindo <strong>{filteredData.length}</strong> de <strong>{data.length}</strong> cotações registradas
        </div>
      </div>

      {/* 4 Cards de Resumo de Tendência do Período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-medium block text-[11px]">Menor Preço</span>
          <strong className="text-emerald-700 text-sm font-black">{formatCurrency(lowestPrice)}</strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-medium block text-[11px]">Maior Preço</span>
          <strong className="text-rose-700 text-sm font-black">{formatCurrency(highestPrice)}</strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-medium block text-[11px]">Média (μ)</span>
          <strong className="text-slate-800 text-sm font-black">{formatCurrency(avgPrice)}</strong>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-slate-500 font-medium block text-[11px]">Variação no Período</span>
          <div className="flex items-center gap-1 font-black text-sm">
            {variationPercent < 0 ? (
              <span className="text-emerald-700 flex items-center">
                <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {variationPercent}%
              </span>
            ) : variationPercent > 0 ? (
              <span className="text-rose-700 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{variationPercent}%
              </span>
            ) : (
              <span className="text-slate-600 flex items-center">
                <Minus className="w-3.5 h-3.5 mr-0.5" /> 0%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico Recharts */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="dateLabel"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tickFormatter={(v) => `R$ ${v}`}
              domain={[
                (dataMin: number) => Math.floor(Math.min(dataMin, activeTargetPrice || dataMin) * 0.92),
                (dataMax: number) => Math.ceil(Math.max(dataMax, activeTargetPrice || dataMax) * 1.05),
              ]}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Linha de Referência da Meta de Preço */}
            {activeTargetPrice && (
              <ReferenceLine
                y={activeTargetPrice}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `🎯 Meta: ${formatCurrency(activeTargetPrice)}`,
                  fill: "#047857",
                  fontSize: 11,
                  position: "top",
                  fontWeight: 700,
                }}
              />
            )}

            {/* Linha de Referência da Média Histórica */}
            {avgPrice > 0 && (
              <ReferenceLine
                y={avgPrice}
                stroke="#6366f1"
                strokeDasharray="3 3"
                label={{
                  value: `Média: ${formatCurrency(avgPrice)}`,
                  fill: "#4f46e5",
                  fontSize: 10,
                  position: "insideBottomRight",
                  fontWeight: 600,
                }}
              />
            )}

            <Line
              type="monotone"
              dataKey="price"
              stroke="#0284c7"
              strokeWidth={3}
              dot={{
                r: chartData.length > 30 ? 2 : 4,
                fill: "#0284c7",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "#059669",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
