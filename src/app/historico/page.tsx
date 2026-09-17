"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import MultiRoutePriceChart from "@/components/MultiRoutePriceChart";
import StatisticalAnalysisCard from "@/components/StatisticalAnalysisCard";
import RouteMultiSelectDropdown from "@/components/RouteMultiSelectDropdown";
import ExpandableSearch from "@/components/ExpandableSearch";
import AirlineBadge from "@/components/AirlineBadge";
import { MonitoredRoute, FlightHistoryEntry } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatRelativeTime,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";
import {
  BarChart2,
  RefreshCw,
  ExternalLink,
  Globe,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  History,
  AlertCircle,
  CheckCircle2,
  Layers,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Plane,
  DollarSign,
  Calendar,
  X,
  Sparkles,
} from "lucide-react";
import { ROUTE_COLORS } from "@/components/MultiRoutePriceChart";

function HistoricoContent() {
  const searchParams = useSearchParams();
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState<number[]>([]);
  const [history, setHistory] = useState<FlightHistoryEntry[]>([]);
  const [allHistory, setAllHistory] = useState<FlightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillMessage, setBackfillMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Table search & filters
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "target" | "above">("all");
  const [airlineFilter, setAirlineFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"searchedAt" | "lowestPrice">("searchedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [singlePageSize, setSinglePageSize] = useState<number>(10);
  const [singleCurrentPage, setSingleCurrentPage] = useState<number>(1);

  const handleBackfillRoute = async (routeId: number) => {
    setIsBackfilling(true);
    setBackfillMessage(null);
    try {
      const res = await fetch(`/api/routes/${routeId}/backfill`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        if (json.importedCount > 0) {
          setBackfillMessage({
            type: "success",
            text: `🎉 ${json.importedCount} dias de histórico de preços importados (${json.firstDate} até ${json.lastDate}).`,
          });
        } else {
          setBackfillMessage({
            type: "info",
            text: json.message || "Histórico retroativo já está sincronizado.",
          });
        }
        // Recarrega histórico
        const updated = await fetch(`/api/history?route_id=${routeId}`).then((r) => r.json());
        if (updated.success) setHistory(updated.data || []);
        const allUpdated = await fetch("/api/history?limit=500").then((r) => r.json());
        if (allUpdated.success) setAllHistory(allUpdated.data || []);
      } else {
        setBackfillMessage({ type: "error", text: json.error || "Erro ao importar histórico." });
      }
    } catch (err: any) {
      setBackfillMessage({ type: "error", text: err.message });
    } finally {
      setIsBackfilling(false);
    }
  };

  // Carrega rotas e histórico completo inicial
  useEffect(() => {
    const routeParam = searchParams.get("route") || searchParams.get("route_id");
    const targetRouteId = routeParam ? parseInt(routeParam, 10) : null;

    Promise.all([
      fetch("/api/routes").then((res) => res.json()),
      fetch("/api/history?limit=500").then((res) => res.json()),
    ])
      .then(([routesRes, historyRes]) => {
        if (routesRes.success && routesRes.data?.length > 0) {
          const loadedRoutes: MonitoredRoute[] = routesRes.data;
          setRoutes(loadedRoutes);
          if (targetRouteId && loadedRoutes.some((r) => r.id === targetRouteId)) {
            setSelectedRouteIds([targetRouteId]);
          } else {
            setSelectedRouteIds(loadedRoutes.map((r) => r.id));
          }
        }
        if (historyRes.success && historyRes.data) {
          setAllHistory(historyRes.data);
          setHistory(historyRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Quando o usuário seleciona exatamente 1 rota, carrega os dados específicos dela
  useEffect(() => {
    if (selectedRouteIds.length === 1) {
      const singleId = selectedRouteIds[0];
      setLoading(true);
      fetch(`/api/history?route_id=${singleId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setHistory(json.data || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [selectedRouteIds]);

  // Reseta página ao mudar filtros de rota ou tamanho da página
  useEffect(() => {
    setCurrentPage(1);
    setSingleCurrentPage(1);
  }, [selectedRouteIds, pageSize, singlePageSize, tableSearch, statusFilter, airlineFilter]);

  // Rotas ativas selecionadas
  const activeSelectedRoutes = useMemo(() => {
    return routes.filter((r) => selectedRouteIds.includes(r.id));
  }, [routes, selectedRouteIds]);

  // Histórico filtrado para as rotas selecionadas
  const activeSelectedHistory = useMemo(() => {
    return allHistory.filter((h) => h.routeId != null && selectedRouteIds.includes(h.routeId));
  }, [allHistory, selectedRouteIds]);

  // Rota única se selecionada apenas 1
  const singleRoute = useMemo(() => {
    if (selectedRouteIds.length === 1) {
      return routes.find((r) => r.id === selectedRouteIds[0]) || null;
    }
    return null;
  }, [routes, selectedRouteIds]);

  // Mapeamento de rotas
  const routeMap = useMemo(() => {
    const map = new Map<number, MonitoredRoute>();
    routes.forEach((r) => map.set(r.id, r));
    return map;
  }, [routes]);

  // Mapa de cores
  const routeColorMap = useMemo(() => {
    const map = new Map<number, string>();
    routes.forEach((r, idx) => {
      map.set(r.id, ROUTE_COLORS[idx % ROUTE_COLORS.length]);
    });
    return map;
  }, [routes]);

  // Global KPIs for History
  const historyStats = useMemo(() => {
    const totalRecords = allHistory.length;
    let minPrice: number | null = null;
    let minPriceRecord: FlightHistoryEntry | null = null;
    let sumPrice = 0;
    let validCount = 0;

    allHistory.forEach((h) => {
      if (h.lowestPrice > 0) {
        sumPrice += h.lowestPrice;
        validCount += 1;
        if (minPrice === null || h.lowestPrice < minPrice) {
          minPrice = h.lowestPrice;
          minPriceRecord = h;
        }
      }
    });

    const avgPrice = validCount > 0 ? Math.round(sumPrice / validCount) : null;

    return { totalRecords, minPrice, minPriceRecord, avgPrice };
  }, [allHistory]);

  // Available airlines in history
  const historyAirlines = useMemo(() => {
    const set = new Set<string>();
    allHistory.forEach((h) => {
      if (h.airline && h.airline.trim()) {
        set.add(h.airline.trim());
      }
    });
    return Array.from(set).sort();
  }, [allHistory]);

  const handleToggleSort = (field: "searchedAt" | "lowestPrice") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "lowestPrice" ? "asc" : "desc");
    }
  };

  // Filtered & Sorted Multi History
  const filteredMultiHistory = useMemo(() => {
    let result = activeSelectedHistory.filter((item) => {
      const r = item.routeId != null ? routeMap.get(item.routeId) : null;
      const targetPrice = r?.targetPrice || 0;
      const isBelow = item.lowestPrice <= targetPrice;

      // Status filter
      if (statusFilter === "target" && !isBelow) return false;
      if (statusFilter === "above" && isBelow) return false;

      // Airline filter
      if (airlineFilter !== "all") {
        if ((item.airline || "").toLowerCase() !== airlineFilter.toLowerCase()) return false;
      }

      // Search filter
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const orig = (item.origin || "").toLowerCase();
        const dest = (item.destination || "").toLowerCase();
        const air = (item.airline || "").toLowerCase();
        const date = (item.flightDate || "").toLowerCase();
        return orig.includes(q) || dest.includes(q) || air.includes(q) || date.includes(q);
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortField === "searchedAt") {
        const timeA = new Date(a.searchedAt).getTime() || 0;
        const timeB = new Date(b.searchedAt).getTime() || 0;
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "lowestPrice") {
        const priceA = Number(a.lowestPrice) || 0;
        const priceB = Number(b.lowestPrice) || 0;
        return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
      }
      return 0;
    });

    return result;
  }, [activeSelectedHistory, routeMap, statusFilter, airlineFilter, tableSearch, sortField, sortDirection]);

  // Filtered & Sorted Single History
  const filteredSingleHistory = useMemo(() => {
    let result = history.filter((item) => {
      const targetPrice = singleRoute?.targetPrice || 0;
      const isBelow = item.lowestPrice <= targetPrice;

      if (statusFilter === "target" && !isBelow) return false;
      if (statusFilter === "above" && isBelow) return false;

      if (airlineFilter !== "all") {
        if ((item.airline || "").toLowerCase() !== airlineFilter.toLowerCase()) return false;
      }

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const air = (item.airline || "").toLowerCase();
        const flightNum = (item.flightNumber || "").toLowerCase();
        const date = (item.flightDate || "").toLowerCase();
        return air.includes(q) || flightNum.includes(q) || date.includes(q);
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortField === "searchedAt") {
        const timeA = new Date(a.searchedAt).getTime() || 0;
        const timeB = new Date(b.searchedAt).getTime() || 0;
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortField === "lowestPrice") {
        const priceA = Number(a.lowestPrice) || 0;
        const priceB = Number(b.lowestPrice) || 0;
        return sortDirection === "asc" ? priceA - priceB : priceB - priceA;
      }
      return 0;
    });

    return result;
  }, [history, singleRoute, statusFilter, airlineFilter, tableSearch, sortField, sortDirection]);

  // Pagination calculations
  const totalMultiItems = filteredMultiHistory.length;
  const totalMultiPages = Math.max(1, Math.ceil(totalMultiItems / pageSize));
  const paginatedMultiHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMultiHistory.slice(start, start + pageSize);
  }, [filteredMultiHistory, currentPage, pageSize]);

  const totalSingleItems = filteredSingleHistory.length;
  const totalSinglePages = Math.max(1, Math.ceil(totalSingleItems / singlePageSize));
  const paginatedSingleHistory = useMemo(() => {
    const start = (singleCurrentPage - 1) * singlePageSize;
    return filteredSingleHistory.slice(start, start + singlePageSize);
  }, [filteredSingleHistory, singleCurrentPage, singlePageSize]);

  const renderSortHeader = (label: string, field: "searchedAt" | "lowestPrice", align: "left" | "right" | "center" = "left") => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleToggleSort(field)}
        className={`inline-flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer select-none hover:text-slate-950 ${
          isActive ? "text-sky-700 font-black" : "text-slate-500"
        } ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}
        title={`Ordenar por ${label}`}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 shrink-0" />
        )}
      </button>
    );
  };

  const hasActiveFilters = tableSearch !== "" || statusFilter !== "all" || airlineFilter !== "all";

  const clearFilters = () => {
    setTableSearch("");
    setStatusFilter("all");
    setAirlineFilter("all");
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header com Dropdown de Seleção de Rotas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>Histórico de Cotações</span>
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allHistory.length} registros
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Análise comparativa de tarifas, anomalias estatísticas e evolução ao longo do tempo.
            </p>
          </div>

          {/* Seletor Multi-Rotas */}
          {routes.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">Exibir:</span>
              <RouteMultiSelectDropdown
                routes={routes}
                selectedIds={selectedRouteIds}
                onChange={setSelectedRouteIds}
              />
            </div>
          )}
        </div>

        {/* Micro-KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Total Registrado
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {historyStats.totalRecords} <span className="text-xs font-medium text-slate-400">cotações</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Menor Preço Histórico
              </span>
              <span className="text-base font-black text-emerald-600 tabular-nums">
                {historyStats.minPrice ? formatCurrency(historyStats.minPrice) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Preço Médio
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {historyStats.avgPrice ? formatCurrency(historyStats.avgPrice) : "—"}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Globe className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Rotas Analisadas
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {activeSelectedRoutes.length} <span className="text-xs font-medium text-slate-400">ativas</span>
              </span>
            </div>
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Nenhuma rota cadastrada</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cadastre suas primeiras rotas para iniciar o acúmulo de dados históricos e gráficos.
            </p>
          </div>
        ) : selectedRouteIds.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Nenhuma rota selecionada no filtro
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
              Use o menu &ldquo;Exibir&rdquo; no topo para marcar as rotas que deseja comparar no gráfico.
            </p>
            <button
              onClick={() => setSelectedRouteIds(routes.map((r) => r.id))}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Selecionar Todas as Rotas
            </button>
          </div>
        ) : selectedRouteIds.length > 1 ? (
          /* ========================================================== */
          /* MODO: MÚLTIPLAS ROTAS SELECIONADAS                         */
          /* ========================================================== */
          <div className="space-y-6 animate-fadeIn">
            {/* Gráfico Multi-Linhas */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>Comparativo Visual de Preços ({activeSelectedRoutes.length} rotas)</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Selecione os intervalos abaixo para visualizar a evolução das tarifas.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                  <span className="text-xs">Carregando dados unificados...</span>
                </div>
              ) : (
                <MultiRoutePriceChart
                  routes={activeSelectedRoutes}
                  allHistory={activeSelectedHistory}
                />
              )}
            </div>

            {/* Tabela Consolidada de Histórico */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              {/* Header da Tabela com Filtros Compactos */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Histórico Consolidado
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Mostrando {totalMultiItems} registros capturados.
                  </p>
                </div>

                {/* Filtros em Linha: Status + Companhia + ExpandableSearch + Paginação */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                  {/* Status Filter */}
                  <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-[11px]">
                    <button
                      onClick={() => setStatusFilter("all")}
                      className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setStatusFilter("target")}
                      className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === "target" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      No Alvo
                    </button>
                    <button
                      onClick={() => setStatusFilter("above")}
                      className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === "above" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Acima
                    </button>
                  </div>

                  {/* Airline Filter */}
                  {historyAirlines.length > 0 && (
                    <select
                      value={airlineFilter}
                      onChange={(e) => setAirlineFilter(e.target.value)}
                      className="py-1.5 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all cursor-pointer"
                    >
                      <option value="all">Todas as Cias</option>
                      {historyAirlines.map((cia) => (
                        <option key={cia} value={cia}>
                          {cia}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Expandable Search */}
                  <ExpandableSearch
                    value={tableSearch}
                    onChange={setTableSearch}
                    placeholder="Buscar rota, cia, data..."
                  />

                  {/* Items per Page Selector */}
                  <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                    {[10, 25, 50].map((size) => (
                      <button
                        key={size}
                        onClick={() => setPageSize(size)}
                        className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                          pageSize === size ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {totalMultiItems === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 font-medium">
                  Nenhum registro encontrado para os filtros selecionados.
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="block mx-auto mt-2 text-sky-600 hover:underline font-semibold cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                    <table className="w-full text-xs text-left text-slate-700">
                      <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/80 font-bold">
                        <tr>
                          <th className="px-3.5 py-3.5 w-12 text-slate-400 font-mono text-center">#</th>
                          <th className="px-4 py-3.5">Trecho</th>
                          <th className="px-4 py-3.5 text-center">Data do Voo</th>
                          <th className="px-4 py-3.5">
                            {renderSortHeader("Data da Consulta", "searchedAt")}
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            {renderSortHeader("Preço", "lowestPrice", "right")}
                          </th>
                          <th className="px-4 py-3.5">Companhia</th>
                          <th className="px-4 py-3.5 text-center">Status vs Meta</th>
                          <th className="px-4 py-3.5 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedMultiHistory.map((item, idx) => {
                          const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                          const r = item.routeId != null ? routeMap.get(item.routeId) : null;
                          const targetPrice = r?.targetPrice || 0;
                          const isBelow = item.lowestPrice <= targetPrice;
                          const color = (item.routeId != null ? routeColorMap.get(item.routeId) : null) || "#0284c7";
                          const flightUrl =
                            item.bookingLink ||
                            getGoogleFlightsUrl(
                              item.origin,
                              item.destination,
                              item.flightDate,
                              r?.passengers || 1
                            );

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3.5 py-3.5 font-mono text-slate-400 text-center font-medium">
                                {rowNumber}
                              </td>
                              <td className="px-4 py-3.5 font-black text-slate-900">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                    {item.origin}
                                  </span>
                                  <span className="text-slate-400">→</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                    {item.destination}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-semibold text-slate-800 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/70 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                                  {formatDateBR(item.flightDate)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                                <div className="font-mono text-xs text-slate-700">
                                  {formatDateTimeBR(item.searchedAt)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {formatRelativeTime(item.searchedAt)}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                                {formatCurrency(item.lowestPrice, item.currency)}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <AirlineBadge airline={item.airline} size="sm" />
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isBelow
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {isBelow ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>No Alvo (-{formatCurrency(targetPrice - item.lowestPrice)})</span>
                                    </>
                                  ) : (
                                    <span>+{formatCurrency(item.lowestPrice - targetPrice)} da meta</span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <a
                                  href={flightUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
                                >
                                  <span>Ver Voo</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Controles Inferiores de Paginação */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 text-xs text-slate-500 border-t border-slate-100">
                    <div>
                      Exibindo{" "}
                      <strong className="text-slate-800">
                        {totalMultiItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                      </strong>{" "}
                      a{" "}
                      <strong className="text-slate-800">
                        {Math.min(currentPage * pageSize, totalMultiItems)}
                      </strong>{" "}
                      de <strong className="text-slate-800">{totalMultiItems}</strong> registros
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </button>

                      {/* Números das Páginas */}
                      <div className="flex items-center gap-1 mx-1">
                        {Array.from({ length: totalMultiPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            return (
                              pageNum === 1 ||
                              pageNum === totalMultiPages ||
                              Math.abs(pageNum - currentPage) <= 1
                            );
                          })
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;

                            return (
                              <div key={pageNum} className="flex items-center">
                                {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                <button
                                  type="button"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                    currentPage === pageNum
                                      ? "bg-slate-900 text-white shadow-2xs"
                                      : "text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </div>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalMultiPages, p + 1))}
                        disabled={currentPage === totalMultiPages}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>Próxima</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================== */
          /* MODO: ROTA INDIVIDUAL SELECIONADA                          */
          /* ========================================================== */
          singleRoute && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header do Card da Rota */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 font-black text-xl tracking-tight text-slate-900">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-800">
                        {singleRoute.origin}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-sm font-bold text-slate-800">
                        {singleRoute.destination}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold">
                      <Calendar className="w-3 h-3" />
                      {formatDateBR(singleRoute.flightDate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {getAirportName(singleRoute.origin)} para {getAirportName(singleRoute.destination)} • Meta de Preço:{" "}
                    <strong className="text-slate-800 font-bold">{formatCurrency(singleRoute.targetPrice)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleBackfillRoute(singleRoute.id)}
                    disabled={isBackfilling}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <History className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
                    <span>{isBackfilling ? "Importando Histórico..." : "Importar Histórico (30d)"}</span>
                  </button>

                  <a
                    href={
                      singleRoute.lastBookingLink ||
                      getGoogleFlightsUrl(
                        singleRoute.origin,
                        singleRoute.destination,
                        singleRoute.flightDate,
                        singleRoute.passengers || 1
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Google Flights</span>
                  </a>
                </div>
              </div>

              {/* Mensagem de Feedback de Backfill */}
              {backfillMessage && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-medium flex items-center gap-2.5 shadow-2xs animate-fadeIn ${
                    backfillMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : backfillMessage.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-sky-50 border-sky-200 text-sky-900"
                  }`}
                >
                  {backfillMessage.type === "success" ? (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-slate-600 shrink-0" />
                  )}
                  <span>{backfillMessage.text}</span>
                </div>
              )}

              {/* Card de Inteligência Estatística */}
              <StatisticalAnalysisCard
                history={history}
                currentPrice={singleRoute.latestPrice}
                origin={singleRoute.origin}
                destination={singleRoute.destination}
                departureDate={singleRoute.flightDate}
              />

              {/* Gráfico Individual */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-800 mb-3">
                  Evolução do Preço ao Longo do Tempo
                </h3>
                <PriceHistoryChart
                  data={history}
                  targetPrice={singleRoute.targetPrice}
                  origin={singleRoute.origin}
                  destination={singleRoute.destination}
                />
              </div>

              {/* Tabela de Consultas da Rota */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
                {/* Header da Tabela com Filtros Compactos */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Registro de Consultas ({totalSingleItems})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Todas as cotações salvas para esta rota específica.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                    {/* Status Filter */}
                    <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 text-[11px]">
                      <button
                        onClick={() => setStatusFilter("all")}
                        className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => setStatusFilter("target")}
                        className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === "target" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        No Alvo
                      </button>
                      <button
                        onClick={() => setStatusFilter("above")}
                        className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === "above" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Acima
                      </button>
                    </div>

                    {/* Expandable Search */}
                    <ExpandableSearch
                      value={tableSearch}
                      onChange={setTableSearch}
                      placeholder="Buscar cia, voo..."
                    />

                    {/* Items per Page */}
                    <div className="hidden md:flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
                      {[10, 25, 50].map((size) => (
                        <button
                          key={size}
                          onClick={() => setSinglePageSize(size)}
                          className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                            singlePageSize === size ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {totalSingleItems === 0 ? (
                  <p className="text-xs text-slate-500 font-medium py-4">Nenhum registro encontrado.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                      <table className="w-full text-xs text-left text-slate-700">
                        <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/80 font-bold">
                          <tr>
                            <th className="px-3.5 py-3.5 w-12 text-slate-400 font-mono text-center">#</th>
                            <th className="px-4 py-3.5">
                              {renderSortHeader("Data da Consulta", "searchedAt")}
                            </th>
                            <th className="px-4 py-3.5 text-right">
                              {renderSortHeader("Preço", "lowestPrice", "right")}
                            </th>
                            <th className="px-4 py-3.5">Companhia</th>
                            <th className="px-4 py-3.5">Voo</th>
                            <th className="px-4 py-3.5">Horários</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-4 py-3.5 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedSingleHistory.map((item, idx) => {
                            const rowNumber = (singleCurrentPage - 1) * singlePageSize + idx + 1;
                            const isBelow = item.lowestPrice <= singleRoute.targetPrice;
                            const flightUrl =
                              item.bookingLink ||
                              getGoogleFlightsUrl(
                                item.origin,
                                item.destination,
                                item.flightDate,
                                singleRoute.passengers || 1
                              );
                            return (
                              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-3.5 py-3.5 font-mono text-slate-400 text-center font-medium">
                                  {rowNumber}
                                </td>
                                <td className="px-4 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                                  <div className="font-mono text-xs text-slate-700">
                                    {formatDateTimeBR(item.searchedAt)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatRelativeTime(item.searchedAt)}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                                  {formatCurrency(item.lowestPrice, item.currency)}
                                </td>
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <AirlineBadge airline={item.airline} size="sm" />
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                                  {item.flightNumber || "—"}
                                </td>
                                <td className="px-4 py-3.5 font-mono text-slate-600 whitespace-nowrap">
                                  {item.departureTime || "—"} → {item.arrivalTime || "—"}
                                </td>
                                <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                      isBelow
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    {isBelow ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>No Alvo</span>
                                      </>
                                    ) : (
                                      <span>Acima da Meta</span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  <a
                                    href={flightUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs"
                                  >
                                    <span>Ver Voo</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Controles Inferiores de Paginação */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 text-xs text-slate-500 border-t border-slate-100">
                      <div>
                        Exibindo{" "}
                        <strong className="text-slate-800">
                          {totalSingleItems === 0 ? 0 : (singleCurrentPage - 1) * singlePageSize + 1}
                        </strong>{" "}
                        a{" "}
                        <strong className="text-slate-800">
                          {Math.min(singleCurrentPage * singlePageSize, totalSingleItems)}
                        </strong>{" "}
                        de <strong className="text-slate-800">{totalSingleItems}</strong> registros
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSingleCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={singleCurrentPage === 1}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Anterior</span>
                        </button>

                        {/* Números das Páginas */}
                        <div className="flex items-center gap-1 mx-1">
                          {Array.from({ length: totalSinglePages }, (_, i) => i + 1)
                            .filter((pageNum) => {
                              return (
                                pageNum === 1 ||
                                pageNum === totalSinglePages ||
                                Math.abs(pageNum - singleCurrentPage) <= 1
                              );
                            })
                            .map((pageNum, idx, arr) => {
                              const prev = arr[idx - 1];
                              const showEllipsis = prev && pageNum - prev > 1;

                              return (
                                <div key={pageNum} className="flex items-center">
                                  {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                                  <button
                                    type="button"
                                    onClick={() => setSingleCurrentPage(pageNum)}
                                    className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition-colors cursor-pointer ${
                                      singleCurrentPage === pageNum
                                        ? "bg-slate-900 text-white shadow-2xs"
                                        : "text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                </div>
                              );
                            })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSingleCurrentPage((p) => Math.min(totalSinglePages, p + 1))}
                          disabled={singleCurrentPage === totalSinglePages}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                        >
                          <span>Próxima</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}

export default function HistoricoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pb-20 bg-slate-50/60">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
              Carregando histórico...
            </div>
          </main>
        </div>
      }
    >
      <HistoricoContent />
    </Suspense>
  );
}
