"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MetricCards from "@/components/MetricCards";
import RouteModal from "@/components/RouteModal";
import HistoryModal from "@/components/HistoryModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FlightSearchResultsDrawer from "@/components/FlightSearchResultsDrawer";
import AirlineBadge from "@/components/AirlineBadge";
import { MonitoredRoute, FlightOption, SchedulerStatus } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";
import SkeletonLoader from "@/components/SkeletonLoader";
import ExpandableSearch from "@/components/ExpandableSearch";
import { useToast } from "@/components/Toast";
import {
  Plus,
  ArrowRight,
  Plane,
  Sparkles,
  ExternalLink,
  BarChart2,
  CheckCircle2,
  SlidersHorizontal,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  TrendingDown,
  AlertTriangle,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const { addToast } = useToast();
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAirline, setSelectedAirline] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "target" | "above" | "paused">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "discount_desc" | "date_asc" | "route">("price_asc");

  // Modals & action states
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MonitoredRoute | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<MonitoredRoute | null>(null);
  const [liveDrawerRoute, setLiveDrawerRoute] = useState<MonitoredRoute | null>(null);
  const [liveOptions, setLiveOptions] = useState<FlightOption[]>([]);
  const [routeToDelete, setRouteToDelete] = useState<MonitoredRoute | null>(null);
  const [searchingRouteId, setSearchingRouteId] = useState<number | null>(null);

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
      addToast("Erro ao carregar cotações do servidor", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Single route instant search
  const handleSingleRouteSearch = async (route: MonitoredRoute) => {
    if (searchingRouteId === route.id) return;
    setSearchingRouteId(route.id);
    addToast(`Buscando cotação para ${route.origin} → ${route.destination}...`, "info");
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id }),
      });
      const json = await res.json();
      if (json.success) {
        addToast(`Cotação atualizada para ${route.origin} → ${route.destination}!`, "success");
        fetchDashboardData();
        if (json.data?.foundOptions && json.data.foundOptions.length > 0) {
          setLiveDrawerRoute(route);
          setLiveOptions(json.data.foundOptions);
        }
      } else {
        addToast(`Erro: ${json.error || "Falha na busca"}`, "error");
      }
    } catch (err: any) {
      addToast(`Erro de conexão: ${err.message}`, "error");
    } finally {
      setSearchingRouteId(null);
    }
  };

  // Route deletion
  const handleDeleteConfirm = async () => {
    if (!routeToDelete) return;
    try {
      const res = await fetch(`/api/routes?id=${routeToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        addToast(`Rota ${routeToDelete.origin} → ${routeToDelete.destination} excluída com sucesso!`, "success");
        setRouteToDelete(null);
        fetchDashboardData();
      } else {
        addToast(`Erro: ${json.error || "Falha ao excluir"}`, "error");
      }
    } catch (err: any) {
      addToast(`Erro de conexão: ${err.message}`, "error");
    }
  };

  // Unique airlines for filter dropdown
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.lastAirline && r.lastAirline.trim()) {
        set.add(r.lastAirline.trim());
      }
    });
    return Array.from(set).sort();
  }, [routes]);

  // Filtered & Sorted Routes
  const filteredRoutes = useMemo(() => {
    let result = [...routes];

    // 1. Search query (matches origin, destination, airport names, airline)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const orig = r.origin.toLowerCase();
        const dest = r.destination.toLowerCase();
        const origName = (getAirportName(r.origin) || "").toLowerCase();
        const destName = (getAirportName(r.destination) || "").toLowerCase();
        const airline = (r.lastAirline || "").toLowerCase();
        return (
          orig.includes(q) ||
          dest.includes(q) ||
          origName.includes(q) ||
          destName.includes(q) ||
          airline.includes(q)
        );
      });
    }

    // 2. Airline Filter
    if (selectedAirline !== "all") {
      result = result.filter(
        (r) => (r.lastAirline || "").toLowerCase() === selectedAirline.toLowerCase()
      );
    }

    // 3. Status Filter
    if (statusFilter === "target") {
      result = result.filter(
        (r) =>
          r.isActive &&
          r.latestPrice !== null &&
          r.latestPrice !== undefined &&
          r.latestPrice <= r.targetPrice
      );
    } else if (statusFilter === "above") {
      result = result.filter(
        (r) =>
          r.isActive &&
          r.latestPrice !== null &&
          r.latestPrice !== undefined &&
          r.latestPrice > r.targetPrice
      );
    } else if (statusFilter === "paused") {
      result = result.filter((r) => !r.isActive);
    }

    // 4. Sorting
    result.sort((a, b) => {
      const priceA = a.latestPrice ?? 9999999;
      const priceB = b.latestPrice ?? 9999999;

      if (sortBy === "price_asc") {
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        return priceB - priceA;
      }
      if (sortBy === "discount_desc") {
        // Difference: targetPrice - latestPrice (higher positive number is better discount)
        const diffA = a.latestPrice !== null && a.latestPrice !== undefined ? a.targetPrice - a.latestPrice : -999999;
        const diffB = b.latestPrice !== null && b.latestPrice !== undefined ? b.targetPrice - b.latestPrice : -999999;
        return diffB - diffA;
      }
      if (sortBy === "date_asc") {
        return (a.flightDate || "").localeCompare(b.flightDate || "");
      }
      if (sortBy === "route") {
        return `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`);
      }
      return 0;
    });

    return result;
  }, [routes, searchQuery, selectedAirline, statusFilter, sortBy]);

  const onTargetCount = useMemo(() => {
    return routes.filter((r) => {
      const p = r.latestPrice;
      return r.isActive && p !== null && p !== undefined && p <= r.targetPrice;
    }).length;
  }, [routes]);

  const hasActiveFilters = searchQuery !== "" || selectedAirline !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAirline("all");
    setStatusFilter("all");
    setSortBy("price_asc");
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar onSearchTriggered={fetchDashboardData} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Top Header / Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <span>Radar de Passagens</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Dashboard
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Monitoramento automatizado de tarifas aéreas com alertas e inteligência de preço.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/rotas"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Gerenciar Rotas</span>
            </Link>

            <button
              onClick={() => {
                setEditingRoute(null);
                setIsRouteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Rota</span>
            </button>
          </div>
        </div>

        {/* 4 Metric Cards (KPIs) */}
        {loading ? (
          <SkeletonLoader variant="metric" />
        ) : (
          <MetricCards routes={routes} schedulerStatus={schedulerStatus} />
        )}

        {/* Highlight Banner (When routes are on target) */}
        {!loading && onTargetCount > 0 && (
          <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex items-center justify-between shadow-2xs animate-fadeIn">
            <div className="flex items-center gap-3 text-xs text-emerald-950 font-medium">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="font-bold text-emerald-900 block text-sm">
                  {onTargetCount} {onTargetCount === 1 ? "rota atingiu a meta estipulada!" : "rotas atingiram a meta estipulada!"}
                </span>
                <span className="text-emerald-800/90">
                  Tarifas prontas para reserva direta com os menores valores detectados no radar.
                </span>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter("target")}
              className="text-xs font-bold text-emerald-900 bg-emerald-100/90 hover:bg-emerald-200/90 px-3.5 py-1.5 rounded-xl border border-emerald-300/80 flex items-center gap-1 shrink-0 ml-3 transition-colors cursor-pointer"
            >
              <span>Ver no alvo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quotes Section with Functional Filter Bar & Enhanced Table */}
        <div className="space-y-4">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Cotações Vigentes
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tabela consolidada com preços atualizados em tempo real.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">
                Mostrando <strong>{filteredRoutes.length}</strong> de {routes.length} rotas
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>
          </div>

          {/* SaaS Filter & Controls Bar */}
          <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Status Tabs Filter */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto text-[11px] shrink-0">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setStatusFilter("target")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "target"
                      ? "bg-white text-emerald-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  No Alvo ({onTargetCount})
                </button>
                <button
                  onClick={() => setStatusFilter("above")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "above"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Acima
                </button>
                <button
                  onClick={() => setStatusFilter("paused")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "paused"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Pausadas
                </button>
              </div>

              {/* Controls Group: Airline + Sort + Search */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                {/* Airline Dropdown */}
                <select
                  value={selectedAirline}
                  onChange={(e) => setSelectedAirline(e.target.value)}
                  className="py-1.5 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all cursor-pointer"
                >
                  <option value="all">Todas as Cias</option>
                  {availableAirlines.map((cia) => (
                    <option key={cia} value={cia}>
                      {cia}
                    </option>
                  ))}
                </select>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="py-1.5 pl-3 pr-7 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all cursor-pointer"
                  >
                    <option value="price_asc">Menor Preço</option>
                    <option value="discount_desc">Maior Desconto</option>
                    <option value="price_desc">Maior Preço</option>
                    <option value="date_asc">Data do Voo</option>
                    <option value="route">Trecho A-Z</option>
                  </select>
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Expandable Search Button */}
                <ExpandableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Buscar aeroporto, cia..."
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          {loading ? (
            <SkeletonLoader variant="row" count={5} />
          ) : filteredRoutes.length === 0 ? (
            <div className="bg-white p-12 text-center border border-dashed border-slate-300 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
                <Plane className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {routes.length === 0 ? "Nenhuma rota cadastrada" : "Nenhuma rota encontrada para os filtros"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
                {routes.length === 0
                  ? "Adicione seu primeiro destino para iniciar o monitoramento automático de preços."
                  : "Tente ajustar o termo de busca ou redefinir os filtros selecionados."}
              </p>
              {routes.length === 0 ? (
                <button
                  onClick={() => {
                    setEditingRoute(null);
                    setIsRouteModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
                >
                  Cadastrar Rota
                </button>
              ) : (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 border-b border-slate-200/80 uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 text-left">Trecho & Destino</th>
                        <th className="py-3.5 px-4 text-center">Data do Voo</th>
                        <th className="py-3.5 px-4 text-left">Companhia</th>
                        <th className="py-3.5 px-4 text-right">Sua Meta</th>
                        <th className="py-3.5 px-4 text-right">Preço Atual</th>
                        <th className="py-3.5 px-4 text-center">Status / Variação</th>
                        <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRoutes.map((route) => {
                        const hasPrice = route.latestPrice !== null && route.latestPrice !== undefined;
                        const price = route.latestPrice as number;
                        const isBelow = hasPrice && price <= route.targetPrice;
                        const diff = hasPrice ? route.targetPrice - price : 0;
                        const diffPercent = hasPrice && route.targetPrice > 0
                          ? Math.round(Math.abs(diff / route.targetPrice) * 100)
                          : 0;

                        const flightUrl =
                          route.lastBookingLink ||
                          getGoogleFlightsUrl(
                            route.origin,
                            route.destination,
                            route.flightDate,
                            route.passengers || 1
                          );

                        const isSearchingThis = searchingRouteId === route.id;

                        return (
                          <tr
                            key={route.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              !route.isActive ? "opacity-60 bg-slate-50/30" : ""
                            }`}
                          >
                            {/* Trecho & Destino */}
                            <td className="py-3.5 px-4 text-left">
                              <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm tracking-tight">
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                  {route.origin}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                  {route.destination}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[210px] mt-0.5">
                                {getAirportName(route.origin)} → {getAirportName(route.destination)}
                              </div>
                            </td>

                            {/* Data do Voo */}
                            <td className="py-3.5 px-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/70 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                                {formatDateBR(route.flightDate)}
                              </span>
                            </td>

                            {/* Companhia */}
                            <td className="py-3.5 px-4 text-left whitespace-nowrap">
                              <AirlineBadge airline={route.lastAirline} size="sm" />
                            </td>

                            {/* Sua Meta */}
                            <td className="py-3.5 px-4 text-right font-semibold text-slate-500 whitespace-nowrap tabular-nums">
                              {formatCurrency(route.targetPrice)}
                            </td>

                            {/* Preço Atual */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                              <span
                                className={`text-sm font-black tracking-tight ${
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

                            {/* Status / Variação */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {!route.isActive ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                  Pausada
                                </span>
                              ) : !hasPrice ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3" />
                                  Pendente
                                </span>
                              ) : isBelow ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>No Alvo (-{formatCurrency(diff)})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  +{formatCurrency(price - route.targetPrice)} (+{diffPercent}%)
                                </span>
                              )}
                            </td>

                            {/* Ações Rápidas */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => handleSingleRouteSearch(route)}
                                  disabled={isSearchingThis}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer disabled:opacity-50"
                                  title="Buscar cotação agora"
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${isSearchingThis ? "animate-spin text-sky-600" : ""}`} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingRoute(route);
                                    setIsRouteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                  title="Editar Rota"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setHistoryModalRoute(route)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                  title="Ver Gráfico e Histórico"
                                >
                                  <BarChart2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={flightUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                                  title="Ver no Google Flights"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => setRouteToDelete(route)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Excluir Rota"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Mobile Card List (< 768px) */}
              <div className="md:hidden space-y-3">
                {filteredRoutes.map((route) => {
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

                  const isSearchingThis = searchingRouteId === route.id;

                  return (
                    <div
                      key={route.id}
                      className={`p-4 rounded-2xl border bg-white shadow-2xs space-y-3 ${
                        !route.isActive
                          ? "opacity-60 border-slate-200 bg-slate-50/50"
                          : isBelow
                          ? "border-emerald-300 bg-emerald-50/15"
                          : "border-slate-200/90"
                      }`}
                    >
                      {/* Route Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-800">
                            {route.origin}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-xs font-bold text-slate-800">
                            {route.destination}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {formatDateBR(route.flightDate)}
                        </span>
                      </div>

                      {/* Airline & Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <AirlineBadge airline={route.lastAirline} size="sm" />
                        <div>
                          {!route.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                              Pausada
                            </span>
                          ) : !hasPrice ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                              Pendente
                            </span>
                          ) : isBelow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              No Alvo (-{formatCurrency(diff)})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700">
                              +{formatCurrency(price - route.targetPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Prices Strip */}
                      <div className="flex items-baseline justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                            Preço Atual
                          </span>
                          <span className={`text-base font-black tracking-tight tabular-nums ${hasPrice ? (isBelow ? "text-emerald-600" : "text-slate-900") : "text-slate-400"}`}>
                            {hasPrice ? formatCurrency(price) : "—"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                            Sua Meta
                          </span>
                          <span className="text-xs font-bold text-slate-600 tabular-nums">
                            {formatCurrency(route.targetPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleSingleRouteSearch(route)}
                            disabled={isSearchingThis}
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                            title="Buscar agora"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSearchingThis ? "animate-spin text-sky-600" : ""}`} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRoute(route);
                              setIsRouteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setHistoryModalRoute(route)}
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            title="Histórico"
                          >
                            <BarChart2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRouteToDelete(route)}
                            className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <a
                          href={flightUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
                        >
                          <span>Google Flights</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals & Dialogs */}
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

      <ConfirmDialog
        isOpen={Boolean(routeToDelete)}
        title="Excluir Monitoramento"
        message={`Deseja realmente remover o monitoramento da rota ${routeToDelete?.origin} → ${routeToDelete?.destination}? Todo o histórico de preços será permanentemente apagado.`}
        confirmLabel="Excluir Rota"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRouteToDelete(null)}
      />
    </div>
  );
}
