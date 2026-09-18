"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import MultiRoutePriceChart from "@/components/MultiRoutePriceChart";
import StatisticalAnalysisCard from "@/components/StatisticalAnalysisCard";
import RouteMultiSelectDropdown from "@/components/RouteMultiSelectDropdown";
import ExpandableSearch from "@/components/ExpandableSearch";
import CustomSelect from "@/components/CustomSelect";
import Tooltip from "@/components/Tooltip";
import AirlineBadge from "@/components/AirlineBadge";
import { MonitoredRoute, FlightHistoryEntry } from "@/lib/types";
import {
  formatCurrencyLocale,
  formatUsdEstimate,
  formatDateLocale,
  formatDateTimeLocale,
  formatRelativeTimeLocale,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
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
  const { t, locale } = useTranslation();
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
          const successTemplate = t.history.backfillSuccess
            .replace("{count}", String(json.importedCount))
            .replace("{firstDate}", json.firstDate)
            .replace("{lastDate}", json.lastDate);
          setBackfillMessage({
            type: "success",
            text: successTemplate,
          });
        } else {
          setBackfillMessage({
            type: "info",
            text: json.message || t.history.backfillSynced,
          });
        }
        // Recarrega histórico
        const updated = await fetch(`/api/history?route_id=${routeId}`).then((r) => r.json());
        if (updated.success) setHistory(updated.data || []);
        const allUpdated = await fetch("/api/history?limit=500").then((r) => r.json());
        if (allUpdated.success) setAllHistory(allUpdated.data || []);
      } else {
        setBackfillMessage({ type: "error", text: json.error || t.history.backfillError });
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
      <Tooltip content={`${t.dashboard.filters.sortBy}: ${label}`} position="top">
        <button
          type="button"
          onClick={() => handleToggleSort(field)}
          className={`inline-flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer select-none hover:text-slate-950 ${
            isActive ? "text-sky-700 font-black" : "text-slate-500"
          } ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}
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
      </Tooltip>
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
                <span>{t.history.title}</span>
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {allHistory.length} {t.common.records}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {t.history.subtitle}
            </p>
          </div>

          {/* Seletor Multi-Rotas */}
          {routes.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-semibold">{t.history.displayLabel}</span>
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
                {t.history.totalRecords}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {historyStats.totalRecords} <span className="text-xs font-medium text-slate-400">{t.history.quotesLabel}</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.history.allTimeLow}
              </span>
              <span className="text-base font-black text-emerald-600 tabular-nums">
                {historyStats.minPrice ? formatCurrencyLocale(historyStats.minPrice, "BRL", locale) : "—"}
              </span>
              {locale === "en" && historyStats.minPrice && (
                <span className="text-[10px] text-slate-400 font-normal block">
                  ({formatUsdEstimate(historyStats.minPrice, "~")})
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.history.avgPrice}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {historyStats.avgPrice ? formatCurrencyLocale(historyStats.avgPrice, "BRL", locale) : "—"}
              </span>
              {locale === "en" && historyStats.avgPrice && (
                <span className="text-[10px] text-slate-400 font-normal block">
                  ({formatUsdEstimate(historyStats.avgPrice, "~")})
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Globe className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.history.analyzedRoutes}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {activeSelectedRoutes.length} <span className="text-xs font-medium text-slate-400">{t.history.activeLabel}</span>
              </span>
            </div>
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">{t.history.noRoutes}</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {t.history.noRoutesDesc}
            </p>
          </div>
        ) : selectedRouteIds.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              {t.history.noRoutesSelected}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
              {t.history.noRoutesSelectedDesc}
            </p>
            <button
              onClick={() => setSelectedRouteIds(routes.map((r) => r.id))}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              {t.history.selectAllRoutes}
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
                    <span>{t.history.visualComparison} ({activeSelectedRoutes.length} {t.nav.routes.toLowerCase()})</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {t.history.visualComparisonDesc}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-2" />
                  <span className="text-xs">{t.history.loadingUnified}</span>
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
                    {t.history.consolidatedHistory}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {t.history.showingRecords.replace("{count}", String(totalMultiItems))}
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
                      {t.history.filterAll}
                    </button>
                    <button
                      onClick={() => setStatusFilter("target")}
                      className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === "target" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-emerald-700"
                      }`}
                    >
                      {t.history.filterTarget}
                    </button>
                    <button
                      onClick={() => setStatusFilter("above")}
                      className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === "above" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {t.history.filterAbove}
                    </button>
                  </div>

                  {/* Airline Filter */}
                  {historyAirlines.length > 0 && (
                    <div className="w-36">
                      <CustomSelect
                        value={airlineFilter}
                        onChange={(val) => setAirlineFilter(val)}
                        options={[
                          { value: "all", label: t.history.allAirlines },
                          ...historyAirlines.map((cia) => ({
                            value: cia,
                            label: cia,
                          })),
                        ]}
                        size="sm"
                      />
                    </div>
                  )}

                  {/* Expandable Search */}
                  <ExpandableSearch
                    value={tableSearch}
                    onChange={setTableSearch}
                    placeholder={t.history.searchPlaceholder}
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
                  {t.history.noRecordsFilter}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="block mx-auto mt-2 text-sky-600 hover:underline font-semibold cursor-pointer"
                    >
                      {t.common.clearFilters}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                    <table className="w-full text-xs text-left text-slate-700">
                      <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/80 font-bold">
                        <tr>
                          <th className="px-4 py-3.5">{t.history.tableSegment}</th>
                          <th className="px-4 py-3.5 text-center">{t.history.tableFlightDate}</th>
                          <th className="px-4 py-3.5">
                            {renderSortHeader(t.history.tableQueryDate, "searchedAt")}
                          </th>
                          <th className="px-4 py-3.5 text-right">
                            {renderSortHeader(t.history.tablePrice, "lowestPrice", "right")}
                          </th>
                          <th className="px-4 py-3.5">{t.history.tableAirline}</th>
                          <th className="px-4 py-3.5 text-center">{t.history.tableStatusVsTarget}</th>
                          <th className="px-4 py-3.5 text-right">
                            <span className="sr-only">{t.history.tableAction}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedMultiHistory.map((item) => {
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
                                  {formatDateLocale(item.flightDate, locale)}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 font-medium text-slate-500 whitespace-nowrap">
                                <div className="font-mono text-xs text-slate-700">
                                  {formatDateTimeLocale(item.searchedAt, locale)}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {formatRelativeTimeLocale(item.searchedAt, locale)}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                                <div>{formatCurrencyLocale(item.lowestPrice, item.currency, locale)}</div>
                                {locale === "en" && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    {formatUsdEstimate(item.lowestPrice)}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <AirlineBadge airline={item.airline} size="sm" />
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isBelow
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                                      : "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                                  }`}
                                >
                                  {isBelow ? (
                                    <>
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{t.history.targetMetDiff} (-{formatCurrencyLocale(targetPrice - item.lowestPrice, "BRL", locale)})</span>
                                    </>
                                  ) : (
                                    <span>+{formatCurrencyLocale(item.lowestPrice - targetPrice, "BRL", locale)} {t.history.aboveTargetDiff}</span>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <Tooltip content={t.history.viewFlightBtn || t.common.viewFlight} position="left">
                                  <a
                                    href={flightUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs cursor-pointer"
                                    aria-label={t.history.viewFlightBtn || t.common.viewFlight}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </Tooltip>
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
                      {t.common.showing}{" "}
                      <strong className="text-slate-800">
                        {totalMultiItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                      </strong>{" "}
                      {t.common.to}{" "}
                      <strong className="text-slate-800">
                        {Math.min(currentPage * pageSize, totalMultiItems)}
                      </strong>{" "}
                      {t.common.of} <strong className="text-slate-800">{totalMultiItems}</strong> {t.common.records}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>{t.common.previousPage}</span>
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
                        <span>{t.common.nextPage}</span>
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
                      {formatDateLocale(singleRoute.flightDate, locale)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {getAirportName(singleRoute.origin)} {locale === "en" ? "to" : "para"} {getAirportName(singleRoute.destination)} • {t.history.targetLabel}{" "}
                    <strong className="text-slate-800 font-bold">{formatCurrencyLocale(singleRoute.targetPrice, "BRL", locale)}</strong>
                    {locale === "en" && (
                      <span className="text-slate-400 font-normal ml-1">
                        ({formatUsdEstimate(singleRoute.targetPrice)})
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleBackfillRoute(singleRoute.id)}
                    disabled={isBackfilling}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                  >
                    <History className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
                    <span>{isBackfilling ? t.history.importing : t.history.import30d}</span>
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
                  {t.history.priceEvolution}
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
                      {t.history.queryLog} ({totalSingleItems})
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t.history.queryLogDesc}
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
                        {t.history.filterAll}
                      </button>
                      <button
                        onClick={() => setStatusFilter("target")}
                        className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === "target" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-emerald-700"
                        }`}
                      >
                        {t.history.filterTarget}
                      </button>
                      <button
                        onClick={() => setStatusFilter("above")}
                        className={`py-1 px-2.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          statusFilter === "above" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {t.history.filterAbove}
                      </button>
                    </div>

                    {/* Expandable Search */}
                    <ExpandableSearch
                      value={tableSearch}
                      onChange={setTableSearch}
                      placeholder={t.history.searchPlaceholder}
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
                  <p className="text-xs text-slate-500 font-medium py-4">{t.common.noResults}</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
                      <table className="w-full text-xs text-left text-slate-700">
                        <thead className="bg-slate-50/90 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200/80 font-bold">
                          <tr>
                            <th className="px-3.5 py-3.5 w-12 text-slate-400 font-mono text-center">#</th>
                            <th className="px-4 py-3.5">
                              {renderSortHeader(t.history.tableQueryDate, "searchedAt")}
                            </th>
                            <th className="px-4 py-3.5 text-right">
                              {renderSortHeader(t.history.tablePrice, "lowestPrice", "right")}
                            </th>
                            <th className="px-4 py-3.5">{t.history.tableAirline}</th>
                            <th className="px-4 py-3.5">{t.history.tableFlight}</th>
                            <th className="px-4 py-3.5">{t.history.tableTimes}</th>
                            <th className="px-4 py-3.5 text-center">{t.history.tableStatus}</th>
                            <th className="px-4 py-3.5 text-right">
                              <span className="sr-only">{t.history.tableAction}</span>
                            </th>
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
                                    {formatDateTimeLocale(item.searchedAt, locale)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {formatRelativeTimeLocale(item.searchedAt, locale)}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm tabular-nums whitespace-nowrap">
                                  <div>{formatCurrencyLocale(item.lowestPrice, item.currency, locale)}</div>
                                  {locale === "en" && (
                                    <div className="text-[10px] text-slate-400 font-normal">
                                      {formatUsdEstimate(item.lowestPrice)}
                                    </div>
                                  )}
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
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                                        : "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                                    }`}
                                  >
                                    {isBelow ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>{t.dashboard.table.targetMet}</span>
                                      </>
                                    ) : (
                                      <span>{t.dashboard.table.aboveTarget}</span>
                                    )}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                  <Tooltip content={t.history.viewFlightBtn || t.common.viewFlight} position="left">
                                    <a
                                      href={flightUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-xl text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-2xs cursor-pointer"
                                      aria-label={t.history.viewFlightBtn || t.common.viewFlight}
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </Tooltip>
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
                        {t.common.showing}{" "}
                        <strong className="text-slate-800">
                          {totalSingleItems === 0 ? 0 : (singleCurrentPage - 1) * singlePageSize + 1}
                        </strong>{" "}
                        {t.common.to}{" "}
                        <strong className="text-slate-800">
                          {Math.min(singleCurrentPage * singlePageSize, totalSingleItems)}
                        </strong>{" "}
                        {t.common.of} <strong className="text-slate-800">{totalSingleItems}</strong> {t.common.records}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSingleCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={singleCurrentPage === 1}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>{t.common.previousPage}</span>
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
                          <span>{t.common.nextPage}</span>
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
              Loading...
            </div>
          </main>
        </div>
      }
    >
      <HistoricoContent />
    </Suspense>
  );
}
