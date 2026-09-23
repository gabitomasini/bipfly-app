"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
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
import SkeletonLoader from "@/components/SkeletonLoader";
import ImportHistoryDropdown from "@/components/ImportHistoryDropdown";
import { useToast } from "@/components/Toast";
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
  ChevronDown,
} from "lucide-react";
import { useScanning } from "@/context/ScanningContext";
import { ROUTE_COLORS } from "@/components/MultiRoutePriceChart";

function HistoricoContent() {
  const { t, locale } = useTranslation();
  const { addToast } = useToast();
  const { startCustomScan, endCustomScan } = useScanning();
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

  const handleBackfillRoute = async (routeId?: number, days = 60) => {
    const targetId = routeId || (selectedRouteIds.length === 1 ? selectedRouteIds[0] : routes[0]?.id);
    if (!targetId) {
      addToast(
        locale === "en" ? "Please select a route to import history." : "Selecione uma rota para importar o histórico.",
        "info"
      );
      return;
    }

    setIsBackfilling(true);
    setBackfillMessage(null);

    const targetRoute = routes.find((r) => r.id === targetId);
    const routeLabel = targetRoute ? `${targetRoute.origin} → ${targetRoute.destination}` : `Rota #${targetId}`;

    const scanTitle = locale === "en"
      ? `Importing ${days}-Day Price History`
      : `Importando Histórico de ${days} Dias`;
    const scanSub = `${routeLabel} • Google Flights`;

    startCustomScan(scanTitle, scanSub, targetId);

    try {
      const res = await fetch(`/api/routes/${targetId}/backfill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const json = await res.json();
      if (json.success && json.importedCount > 0) {
        const msg = locale === "en"
          ? `Successfully imported ${json.importedCount} days of historical price data for ${routeLabel}!`
          : `Sucesso! ${json.importedCount} dias de histórico de preços importados para ${routeLabel}!`;
        
        setBackfillMessage({ type: "success", text: msg });
        addToast(msg, "success");
        endCustomScan(true);

        // Recarrega histórico
        const updated = await fetch(`/api/history?route_id=${targetId}`).then((r) => r.json());
        if (updated.success && updated.data) setHistory(updated.data);
        const allUpdated = await fetch("/api/history?limit=500").then((r) => r.json());
        if (allUpdated.success && allUpdated.data) setAllHistory(allUpdated.data);
      } else {
        const failMsg = json.message || (
          locale === "en"
            ? `Google Flights has no historical price records for ${days} days on this route. Try a shorter period (e.g. 30 days).`
            : `O Google Flights não retornou histórico para ${days} dias nesta rota. Tente um período menor (ex: 30 dias).`
        );
        setBackfillMessage({ type: "info", text: failMsg });
        addToast(failMsg, "info");
        endCustomScan(false);
      }
    } catch (err: any) {
      const errMsg = locale === "en"
        ? "Failed to import historical data from Google Flights."
        : "Falha ao consultar histórico no Google Flights. Tente novamente.";
      setBackfillMessage({ type: "error", text: errMsg });
      addToast(errMsg, "error");
      endCustomScan(false);
    } finally {
      setIsBackfilling(false);
    }
  };

  // Carrega rotas e histórico completo inicial de forma unificada
  useEffect(() => {
    const routeParam = searchParams.get("route") || searchParams.get("route_id");
    const targetRouteId = routeParam ? parseInt(routeParam, 10) : null;

    setLoading(true);
    Promise.all([
      fetch("/api/routes").then((res) => res.json()),
      fetch("/api/history?limit=500").then((res) => res.json()),
    ])
      .then(async ([routesRes, historyRes]) => {
        let loadedRoutes: MonitoredRoute[] = [];
        if (routesRes.success && routesRes.data?.length > 0) {
          loadedRoutes = routesRes.data;
          setRoutes(loadedRoutes);
        } else {
          setRoutes([]);
        }

        let initialHistory: FlightHistoryEntry[] = [];
        if (historyRes.success && historyRes.data) {
          initialHistory = historyRes.data;
          setAllHistory(initialHistory);
        } else {
          setAllHistory([]);
        }

        if (loadedRoutes.length > 0) {
          if (targetRouteId && loadedRoutes.some((r) => r.id === targetRouteId)) {
            setSelectedRouteIds([targetRouteId]);
          } else {
            setSelectedRouteIds(loadedRoutes.map((r) => r.id));
          }
        } else {
          setSelectedRouteIds([]);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar histórico inicial:", err);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  // Atualiza rotas selecionadas (sincronizado bidirecionalmente com chips e dropdown)
  const handleSelectRouteIds = (newIds: number[]) => {
    setSelectedRouteIds(newIds);
  };

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
    if (routes.length === 0 || selectedRouteIds.length === 0) return [];
    return allHistory.filter((h) => {
      if (h.routeId != null) return selectedRouteIds.includes(h.routeId);
      return routes.some(
        (r) =>
          selectedRouteIds.includes(r.id) &&
          r.origin === h.origin &&
          r.destination === h.destination &&
          r.flightDate === h.flightDate
      );
    });
  }, [allHistory, selectedRouteIds, routes]);

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
    if (routes.length === 0 || activeSelectedRoutes.length === 0) {
      return { totalRecords: 0, minPrice: null, minPriceRecord: null, avgPrice: null };
    }

    const currentHistory = activeSelectedHistory;
    const totalRecords = currentHistory.length;
    let minPrice: number | null = null;
    let minPriceRecord: FlightHistoryEntry | null = null;
    let sumPrice = 0;
    let validCount = 0;

    currentHistory.forEach((h) => {
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
  }, [routes.length, activeSelectedRoutes.length, activeSelectedHistory]);

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
    <div className="min-h-full pb-28 md:pb-14 bg-slate-50/70">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Header com Dropdown de Seleção de Rotas */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>{t.history.title}</span>
              </h1>
              {loading ? (
                <div className="h-5 w-20 bg-slate-200 rounded-full animate-pulse" />
              ) : routes.length > 0 && allHistory.length > 0 ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {allHistory.length} {t.common.records}
                </span>
              ) : null}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {t.history.subtitle}
            </p>
          </div>

          {/* Seletor Multi-Rotas & Importar Histórico */}
          {loading ? (
            <div className="h-9 w-60 bg-slate-200 rounded-xl animate-pulse" />
          ) : routes.length > 0 ? (
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">{t.history.displayLabel}</span>
                <RouteMultiSelectDropdown
                  routes={routes}
                  selectedIds={selectedRouteIds}
                  onChange={handleSelectRouteIds}
                />
              </div>

              {/* Botão Importar Histórico com Dropdown de 30, 60, 120 dias */}
              <ImportHistoryDropdown
                onImport={(days) => handleBackfillRoute(selectedRouteIds.length === 1 ? selectedRouteIds[0] : undefined, days)}
                isLoading={isBackfilling}
                variant="primary"
                align="right"
              />
            </div>
          ) : null}
        </div>

        {/* Micro-KPI Strip */}
        {routes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <History className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {t.history.totalRecords}
                </span>
                {loading ? (
                  <div className="h-5 w-16 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                  <span className="text-base font-black text-slate-900 tabular-nums">
                    {historyStats.totalRecords} <span className="text-xs font-medium text-slate-400">{t.history.quotesLabel}</span>
                  </span>
                )}
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
                {loading ? (
                  <div className="h-5 w-20 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                  <>
                    <span className="text-base font-black text-emerald-600 tabular-nums">
                      {historyStats.minPrice ? formatCurrencyLocale(historyStats.minPrice, "BRL", locale) : "—"}
                    </span>
                    {locale === "en" && historyStats.minPrice && (
                      <span className="text-[10px] text-slate-400 font-normal block">
                        ({formatUsdEstimate(historyStats.minPrice, "~")})
                      </span>
                    )}
                  </>
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
                {loading ? (
                  <div className="h-5 w-20 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                  <>
                    <span className="text-base font-black text-slate-900 tabular-nums">
                      {historyStats.avgPrice ? formatCurrencyLocale(historyStats.avgPrice, "BRL", locale) : "—"}
                    </span>
                    {locale === "en" && historyStats.avgPrice && (
                      <span className="text-[10px] text-slate-400 font-normal block">
                        ({formatUsdEstimate(historyStats.avgPrice, "~")})
                      </span>
                    )}
                  </>
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
                {loading ? (
                  <div className="h-5 w-14 bg-slate-200 rounded animate-pulse mt-1" />
                ) : (
                  <span className="text-base font-black text-slate-900 tabular-nums">
                    {activeSelectedRoutes.length} <span className="text-xs font-medium text-slate-400">{t.history.activeLabel}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Banner de Ação Rápida: Quando ainda não há histórico registrado */}
        {!loading && routes.length > 0 && allHistory.length === 0 && (
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-sky-500/10 p-5 sm:p-6 rounded-2xl border border-indigo-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fadeIn">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <History className={`w-5 h-5 ${isBackfilling ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{t.history.noHistoryRecordedYet}</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl font-medium">
                  {t.history.noHistoryRecordedDesc}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <ImportHistoryDropdown
                onImport={(days) => handleBackfillRoute(selectedRouteIds[0] || routes[0]?.id, days)}
                isLoading={isBackfilling}
                variant="primary"
                align="right"
              />
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-48 bg-slate-200 rounded-lg animate-pulse" />
                  <div className="h-3 w-64 bg-slate-100 rounded-lg animate-pulse" />
                </div>
                <div className="h-8 w-32 bg-slate-200 rounded-xl animate-pulse" />
              </div>
              <div className="h-64 sm:h-80 bg-slate-50 border border-slate-100 rounded-xl animate-pulse flex items-center justify-center">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                  <span>{t.history.loadingUnified}</span>
                </div>
              </div>
            </div>
            <SkeletonLoader variant="row" count={5} />
          </div>
        ) : routes.length === 0 ? (
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
        ) : selectedRouteIds.length >= 1 ? (
          /* ========================================================== */
          /* MODO: MÚLTIPLAS / ROTA SELECIONADAS                        */
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
                  routes={routes}
                  selectedRouteIds={selectedRouteIds}
                  onSelectedRouteIdsChange={handleSelectRouteIds}
                  allHistory={allHistory}
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
                  {/* Desktop Table (Visible on lg: >= 1024px) */}
                  <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
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
                              r?.passengers || 1,
                              item.returnDate || r?.returnDate,
                              item.tripType || r?.tripType,
                              item.children || r?.children || 0,
                              item.infantsInLap || r?.infantsInLap || 0
                            );

                          const isRoundTrip = (item.tripType === "round_trip" || r?.tripType === "round_trip");
                          const returnDate = item.returnDate || r?.returnDate;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3.5 font-black text-slate-900">
                                <div className="flex items-center gap-2 flex-wrap">
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
                                  {isRoundTrip && (
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.2 rounded">
                                      🔁
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-semibold text-slate-800 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100/70 text-slate-700 text-[11px] font-medium border border-slate-200/60">
                                  {formatDateLocale(item.flightDate, locale)}
                                  {isRoundTrip && returnDate && ` → ${formatDateLocale(returnDate, locale)}`}
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

                  {/* Mobile / Tablet Compact Stream (Visible on lg: < 1024px, zero horizontal scroll) */}
                  <div className="lg:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden bg-white">
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
                          r?.passengers || 1,
                          item.returnDate || r?.returnDate,
                          item.tripType || r?.tripType,
                          item.children || r?.children || 0,
                          item.infantsInLap || r?.infantsInLap || 0
                        );
                      const isRoundTrip = (item.tripType === "round_trip" || r?.tripType === "round_trip");
                      const returnDate = item.returnDate || r?.returnDate;

                      return (
                        <div
                          key={item.id}
                          className="p-3 sm:p-3.5 hover:bg-slate-50/75 transition-colors flex items-center justify-between gap-2.5 sm:gap-3"
                        >
                          {/* Left: Route segment + Airline + Dates + Query Time */}
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                {item.origin}
                              </span>
                              <span className="text-slate-400 text-xs">→</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                                {item.destination}
                              </span>
                              {isRoundTrip && (
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1 rounded">
                                  🔁
                                </span>
                              )}
                              <AirlineBadge airline={item.airline} size="sm" />
                            </div>

                            <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                              <span className="font-medium text-slate-600">
                                📅 {formatDateLocale(item.flightDate, locale)}
                                {isRoundTrip && returnDate && ` - ${formatDateLocale(returnDate, locale)}`}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                • {formatRelativeTimeLocale(item.searchedAt, locale)}
                              </span>
                            </div>
                          </div>

                          {/* Right: Price + Status vs Target + Link */}
                          <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                            <span
                              className={`text-sm sm:text-base font-black tracking-tight tabular-nums ${
                                isBelow ? "text-emerald-700" : "text-slate-900"
                              }`}
                            >
                              {formatCurrencyLocale(item.lowestPrice, item.currency, locale)}
                            </span>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isBelow
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                    : "bg-rose-50 text-rose-700 border border-rose-200/80"
                                }`}
                              >
                                {isBelow ? (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                    <span>-{formatCurrencyLocale(targetPrice - item.lowestPrice, "BRL", locale)}</span>
                                  </>
                                ) : (
                                  <span>+{formatCurrencyLocale(item.lowestPrice - targetPrice, "BRL", locale)}</span>
                                )}
                              </span>

                              <a
                                href={flightUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                                title={t.common.viewFlight}
                                aria-label={t.common.viewFlight}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
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
                      {singleRoute.tripType === "round_trip" && singleRoute.returnDate && ` → ${formatDateLocale(singleRoute.returnDate, locale)}`}
                    </span>
                    {singleRoute.tripType === "round_trip" && (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                        🔁 {locale === "en" ? "Round Trip" : "Ida e Volta"}
                      </span>
                    )}
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

                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* Dropdown de Importação 30d, 60d, 120d */}
                  <ImportHistoryDropdown
                    onImport={(days) => handleBackfillRoute(singleRoute.id, days)}
                    isLoading={isBackfilling}
                    variant="subtle"
                    align="right"
                  />

                  <a
                    href={
                      singleRoute.lastBookingLink ||
                      getGoogleFlightsUrl(
                        singleRoute.origin,
                        singleRoute.destination,
                        singleRoute.flightDate,
                        singleRoute.passengers || 1,
                        singleRoute.returnDate,
                        singleRoute.tripType,
                        singleRoute.children || 0,
                        singleRoute.infantsInLap || 0
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

              {/* Card de Inteligência Estatística (Ocultado temporariamente) */}
              {/* <StatisticalAnalysisCard
                history={history}
                currentPrice={singleRoute.latestPrice}
                origin={singleRoute.origin}
                destination={singleRoute.destination}
                departureDate={singleRoute.flightDate}
              /> */}

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
                    {/* Desktop Table (Visible on lg: >= 1024px) */}
                    <div className="hidden lg:block overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
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
                                singleRoute.passengers || 1,
                                item.returnDate || singleRoute.returnDate,
                                item.tripType || singleRoute.tripType,
                                item.children || singleRoute.children || 0,
                                item.infantsInLap || singleRoute.infantsInLap || 0
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

                    {/* Mobile / Tablet Compact Stream (Visible on lg: < 1024px, zero horizontal scroll) */}
                    <div className="lg:hidden divide-y divide-slate-100 rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden bg-white">
                      {paginatedSingleHistory.map((item, idx) => {
                        const rowNumber = (singleCurrentPage - 1) * singlePageSize + idx + 1;
                        const isBelow = item.lowestPrice <= singleRoute.targetPrice;
                        const flightUrl =
                          item.bookingLink ||
                          getGoogleFlightsUrl(
                            item.origin,
                            item.destination,
                            item.flightDate,
                            singleRoute.passengers || 1,
                            item.returnDate || singleRoute.returnDate,
                            item.tripType || singleRoute.tripType,
                            item.children || singleRoute.children || 0,
                            item.infantsInLap || singleRoute.infantsInLap || 0
                          );

                        return (
                          <div
                            key={item.id}
                            className="p-3 sm:p-3.5 hover:bg-slate-50/75 transition-colors flex items-center justify-between gap-2.5 sm:gap-3"
                          >
                            {/* Left Side: Index + Query Timestamp + Airline & Times */}
                            <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
                              <span className="font-mono text-[10px] sm:text-[11px] text-slate-400 font-bold shrink-0 mt-0.5 w-4 text-center">
                                {rowNumber}
                              </span>

                              <div className="space-y-1 min-w-0 flex-1">
                                {/* Timestamp & Relative time */}
                                <div className="flex items-baseline gap-1.5 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-slate-800">
                                    {formatDateTimeLocale(item.searchedAt, locale)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    ({formatRelativeTimeLocale(item.searchedAt, locale)})
                                  </span>
                                </div>

                                {/* Airline + Flight number + Times */}
                                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-600">
                                  <AirlineBadge airline={item.airline} size="sm" />
                                  {item.flightNumber && (
                                    <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200/60">
                                      {item.flightNumber}
                                    </span>
                                  )}
                                  {item.departureTime && (
                                    <span className="font-mono text-[10px] sm:text-[11px] text-slate-500">
                                      {item.departureTime} → {item.arrivalTime || "—"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Side: Price + Status Badge + Quick Link */}
                            <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                              <div className="flex items-baseline gap-1">
                                <span
                                  className={`text-sm sm:text-base font-black tracking-tight tabular-nums ${
                                    isBelow ? "text-emerald-700" : "text-slate-900"
                                  }`}
                                >
                                  {formatCurrencyLocale(item.lowestPrice, item.currency, locale)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isBelow
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs"
                                      : "bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs"
                                  }`}
                                >
                                  {isBelow ? (
                                    <>
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                      <span>{t.dashboard.table.targetMet}</span>
                                    </>
                                  ) : (
                                    <span>{t.dashboard.table.aboveTarget}</span>
                                  )}
                                </span>

                                <a
                                  href={flightUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer shrink-0"
                                  title={t.common.viewFlight}
                                  aria-label={t.common.viewFlight}
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
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
