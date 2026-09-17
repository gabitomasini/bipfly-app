"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  BarChart2,
  RefreshCw,
  ArrowRight,
  Flame,
  CheckCircle,
  TrendingDown,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { FlightHistoryEntry, MonitoredRoute } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatRelativeTime,
  getAirportName,
} from "@/lib/utils";
import { analyzeFlightPrice } from "@/lib/stats/flight-anomaly-detector";
import { useModalBehavior } from "@/hooks/useModalBehavior";

interface HistoryModalProps {
  isOpen: boolean;
  route: MonitoredRoute | null;
  onClose: () => void;
}

export default function HistoryModal({ isOpen, route, onClose }: HistoryModalProps) {
  const router = useRouter();
  const [history, setHistory] = useState<FlightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const { overlayProps, containerRef } = useModalBehavior({ isOpen, onClose });

  useEffect(() => {
    if (isOpen && route) {
      setLoading(true);
      fetch(`/api/history?route_id=${route.id}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setHistory(json.data || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, route]);

  // Statistical analysis for deal badge
  const analysis = useMemo(() => {
    if (!history || history.length === 0 || !route) return null;
    const prices = history.map((h) => h.lowestPrice);
    const activePrice =
      route.latestPrice !== undefined && route.latestPrice !== null
        ? route.latestPrice
        : prices[prices.length - 1];
    return analyzeFlightPrice(
      route.origin,
      route.destination,
      route.flightDate,
      activePrice,
      prices
    );
  }, [history, route]);

  // Chronological data for sparkline
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .sort((a, b) => new Date(a.searchedAt).getTime() - new Date(b.searchedAt).getTime())
      .map((item) => ({
        price: item.lowestPrice,
        dateLabel: formatDateTimeBR(item.searchedAt),
        airline: item.airline || "",
      }));
  }, [history]);

  // Latest 5 queries for mini table
  const latestFiveEntries = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .sort((a, b) => new Date(b.searchedAt).getTime() - new Date(a.searchedAt).getTime())
      .slice(0, 5);
  }, [history]);

  if (!isOpen || !route) return null;

  const handleNavigateToFullHistory = () => {
    onClose();
    router.push(`/historico?route=${route.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
      {...overlayProps}
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
    >
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-2xl max-h-[90vh] flex flex-col bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="history-modal-title" className="text-base font-bold text-slate-900">
                  {route.origin} → {route.destination}
                </h2>
                <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md font-semibold">
                  {formatDateBR(route.flightDate)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {getAirportName(route.origin)} para {getAirportName(route.destination)} • Meta:{" "}
                <strong className="text-slate-800 font-bold">{formatCurrency(route.targetPrice)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar histórico"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs font-semibold">Carregando preview...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <p className="text-xs font-semibold text-slate-600">Nenhum histórico registrado para esta rota.</p>
            </div>
          ) : (
            <>
              {/* Badge de Deal Level / Análise Rápida */}
              {analysis && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Status da Tarifa:</span>
                    {analysis.dealLevel === "IMPERDIVEL" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Flame className="w-3.5 h-3.5 text-emerald-600" />
                        Promoção Imperdível {analysis.discountPercent ? `(-${analysis.discountPercent}%)` : ""}
                      </span>
                    ) : analysis.dealLevel === "OPORTUNIDADE" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        Ótima Oportunidade {analysis.discountPercent ? `(-${analysis.discountPercent}%)` : ""}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                        Preço Regular
                      </span>
                    )}
                  </div>

                  {analysis.mean !== null && (
                    <span className="text-xs text-slate-500 font-medium">
                      Média: <strong>{formatCurrency(Math.round(analysis.mean))}</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Sparkline Compacto */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                  <span>Tendência de Preço ({chartData.length} registros)</span>
                  <span className="text-slate-400 text-[11px]">Últimos 30 dias</span>
                </div>
                <div className="h-28 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                      <defs>
                        <linearGradient id="modalSparklineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip
                        formatter={(value: any) => [formatCurrency(Number(value)), "Preço"]}
                        labelFormatter={(_, items) => items?.[0]?.payload?.dateLabel || ""}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#0284c7"
                        strokeWidth={2}
                        fill="url(#modalSparklineGradient)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Mini-tabela das últimas 5 cotações */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">
                  Últimas Cotações Registradas
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Data Consulta</th>
                        <th className="px-3 py-2">Preço</th>
                        <th className="px-3 py-2">Cia Aérea</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {latestFiveEntries.map((item) => {
                        const isBelow = item.lowestPrice <= route.targetPrice;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                              <span title={formatDateTimeBR(item.searchedAt)}>
                                {formatRelativeTime(item.searchedAt)}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.lowestPrice, item.currency)}
                            </td>
                            <td className="px-3 py-2 text-slate-700 truncate max-w-[120px]">
                              {item.airline || "Google Flights"}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isBelow
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {isBelow ? "No Alvo" : "Acima"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            type="button"
            onClick={handleNavigateToFullHistory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
          >
            <span>Ver análise completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
