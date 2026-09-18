"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import MetricCards from "@/components/MetricCards";
import RouteModal from "@/components/RouteModal";
import HistoryModal from "@/components/HistoryModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import FlightSearchResultsDrawer from "@/components/FlightSearchResultsDrawer";
import AirlineBadge from "@/components/AirlineBadge";
import { MonitoredRoute, FlightOption, SchedulerStatus } from "@/lib/types";
import { getAirportName, getAirportCity, getGoogleFlightsUrl } from "@/lib/utils";
import SkeletonLoader from "@/components/SkeletonLoader";
import ExpandableSearch from "@/components/ExpandableSearch";
import CustomSelect from "@/components/CustomSelect";
import Tooltip from "@/components/Tooltip";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/lib/i18n/context";
import {
  Plus,
  ArrowRight,
  Plane,
  Sparkles,
  ExternalLink,
  BarChart2,
  CheckCircle2,
  ArrowUpDown,
  Edit2,
  Trash2,
  RefreshCw,
  Clock,
  MoreHorizontal,
} from "lucide-react";

export default function DashboardPage() {
  const { addToast } = useToast();
  const { t, formatCurrency, formatUsdEstimate, formatDate, locale } = useTranslation();
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters and sorting state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAirline, setSelectedAirline] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "target" | "above">("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "discount_desc" | "date_asc" | "route">("price_asc");

  // Modals & action states
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MonitoredRoute | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<MonitoredRoute | null>(null);
  const [liveDrawerRoute, setLiveDrawerRoute] = useState<MonitoredRoute | null>(null);
  const [liveOptions, setLiveOptions] = useState<FlightOption[]>([]);
  const [routeToDelete, setRouteToDelete] = useState<MonitoredRoute | null>(null);
  const [searchingRouteId, setSearchingRouteId] = useState<number | null>(null);
  const [openMenuRowId, setOpenMenuRowId] = useState<number | null>(null);
  const activeMenuRef = useRef<HTMLDivElement>(null);

  // Close row menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuRef.current && !activeMenuRef.current.contains(event.target as Node)) {
        setOpenMenuRowId(null);
      }
    };
    if (openMenuRowId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuRowId]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [routesRes, schedRes] = await Promise.all([
        fetch("/api/routes").then((r) => r.json()),
        fetch("/api/scheduler").then((r) => r.json()),
      ]);

      if (routesRes.success) setRoutes(routesRes.data || []);
      if (schedRes.success) setSchedulerStatus(schedRes.data);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      addToast(t.toasts.connError, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, t.toasts.connError]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Single route instant search
  const handleSingleRouteSearch = async (route: MonitoredRoute) => {
    if (searchingRouteId === route.id) return;
    setSearchingRouteId(route.id);
    addToast(
      locale === "en"
        ? `Searching fares for ${route.origin} → ${route.destination}...`
        : `Buscando cotação para ${route.origin} → ${route.destination}...`,
      "info"
    );
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id }),
      });
      const json = await res.json();
      if (json.success) {
        addToast(
          locale === "en"
            ? `Price updated for ${route.origin} → ${route.destination}!`
            : `Cotação atualizada para ${route.origin} → ${route.destination}!`,
          "success"
        );
        fetchDashboardData();
      } else {
        addToast(json.error || t.toasts.searchFailed, "error");
      }
    } catch {
      addToast(t.toasts.connError, "error");
    } finally {
      setSearchingRouteId(null);
    }
  };

  // Delete Route
  const handleDeleteConfirm = async () => {
    if (!routeToDelete) return;
    try {
      const res = await fetch(`/api/routes/${routeToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        addToast(t.toasts.routeDeleted, "success");
        setRouteToDelete(null);
        fetchDashboardData();
      } else {
        addToast(json.error || "Failed to delete route", "error");
      }
    } catch {
      addToast(t.toasts.connError, "error");
    }
  };

  // Extract available airlines for the filter dropdown
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.isActive && r.lastAirline) set.add(r.lastAirline.trim());
    });
    return Array.from(set).sort();
  }, [routes]);

  // Filtered and sorted routes (paused routes are hidden on the dashboard)
  const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => {
        // Ocultar rotas pausadas na tela inicial de dashboard
        if (!route.isActive) return false;

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const origMatch = route.origin.toLowerCase().includes(q) || getAirportName(route.origin).toLowerCase().includes(q);
          const destMatch = route.destination.toLowerCase().includes(q) || getAirportName(route.destination).toLowerCase().includes(q);
          const ciaMatch = (route.lastAirline || "").toLowerCase().includes(q);
          if (!origMatch && !destMatch && !ciaMatch) return false;
        }

        // Airline filter
        if (selectedAirline !== "all") {
          if (!route.lastAirline || route.lastAirline.trim().toLowerCase() !== selectedAirline.toLowerCase()) {
            return false;
          }
        }

        // Status filter
        if (statusFilter === "target") {
          if (route.latestPrice === null || route.latestPrice === undefined || route.latestPrice > route.targetPrice) {
            return false;
          }
        } else if (statusFilter === "above") {
          if (route.latestPrice === null || route.latestPrice === undefined || route.latestPrice <= route.targetPrice) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const priceA = a.latestPrice ?? Infinity;
        const priceB = b.latestPrice ?? Infinity;

        switch (sortBy) {
          case "price_asc":
            return priceA - priceB;
          case "price_desc":
            return (b.latestPrice ?? -1) - (a.latestPrice ?? -1);
          case "discount_desc": {
            const discA = a.latestPrice !== null && a.latestPrice !== undefined ? a.targetPrice - a.latestPrice : -Infinity;
            const discB = b.latestPrice !== null && b.latestPrice !== undefined ? b.targetPrice - b.latestPrice : -Infinity;
            return discB - discA;
          }
          case "date_asc":
            return new Date(a.flightDate).getTime() - new Date(b.flightDate).getTime();
          case "route":
            return `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`);
          default:
            return 0;
        }
      });
  }, [routes, searchQuery, selectedAirline, statusFilter, sortBy]);

  const activeRoutesCount = useMemo(() => {
    return routes.filter((r) => r.isActive).length;
  }, [routes]);

  const onTargetCount = useMemo(() => {
    return routes.filter(
      (r) => r.isActive && r.latestPrice !== null && r.latestPrice !== undefined && r.latestPrice <= r.targetPrice
    ).length;
  }, [routes]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAirline("all");
    setStatusFilter("all");
    setSortBy("price_asc");
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar onSearchTriggered={fetchDashboardData} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>{t.dashboard.title}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                Live
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {t.dashboard.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingRoute(null);
                setIsRouteModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.dashboard.table.addRoute}</span>
            </button>
          </div>
        </div>

        {/* 4 Top KPI Cards */}
        <MetricCards routes={routes} schedulerStatus={schedulerStatus} />

        {/* Live Deals Table & Filter Panel */}
        <div className="space-y-4">
          {/* Header with Title + Filters in Single Row */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-2">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t.dashboard.table.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {t.dashboard.table.subtitle}
              </p>
            </div>

            {/* Filters Bar: Status Tabs + Airline + Sort + Search */}
            <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap justify-between lg:justify-end">
              {/* Status Filter Tabs */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 overflow-x-auto text-[11px] shrink-0">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.common.all} ({activeRoutesCount})
                </button>
                <button
                  onClick={() => setStatusFilter("target")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "target"
                      ? "bg-white text-emerald-700 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-emerald-700"
                  }`}
                >
                  {t.dashboard.filters.statusTarget} ({onTargetCount})
                </button>
                <button
                  onClick={() => setStatusFilter("above")}
                  className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === "above"
                      ? "bg-white text-slate-900 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.dashboard.filters.statusAbove}
                </button>
              </div>

              {/* Controls Group: Airline + Sort + Search */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
                {/* Airline CustomSelect */}
                <CustomSelect
                  value={selectedAirline}
                  onChange={setSelectedAirline}
                  options={[
                    { value: "all", label: t.dashboard.filters.allAirlines },
                    ...availableAirlines.map((cia) => ({ value: cia, label: cia })),
                  ]}
                />

                {/* Sort CustomSelect */}
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                  options={[
                    { value: "price_asc", label: t.dashboard.filters.lowestPrice },
                    { value: "discount_desc", label: t.dashboard.filters.dealProximity },
                    { value: "price_desc", label: locale === "en" ? "Highest Price" : "Maior Preço" },
                    { value: "date_asc", label: t.dashboard.filters.departureDate },
                    { value: "route", label: locale === "en" ? "Route A-Z" : "Trecho A-Z" },
                  ]}
                />

                {/* Expandable Search Button */}
                <ExpandableSearch
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder={t.dashboard.filters.searchPlaceholder}
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
                {routes.length === 0 ? t.dashboard.table.emptyState : t.common.noResults}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
                {routes.length === 0
                  ? t.dashboard.table.emptyStateDesc
                  : locale === "en"
                  ? "Try adjusting your search query or reset the selected filters."
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
                  {t.dashboard.table.addRoute}
                </button>
              ) : (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {t.common.clearFilters}
                </button>
              )}
            </div>
          ) : (
            <div>
              {/* Desktop Table View (>= 768px) */}
              <div className="hidden md:block bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
                <table className="w-full table-fixed text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-500 border-b border-slate-200/80 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-3 sm:px-4 text-left w-[32%]">
                        {locale === "en" ? "Route & Flight" : "Rota & Voo"}
                      </th>
                      <th className="py-3 pl-2 pr-6 sm:pr-8 text-right w-[24%]">
                        {locale === "en" ? "Current & Target Price" : "Preço Atual & Meta"}
                      </th>
                      <th className="py-3 pl-6 sm:pl-8 pr-3 sm:pr-4 text-left w-[26%]">
                        {t.dashboard.table.colStatus}
                      </th>
                      <th className="py-3 px-3 sm:px-4 text-right w-[18%]">
                        <span className="sr-only">{t.dashboard.table.colActions}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRoutes.map((route) => {
                      const hasPrice = route.latestPrice !== null && route.latestPrice !== undefined;
                      const price = route.latestPrice as number;
                      const isBelow = hasPrice && price <= route.targetPrice;
                      const diffPercent = hasPrice && route.targetPrice > 0
                        ? Math.round(Math.abs((route.targetPrice - price) / route.targetPrice) * 100)
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
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Coluna 1: ROTA & VOO */}
                          <td className="py-3.5 px-3 sm:px-4 text-left align-middle">
                            {/* Linha superior: IATA + Companhia Aérea Inline */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="inline-flex items-center gap-1.5 font-black text-slate-900 text-sm tracking-tight shrink-0">
                                <span>{route.origin}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{route.destination}</span>
                              </div>
                              {route.lastAirline && (
                                <>
                                  <span className="text-slate-300 font-normal shrink-0">•</span>
                                  <span className="text-xs text-slate-500 font-medium truncate">
                                    {route.lastAirline}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Linha inferior: Data • Origem → Destino */}
                            <div className="text-xs text-slate-400 font-normal truncate mt-0.5">
                              {formatDate(route.flightDate)} • {getAirportCity(route.origin)} → {getAirportCity(route.destination)}
                            </div>
                          </td>

                          {/* Coluna 2: PREÇO ATUAL & META */}
                          <td className="py-3.5 pl-2 pr-6 sm:pr-8 text-right tabular-nums align-middle">
                            {/* Linha superior: Preço atual */}
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span
                                className={`text-sm sm:text-base font-black tracking-tight tabular-nums ${
                                  hasPrice
                                    ? isBelow
                                      ? "text-emerald-600"
                                      : "text-slate-900"
                                    : "text-slate-400"
                                }`}
                              >
                                {hasPrice ? formatCurrency(price) : "—"}
                              </span>
                              {locale === "en" && hasPrice && (
                                <span className="text-[11px] text-slate-400 font-normal">
                                  ({formatUsdEstimate(price, "~")})
                                </span>
                              )}
                            </div>

                            {/* Linha inferior: Meta */}
                            <div className="text-xs text-slate-400 font-medium tabular-nums mt-0.5">
                              {t.common.target}: {formatCurrency(route.targetPrice)}
                            </div>
                          </td>

                          {/* Coluna 3: STATUS */}
                          <td className="py-3.5 pl-6 sm:pl-8 pr-3 sm:pr-4 text-left whitespace-nowrap align-middle">
                            {!hasPrice ? (
                              <span className="inline-flex items-center justify-center gap-1.5 w-[175px] py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t.dashboard.table.pendingScan}</span>
                              </span>
                            ) : isBelow ? (
                              <span className="inline-flex items-center justify-center gap-1.5 w-[175px] py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{t.dashboard.table.targetMet}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1 w-[175px] py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                                <span>
                                  +{formatCurrency(price - route.targetPrice)} (+{diffPercent}%)
                                </span>
                              </span>
                            )}
                          </td>

                          {/* Coluna 4: AÇÕES */}
                          <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap align-middle">
                            <div
                              className="relative inline-flex items-center gap-2 justify-end"
                              ref={openMenuRowId === route.id ? activeMenuRef : null}
                            >
                              {/* Primary: View Flight */}
                              <Tooltip content={t.common.viewFlight}>
                                <a
                                  href={flightUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200/60 transition-all shadow-2xs cursor-pointer"
                                  aria-label={t.common.viewFlight}
                                >
                                  <span className="hidden xl:inline">{t.common.viewFlight}</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </Tooltip>

                              {/* 3 Dots Menu Button */}
                              <Tooltip content={locale === "en" ? "More actions" : "Mais opções"}>
                                <button
                                  onClick={() => setOpenMenuRowId(openMenuRowId === route.id ? null : route.id)}
                                  className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                                  aria-label="More actions"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </Tooltip>

                              {/* Dropdown Menu */}
                              {openMenuRowId === route.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-left animate-fadeIn">
                                  <button
                                    onClick={() => {
                                      setOpenMenuRowId(null);
                                      handleSingleRouteSearch(route);
                                    }}
                                    disabled={isSearchingThis}
                                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer disabled:opacity-50"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSearchingThis ? "animate-spin" : ""}`} />
                                    <span>{t.dashboard.table.searchNow}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenMenuRowId(null);
                                      setHistoryModalRoute(route);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{t.dashboard.table.viewHistory}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setOpenMenuRowId(null);
                                      setEditingRoute(route);
                                      setIsRouteModalOpen(true);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{t.dashboard.table.editRoute}</span>
                                  </button>

                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    onClick={() => {
                                      setOpenMenuRowId(null);
                                      setRouteToDelete(route);
                                    }}
                                    className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{t.dashboard.table.deleteRoute}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                          {formatDate(route.flightDate)}
                        </span>
                      </div>

                      {/* Airline & Status Pill */}
                      <div className="flex items-center justify-between gap-2">
                        <AirlineBadge airline={route.lastAirline} size="sm" />
                        <div>
                          {!route.isActive ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                              {t.dashboard.table.paused}
                            </span>
                          ) : !hasPrice ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700">
                              {t.dashboard.table.pendingScan}
                            </span>
                          ) : isBelow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {t.dashboard.table.targetMet} (-{formatCurrency(diff)})
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
                            {t.dashboard.table.colCurrentPrice}
                          </span>
                          <span className={`text-base font-black tracking-tight tabular-nums ${hasPrice ? (isBelow ? "text-emerald-600" : "text-slate-900") : "text-slate-400"}`}>
                            {hasPrice ? formatCurrency(price) : "—"}
                          </span>
                          {locale === "en" && hasPrice && (
                            <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                              ({formatUsdEstimate(price, "~")})
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold uppercase">
                            {t.dashboard.table.colTargetPrice}
                          </span>
                          <span className="text-xs font-bold text-slate-600 tabular-nums">
                            {formatCurrency(route.targetPrice)}
                          </span>
                          {locale === "en" && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              {formatUsdEstimate(route.targetPrice)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <Tooltip content={t.dashboard.table.searchNow}>
                            <button
                              onClick={() => handleSingleRouteSearch(route)}
                              disabled={isSearchingThis}
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-sky-600 hover:bg-sky-50 transition-colors cursor-pointer"
                              aria-label={t.dashboard.table.searchNow}
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isSearchingThis ? "animate-spin text-sky-600" : ""}`} />
                            </button>
                          </Tooltip>
                          <Tooltip content={t.dashboard.table.editRoute}>
                            <button
                              onClick={() => {
                                setEditingRoute(route);
                                setIsRouteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                              aria-label={t.dashboard.table.editRoute}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip content={t.dashboard.table.viewHistory}>
                            <button
                              onClick={() => setHistoryModalRoute(route)}
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              aria-label={t.dashboard.table.viewHistory}
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip content={t.dashboard.table.deleteRoute}>
                            <button
                              onClick={() => setRouteToDelete(route)}
                              className="p-1.5 rounded-lg text-slate-500 bg-slate-50 border border-slate-200 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              aria-label={t.dashboard.table.deleteRoute}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>

                        <a
                          href={flightUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
                        >
                          <span>{t.common.viewFlight}</span>
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
        title={t.modal.deleteTitle}
        message={
          locale === "en"
            ? `Are you sure you want to delete the route ${routeToDelete?.origin} → ${routeToDelete?.destination}? All historical tracking data will be permanently erased.`
            : `Deseja realmente remover o monitoramento da rota ${routeToDelete?.origin} → ${routeToDelete?.destination}? Todo o histórico de preços será permanentemente apagado.`
        }
        confirmLabel={t.modal.deleteButton}
        cancelLabel={t.common.cancel}
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRouteToDelete(null)}
      />
    </div>
  );
}
