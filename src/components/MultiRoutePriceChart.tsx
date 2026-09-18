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
import { FlightHistoryEntry, MonitoredRoute } from "@/lib/types";
import { formatCurrencyLocale, formatUsdEstimate, formatDateTimeLocale, formatDateLocale } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Eye, EyeOff, Layers, Percent, DollarSign, Filter, Calendar } from "lucide-react";
import CustomTooltip from "./Tooltip";

export const ROUTE_COLORS = [
  "#0284c7", // Sky 600
  "#4f46e5", // Indigo 600
  "#059669", // Emerald 600
  "#d97706", // Amber 600
  "#e11d48", // Rose 600
  "#9333ea", // Purple 600
  "#0d9488", // Teal 600
  "#ea580c", // Orange 600
  "#2563eb", // Blue 600
  "#db2777", // Pink 600
];

interface MultiRoutePriceChartProps {
  routes: MonitoredRoute[];
  allHistory: FlightHistoryEntry[];
}

type TimeRange = "7d" | "15d" | "30d" | "all";

export default function MultiRoutePriceChart({
  routes,
  allHistory,
}: MultiRoutePriceChartProps) {
  const { t, locale } = useTranslation();

  // Controle de visibilidade de rotas no gráfico
  const [visibleRoutes, setVisibleRoutes] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {};
    routes.forEach((r) => {
      map[r.id] = true;
    });
    return map;
  });

  // Filtro de Período
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Modo: 'absolute' (Preço em R$) ou 'normalized' (% da Meta da Rota)
  const [viewMode, setViewMode] = useState<"absolute" | "normalized">("absolute");

  const toggleRoute = (id: number) => {
    setVisibleRoutes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const showAllRoutes = () => {
    const map: Record<number, boolean> = {};
    routes.forEach((r) => {
      map[r.id] = true;
    });
    setVisibleRoutes(map);
  };

  const hideAllRoutes = () => {
    const map: Record<number, boolean> = {};
    routes.forEach((r) => {
      map[r.id] = false;
    });
    setVisibleRoutes(map);
  };

  // Mapeia cor para cada rota
  const routeColorMap = useMemo(() => {
    const map: Record<number, string> = {};
    routes.forEach((r, idx) => {
      map[r.id] = ROUTE_COLORS[idx % ROUTE_COLORS.length];
    });
    return map;
  }, [routes]);

  // Filtra histórico pelo período selecionado
  const filteredHistory = useMemo(() => {
    if (!allHistory || allHistory.length === 0) return [];
    if (timeRange === "all") return allHistory;

    const days = timeRange === "7d" ? 7 : timeRange === "15d" ? 15 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffTime = cutoff.getTime();

    const result = allHistory.filter((item) => {
      const itemTime = new Date(item.searchedAt).getTime();
      return isNaN(itemTime) || itemTime >= cutoffTime;
    });

    return result.length > 0 ? result : allHistory;
  }, [allHistory, timeRange]);

  // Prepara dados cronológicos unificados para o Recharts
  const chartData = useMemo(() => {
    if (!filteredHistory || filteredHistory.length === 0) return [];

    const timeMap = new Map<string, { timestamp: string; dateLabel: string; [key: string]: any }>();

    const sorted = [...filteredHistory].sort((a, b) => {
      const timeA = new Date(a.searchedAt).getTime();
      const timeB = new Date(b.searchedAt).getTime();
      return timeA - timeB;
    });

    const metaMap = new Map<number, number>();
    routes.forEach((r) => metaMap.set(r.id, r.targetPrice));

    sorted.forEach((item) => {
      const routeId = item.routeId;
      const searchedAt = item.searchedAt;
      const lowestPrice = item.lowestPrice;
      const airline = item.airline;

      if (!routeId || !searchedAt) return;
      const d = new Date(searchedAt);
      const isIsoDay = searchedAt.includes("T12:00:00.000Z");
      const minuteKey = isIsoDay ? searchedAt.slice(0, 10) : d.toISOString().slice(0, 16);
      const label = isIsoDay ? formatDateLocale(searchedAt.slice(0, 10), locale) : formatDateTimeLocale(searchedAt, locale);

      if (!timeMap.has(minuteKey)) {
        timeMap.set(minuteKey, {
          timestamp: searchedAt,
          dateLabel: label,
        });
      }

      const point = timeMap.get(minuteKey)!;
      const meta = metaMap.get(routeId) || lowestPrice;

      point[`route_${routeId}`] = lowestPrice;
      point[`route_${routeId}_cia`] = airline;
      point[`route_${routeId}_pct`] = meta > 0 ? Math.round((lowestPrice / meta) * 100) : 100;
    });

    return Array.from(timeMap.values());
  }, [filteredHistory, routes, locale]);

  const CustomMultiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xl text-xs text-slate-800 min-w-[240px] space-y-2 animate-fadeIn">
          <div className="font-bold text-slate-500 pb-1.5 border-b border-slate-100 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {label}
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              {viewMode === "absolute" ? (locale === "en" ? "Amounts in $" : "Valores em R$") : t.history.percentMode}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {payload.map((entry: any) => {
              const routeId = Number(entry.dataKey.replace("route_", "").replace("_pct", ""));
              const r = routes.find((rt) => rt.id === routeId);
              if (!r) return null;

              const val = entry.value;
              const origin = r.origin;
              const destination = r.destination;
              const flightDate = r.flightDate;

              return (
                <div key={routeId} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="font-bold text-slate-800">
                      {origin} → {destination}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">({flightDate})</span>
                  </div>

                  <div className="text-right shrink-0">
                    {viewMode === "absolute" ? (
                      <div>
                        <span className="font-black text-slate-900">{formatCurrencyLocale(val, "BRL", locale)}</span>
                        {locale === "en" && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            ({formatUsdEstimate(val, "~")})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`font-black ${
                          val <= 100 ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {val}% {locale === "en" ? "of target" : "da meta"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* Barra de Opções e Filtros de Exibição */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        {/* Filtro de Período */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-600 mr-1">{t.common.period}</span>
          <div className="inline-flex rounded-xl bg-white p-0.5 border border-slate-200 shadow-xs">
            {[
              { id: "7d", label: "7D" },
              { id: "15d", label: "15D" },
              { id: "30d", label: "30D" },
              { id: "all", label: t.common.all },
            ].map((tab) => {
              const active = timeRange === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeRange(tab.id as TimeRange)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    active
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Alternador de Modo: Absoluto vs Normalizado */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">{t.common.mode}</span>
          </span>

          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-xs">
            <button
              onClick={() => setViewMode("absolute")}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "absolute"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>{t.history.currencyMode}</span>
            </button>
            <CustomTooltip content={t.history.percentTooltip}>
              <button
                onClick={() => setViewMode("normalized")}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "normalized"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Percent className="w-3 h-3" />
                <span>{t.history.percentMode}</span>
              </button>
            </CustomTooltip>
          </div>
        </div>

        {/* Ações Rápidas de Seleção */}
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <button
            onClick={showAllRoutes}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3 h-3 text-slate-500" />
            <span>{t.history.showAll}</span>
          </button>
          <button
            onClick={hideAllRoutes}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <EyeOff className="w-3 h-3 text-slate-500" />
            <span>{t.history.hideAll}</span>
          </button>
        </div>
      </div>

      {/* Pills de Filtro de Cada Rota */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500 font-semibold mr-1">{t.history.routesLabel}</span>
        {routes.map((r, idx) => {
          const isVis = visibleRoutes[r.id] !== false;
          const color = routeColorMap[r.id] || ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const origin = r.origin;
          const destination = r.destination;
          const flightDate = r.flightDate || "";

          return (
            <button
              key={r.id}
              onClick={() => toggleRoute(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                isVis
                  ? "bg-white border-slate-300 text-slate-900 shadow-2xs"
                  : "bg-slate-100/70 border-slate-200 text-slate-400 line-through opacity-60"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isVis ? color : "#cbd5e1" }}
              />
              <span>
                {origin} → {destination}
              </span>
              <span className="text-[10px] font-mono font-normal text-slate-500">
                ({flightDate.slice(5)})
              </span>
            </button>
          );
        })}
      </div>

      {/* Gráfico Recharts Multi-Linhas */}
      <div className="h-80 w-full pt-2">
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
              tickFormatter={(v) => (viewMode === "absolute" ? (locale === "en" ? `$ ${v}` : `R$ ${v}`) : `${v}%`)}
              domain={viewMode === "normalized" ? [40, 160] : ["dataMin - 150", "dataMax + 150"]}
            />
            <Tooltip content={<CustomMultiTooltip />} />

            {/* Linha de Referência de 100% no Modo Normalizado */}
            {viewMode === "normalized" && (
              <ReferenceLine
                y={100}
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: `🎯 ${t.common.target} (100%)`,
                  fill: "#047857",
                  fontSize: 11,
                  position: "top",
                  fontWeight: 700,
                }}
              />
            )}

            {/* Renderiza uma Line para cada rota ativa */}
            {routes.map((r, idx) => {
              if (visibleRoutes[r.id] === false) return null;
              const color = routeColorMap[r.id] || ROUTE_COLORS[idx % ROUTE_COLORS.length];
              const dataKey = viewMode === "absolute" ? `route_${r.id}` : `route_${r.id}_pct`;
              const origin = r.origin;
              const destination = r.destination;

              return (
                <Line
                  key={r.id}
                  type="monotone"
                  dataKey={dataKey}
                  name={`${origin} → ${destination}`}
                  stroke={color}
                  strokeWidth={2.5}
                  connectNulls={true}
                  dot={{
                    r: chartData.length > 40 ? 2 : 3.5,
                    fill: color,
                    stroke: "#ffffff",
                    strokeWidth: 1.5,
                  }}
                  activeDot={{
                    r: 6,
                    fill: color,
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
