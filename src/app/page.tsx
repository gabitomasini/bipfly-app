"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MetricCards from "@/components/MetricCards";
import RouteModal from "@/components/RouteModal";
import HistoryModal from "@/components/HistoryModal";
import FlightSearchResultsDrawer from "@/components/FlightSearchResultsDrawer";
import { MonitoredRoute, FlightOption, SchedulerStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";
import {
  Plus,
  ArrowRight,
  Plane,
  RefreshCw,
  Sparkles,
  ExternalLink,
  BarChart2,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";

export default function DashboardPage() {
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MonitoredRoute | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<MonitoredRoute | null>(null);
  const [liveDrawerRoute, setLiveDrawerRoute] = useState<MonitoredRoute | null>(null);
  const [liveOptions, setLiveOptions] = useState<FlightOption[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [routesRes, schedRes] = await Promise.all([
        fetch("/api/routes").then((r) => r.json()),
        fetch("/api/scheduler").then((r) => r.json()),
      ]);

      if (routesRes.success) setRoutes(routesRes.data || []);
      if (schedRes.success) setSchedulerStatus(schedRes.data);
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onTargetCount = useMemo(() => {
    return routes.filter((r) => {
      const p = r.latestPrice;
      return r.isActive && p !== null && p !== undefined && p <= r.targetPrice;
    }).length;
  }, [routes]);

  return (
    <div className="min-h-screen pb-24 bg-slate-50/60">
      <Navbar onSearchTriggered={fetchDashboardData} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Clean Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Painel Executivo
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
              Visão consolidada de cotações e status do radar.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/rotas"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Gerenciar Rotas</span>
            </Link>

            <button
              onClick={() => {
                setEditingRoute(null);
                setIsRouteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Rota</span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Strip */}
        <MetricCards routes={routes} schedulerStatus={schedulerStatus} />

        {/* Highlight Banner (Se houver rotas no alvo) */}
        {onTargetCount > 0 && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{onTargetCount} {onTargetCount === 1 ? "rota atingiu" : "rotas atingiram"} a meta de preço!</strong> Pronta para compra no Google Flights.
              </span>
            </div>
            <Link
              href="/rotas"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 shrink-0 ml-3"
            >
              <span>Ver detalhes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Resumo Rápido de Preços (Tabela Executiva Consolidada) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">
              Cotações Vigentes ({routes.length})
            </h2>

            <Link
              href="/rotas"
              className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Ver cards completos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-2" />
              <span className="text-xs">Carregando cotações...</span>
            </div>
          ) : routes.length === 0 ? (
            <div className="bg-white p-12 text-center border border-dashed border-slate-300 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Plane className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Nenhuma rota cadastrada
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Adicione seu primeiro destino para iniciar o monitoramento automático.
              </p>
              <button
                onClick={() => {
                  setEditingRoute(null);
                  setIsRouteModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors"
              >
                Cadastrar Rota
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 border-b border-slate-100 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Trecho</th>
                      <th className="py-3 px-4">Data do Voo</th>
                      <th className="py-3 px-4">Preço Atual</th>
                      <th className="py-3 px-4">Sua Meta</th>
                      <th className="py-3 px-4">Companhia</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {routes.map((route) => {
                      const hasPrice = route.latestPrice !== null && route.latestPrice !== undefined;
                      const price = route.latestPrice as number;
                      const isBelow = hasPrice && price <= route.targetPrice;
                      const diff = hasPrice ? route.targetPrice - price : 0;
                      const flightUrl =
                        route.lastBookingLink ||
                        getGoogleFlightsUrl(
                          route.origin,
                          route.destination,
                          route.flightDate,
                          route.passengers || 1
                        );

                      return (
                        <tr
                          key={route.id}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            !route.isActive ? "opacity-50" : ""
                          }`}
                        >
                          {/* Trecho */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                              <span>{route.origin}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span>{route.destination}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {getAirportName(route.origin)} → {getAirportName(route.destination)}
                            </div>
                          </td>

                          {/* Data do Voo */}
                          <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                            {formatDateBR(route.flightDate)}
                          </td>

                          {/* Preço Atual */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`text-sm font-bold ${
                                hasPrice
                                  ? isBelow
                                    ? "text-emerald-600"
                                    : "text-slate-900"
                                  : "text-slate-400"
                              }`}
                            >
                              {hasPrice ? formatCurrency(price) : "—"}
                            </span>
                          </td>

                          {/* Meta */}
                          <td className="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                            {formatCurrency(route.targetPrice)}
                          </td>

                          {/* Companhia */}
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            {route.lastAirline ? (
                              <span>{route.lastAirline}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {!route.isActive ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                                Pausada
                              </span>
                            ) : !hasPrice ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-500">
                                Pendente
                              </span>
                            ) : isBelow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                No Alvo (-{formatCurrency(diff)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600">
                                +{formatCurrency(price - route.targetPrice)} da meta
                              </span>
                            )}
                          </td>

                          {/* Ações */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <a
                                href={flightUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                title="Ver no Google Flights"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => setHistoryModalRoute(route)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                title="Ver Gráfico e Histórico"
                              >
                                <BarChart2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modais */}
      <RouteModal
        isOpen={isRouteModalOpen}
        routeToEdit={editingRoute}
        onClose={() => setIsRouteModalOpen(false)}
        onSuccess={fetchDashboardData}
      />

      <HistoryModal
        isOpen={Boolean(historyModalRoute)}
        route={historyModalRoute}
        onClose={() => setHistoryModalRoute(null)}
      />

      <FlightSearchResultsDrawer
        isOpen={Boolean(liveDrawerRoute)}
        route={liveDrawerRoute}
        options={liveOptions}
        onClose={() => setLiveDrawerRoute(null)}
      />
    </div>
  );
}
