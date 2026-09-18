"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import RouteCard from "@/components/RouteCard";
import RouteModal from "@/components/RouteModal";
import HistoryModal from "@/components/HistoryModal";
import FlightSearchResultsDrawer from "@/components/FlightSearchResultsDrawer";
import ConfirmDialog from "@/components/ConfirmDialog";
import SkeletonLoader from "@/components/SkeletonLoader";
import ExpandableSearch from "@/components/ExpandableSearch";
import CustomSelect from "@/components/CustomSelect";
import Tooltip from "@/components/Tooltip";
import { useToast } from "@/components/Toast";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import { getAirportName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import {
  Plus,
  Layers,
  List,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Plane,
  X,
  TrendingDown,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
} from "lucide-react";

type SortOption = "date_asc" | "date_desc" | "price_asc" | "price_desc" | "discount_desc" | "route";

function RotasContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const { t, formatCurrency, formatUsdEstimate, formatDate, locale } = useTranslation();
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAirline, setSelectedAirline] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "target">("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [isGrouped, setIsGrouped] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Modals & Dialogs
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MonitoredRoute | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<MonitoredRoute | null>(null);
  const [liveDrawerRoute, setLiveDrawerRoute] = useState<MonitoredRoute | null>(null);
  const [liveOptions, setLiveOptions] = useState<FlightOption[]>([]);
  const [routeToDelete, setRouteToDelete] = useState<MonitoredRoute | null>(null);

  useEffect(() => {
    const filterParam = searchParams.get("filter");
    if (filterParam === "active" || filterParam === "paused" || filterParam === "target") {
      setStatusFilter(filterParam);
    }
  }, [searchParams]);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch("/api/routes");
      const json = await res.json();
      if (json.success) {
        setRoutes(json.data || []);
      }
    } catch (err) {
      console.error(err);
      addToast(t.toasts.connError, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, t.toasts.connError]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/routes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive, ativo: !currentActive }),
      });
      const json = await res.json();
      if (json.success) {
        addToast(
          currentActive
            ? locale === "en"
              ? "Monitoring paused for this route"
              : "Monitoramento pausado para esta rota"
            : locale === "en"
            ? "Monitoring resumed successfully!"
            : "Monitoramento reativado com sucesso!",
          "info"
        );
        fetchRoutes();
      }
    } catch (err) {
      addToast(t.toasts.connError, "error");
    }
  };

  const handleDeleteRoute = (id: number) => {
    const r = routes.find((route) => route.id === id);
    if (r) setRouteToDelete(r);
  };

  const confirmDelete = async () => {
    if (!routeToDelete) return;
    try {
      const res = await fetch(`/api/routes/${routeToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        addToast(t.toasts.routeDeleted, "success");
        setRouteToDelete(null);
        fetchRoutes();
      } else {
        addToast(json.error || "Failed to delete route", "error");
      }
    } catch (err) {
      addToast(t.toasts.connError, "error");
    }
  };

  // Contagens para Micro-KPIs e Tabs
  const counts = useMemo(() => {
    const total = routes.length;
    const active = routes.filter((r) => r.isActive).length;
    const paused = total - active;
    const target = routes.filter(
      (r) => r.isActive && r.latestPrice !== null && r.latestPrice !== undefined && r.latestPrice <= r.targetPrice
    ).length;

    let lowestPrice: number | null = null;
    routes.forEach((r) => {
      if (r.latestPrice !== null && r.latestPrice !== undefined) {
        if (lowestPrice === null || r.latestPrice < lowestPrice) {
          lowestPrice = r.latestPrice;
        }
      }
    });

    return { total, active, paused, target, lowestPrice };
  }, [routes]);

  // Lista de companhias únicas
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.lastAirline) set.add(r.lastAirline.trim());
    });
    return Array.from(set).sort();
  }, [routes]);

  // Filtragem
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Busca
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const origMatch = route.origin.toLowerCase().includes(q) || getAirportName(route.origin).toLowerCase().includes(q);
        const destMatch = route.destination.toLowerCase().includes(q) || getAirportName(route.destination).toLowerCase().includes(q);
        const ciaMatch = (route.lastAirline || "").toLowerCase().includes(q);
        if (!origMatch && !destMatch && !ciaMatch) return false;
      }

      // Companhia
      if (selectedAirline !== "all") {
        if (!route.lastAirline || route.lastAirline.trim().toLowerCase() !== selectedAirline.toLowerCase()) {
          return false;
        }
      }

      // Status
      if (statusFilter === "active" && !route.isActive) return false;
      if (statusFilter === "paused" && route.isActive) return false;
      if (statusFilter === "target") {
        if (!route.isActive || route.latestPrice === null || route.latestPrice === undefined || route.latestPrice > route.targetPrice) {
          return false;
        }
      }

      return true;
    });
  }, [routes, searchTerm, selectedAirline, statusFilter]);

  // Lista plana ordenada (para modo não agrupado)
  const sortedFilteredRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) => {
      if (sortBy === "date_asc") return a.flightDate.localeCompare(b.flightDate);
      if (sortBy === "date_desc") return b.flightDate.localeCompare(a.flightDate);
      if (sortBy === "price_asc") {
        const priceA = a.latestPrice !== null && a.latestPrice !== undefined ? a.latestPrice : Infinity;
        const priceB = b.latestPrice !== null && b.latestPrice !== undefined ? b.latestPrice : Infinity;
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        const priceA = a.latestPrice !== null && a.latestPrice !== undefined ? a.latestPrice : -Infinity;
        const priceB = b.latestPrice !== null && b.latestPrice !== undefined ? b.latestPrice : -Infinity;
        return priceB - priceA;
      }
      if (sortBy === "discount_desc") {
        const diffA = a.latestPrice !== null && a.latestPrice !== undefined ? a.targetPrice - a.latestPrice : -Infinity;
        const diffB = b.latestPrice !== null && b.latestPrice !== undefined ? b.targetPrice - b.latestPrice : -Infinity;
        return diffB - diffA;
      }
      if (sortBy === "route") {
        return `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`);
      }
      return 0;
    });
  }, [filteredRoutes, sortBy]);

  // Alternar colapso de grupo
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  // Agrupamento por Trecho (Origem - Destino)
  const routeGroups = useMemo(() => {
    const map = new Map<string, MonitoredRoute[]>();

    filteredRoutes.forEach((route) => {
      const key = `${route.origin}-${route.destination}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(route);
    });

    const groups = Array.from(map.entries()).map(([key, groupRoutes]) => {
      const [origin, destination] = key.split("-");

      // Ordena as rotas internas
      const sortedRoutes = [...groupRoutes].sort((a, b) => {
        if (sortBy === "date_asc") return a.flightDate.localeCompare(b.flightDate);
        if (sortBy === "date_desc") return b.flightDate.localeCompare(a.flightDate);
        if (sortBy === "price_asc") {
          const priceA = a.latestPrice !== null && a.latestPrice !== undefined ? a.latestPrice : Infinity;
          const priceB = b.latestPrice !== null && b.latestPrice !== undefined ? b.latestPrice : Infinity;
          return priceA - priceB;
        }
        if (sortBy === "price_desc") {
          const priceA = a.latestPrice !== null && a.latestPrice !== undefined ? a.latestPrice : -Infinity;
          const priceB = b.latestPrice !== null && b.latestPrice !== undefined ? b.latestPrice : -Infinity;
          return priceB - priceA;
        }
        if (sortBy === "discount_desc") {
          const diffA = a.latestPrice !== null && a.latestPrice !== undefined ? a.targetPrice - a.latestPrice : -Infinity;
          const diffB = b.latestPrice !== null && b.latestPrice !== undefined ? b.targetPrice - b.latestPrice : -Infinity;
          return diffB - diffA;
        }
        return 0;
      });

      let lowestPrice: number | null = null;
      let targetHitsCount = 0;
      let lowestPriceRoute: MonitoredRoute | null = null;
      const earliestDate = sortedRoutes[0]?.flightDate || "";
      const latestDate = sortedRoutes[sortedRoutes.length - 1]?.flightDate || "";

      sortedRoutes.forEach((r) => {
        if (r.latestPrice !== null && r.latestPrice !== undefined) {
          if (lowestPrice === null || r.latestPrice < lowestPrice) {
            lowestPrice = r.latestPrice;
            lowestPriceRoute = r;
          }
          if (r.isActive && r.latestPrice <= r.targetPrice) {
            targetHitsCount += 1;
          }
        }
      });
      if (!lowestPriceRoute && sortedRoutes.length > 0) {
        lowestPriceRoute = sortedRoutes[0];
      }

      return {
        key,
        origin,
        destination,
        routes: sortedRoutes,
        lowestPrice,
        lowestPriceRoute,
        targetHitsCount,
        hasTargetHit: targetHitsCount > 0,
        earliestDate,
        latestDate,
      };
    });

    // Ordena os grupos
    return groups.sort((a, b) => {
      if (sortBy === "date_asc") return a.earliestDate.localeCompare(b.earliestDate);
      if (sortBy === "date_desc") return b.latestDate.localeCompare(a.latestDate);
      if (sortBy === "price_asc") {
        const priceA = a.lowestPrice !== null ? a.lowestPrice : Infinity;
        const priceB = b.lowestPrice !== null ? b.lowestPrice : Infinity;
        return priceA - priceB;
      }
      if (sortBy === "price_desc") {
        const priceA = a.lowestPrice !== null ? a.lowestPrice : -Infinity;
        const priceB = b.lowestPrice !== null ? b.lowestPrice : -Infinity;
        return priceB - priceA;
      }
      if (sortBy === "discount_desc") {
        const diffA =
          a.lowestPrice !== null && a.lowestPriceRoute
            ? a.lowestPriceRoute.targetPrice - a.lowestPrice
            : -Infinity;
        const diffB =
          b.lowestPrice !== null && b.lowestPriceRoute
            ? b.lowestPriceRoute.targetPrice - b.lowestPrice
            : -Infinity;
        return diffB - diffA;
      }
      if (sortBy === "route") {
        return a.key.localeCompare(b.key);
      }
      return 0;
    });
  }, [filteredRoutes, sortBy]);

  const hasActiveFilters = searchTerm !== "" || selectedAirline !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAirline("all");
    setStatusFilter("all");
    setSortBy("date_asc");
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar onSearchTriggered={fetchRoutes} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                {t.routes.title}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {counts.total} {locale === "en" ? "routes" : "destinos"}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              {t.routes.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEditingRoute(null);
                setIsRouteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.routes.addRoute}</span>
            </button>
          </div>
        </div>

        {/* Micro-KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
              <Plane className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.dashboard.kpis.monitoredRoutes}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.total} <span className="text-xs font-medium text-slate-400">{locale === "en" ? "routes" : "rotas"}</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.common.active}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.active} <span className="text-xs font-medium text-slate-400">{locale === "en" ? "scanning" : "em varredura"}</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.dashboard.kpis.dealsFound}
              </span>
              <span className="text-base font-black text-emerald-600 tabular-nums">
                {counts.target} <span className="text-xs font-medium text-slate-400">{locale === "en" ? "ready" : "prontas"}</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                {t.dashboard.kpis.lowestPriceFound}
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.lowestPrice ? formatCurrency(counts.lowestPrice) : "—"}
              </span>
              {locale === "en" && counts.lowestPrice && (
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  ({formatUsdEstimate(counts.lowestPrice, "~")})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Control Bar */}
        <div className="p-3 bg-white rounded-2xl border border-slate-200/90 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
                {t.common.all} ({counts.total})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.routes.filterActive} ({counts.active})
              </button>
              <button
                onClick={() => setStatusFilter("target")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "target"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                {t.routes.filterTargetMet} ({counts.target})
              </button>
              <button
                onClick={() => setStatusFilter("paused")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "paused"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.routes.filterPaused} ({counts.paused})
              </button>
            </div>

            {/* Controls Group: Airline + Sort + Mode Toggle + Expandable Search */}
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
                  { value: "date_asc", label: locale === "en" ? "Date (Earliest)" : "Data (Mais Próxima)" },
                  { value: "date_desc", label: locale === "en" ? "Date (Furthest)" : "Data (Mais Distante)" },
                  { value: "price_asc", label: t.dashboard.filters.lowestPrice },
                  { value: "discount_desc", label: t.dashboard.filters.dealProximity },
                  { value: "price_desc", label: locale === "en" ? "Highest Price" : "Maior Preço" },
                  { value: "route", label: locale === "en" ? "Route A-Z" : "Trecho A-Z" },
                ]}
              />

              {/* View Mode Switch */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 justify-center">
                <Tooltip content={locale === "en" ? "Grouped by route" : "Visualização agrupada por trecho"}>
                  <button
                    onClick={() => setIsGrouped(true)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isGrouped ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    aria-label="Grouped view"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content={locale === "en" ? "Individual card view" : "Visualização em lista individual"}>
                  <button
                    onClick={() => setIsGrouped(false)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      !isGrouped ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    aria-label="Individual view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>

              {/* Expandable Search Button */}
              <ExpandableSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t.dashboard.filters.searchPlaceholder}
              />
            </div>
          </div>

          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                {locale === "en"
                  ? `Showing ${filteredRoutes.length} of ${routes.length} monitored routes`
                  : `Mostrando ${filteredRoutes.length} de ${routes.length} rotas cadastradas`}
              </span>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>{t.common.clearFilters}</span>
              </button>
            </div>
          )}
        </div>

        {/* Route List / Groups Container */}
        {loading ? (
          <SkeletonLoader variant="card" count={4} />
        ) : filteredRoutes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {routes.length === 0 ? t.routes.emptyTitle : t.common.noResults}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
              {routes.length === 0
                ? t.routes.emptyDescription
                : locale === "en"
                ? "Try adjusting your search filters or add a new route."
                : "Tente alterar os termos de busca ou redefinir os filtros aplicados."}
            </p>
            {routes.length === 0 ? (
              <button
                onClick={() => {
                  setEditingRoute(null);
                  setIsRouteModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
              >
                {t.routes.addRoute}
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
        ) : isGrouped ? (
          /* MODO AGRUPADO */
          <div className="space-y-6">
            {routeGroups.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.key]);

              return (
                <div
                  key={group.key}
                  className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm transition-all hover:border-slate-300 hover:shadow-md ${
                    isCollapsed ? "overflow-hidden" : ""
                  }`}
                >
                  {/* Cabeçalho do Grupo (Acordeão Editorial e Contrastante) */}
                  <div
                    onClick={() => toggleGroupCollapse(group.key)}
                    className={`p-4 sm:px-6 sm:py-4 bg-slate-50/70 hover:bg-slate-100/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 cursor-pointer select-none transition-colors ${
                      isCollapsed ? "rounded-2xl" : "rounded-t-2xl border-b border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500 hover:text-slate-800 shrink-0 transition-transform">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>

                      {/* Título Editorial da Rota + Nomes das Cidades */}
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2 font-black text-slate-900 tracking-tight text-base sm:text-lg">
                          <span>{group.origin}</span>
                          <ArrowRight className="w-4 h-4 text-sky-600 stroke-[2.5] shrink-0" />
                          <span>{group.destination}</span>

                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/80 text-slate-700 ml-1">
                            {group.routes.length}{" "}
                            {locale === "en"
                              ? group.routes.length === 1
                                ? "flight date"
                                : "flight dates"
                              : group.routes.length === 1
                              ? "data monitorada"
                              : "datas monitoradas"}
                          </span>
                        </div>

                        {/* Nome por extenso das cidades e datas */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium flex-wrap">
                          <span>
                            {getAirportName(group.origin)} → {getAirportName(group.destination)}
                          </span>
                          {group.earliestDate && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-600 font-semibold">
                                {group.routes.length === 1 || group.earliestDate === group.latestDate
                                  ? formatDate(group.earliestDate)
                                  : `${formatDate(group.earliestDate)} – ${formatDate(group.latestDate)}`}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preço e Status Empilhados Verticalmente */}
                    {group.lowestPrice !== null && group.lowestPriceRoute ? (
                      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                        {/* Linha superior: STARTING FROM empilhado acima */}
                        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                          {locale === "en" ? "Starting from" : "A partir de"}
                        </span>

                        {/* Linha intermediária: Preço principal + USD */}
                        <div className="flex items-baseline gap-1.5 justify-end">
                          <span className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
                            {formatCurrency(group.lowestPrice)}
                          </span>
                          {locale === "en" && (
                            <span className="text-xs text-slate-400 font-normal">
                              ({formatUsdEstimate(group.lowestPrice, "~")})
                            </span>
                          )}
                        </div>

                        {/* Linha inferior alinhada à direita: badge compacto */}
                        {group.lowestPrice <= group.lowestPriceRoute.targetPrice ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>
                              -{formatCurrency(group.lowestPriceRoute.targetPrice - group.lowestPrice)}{" "}
                              {locale === "en" ? "target met" : "no alvo"}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 mt-0.5">
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>
                              +{formatCurrency(group.lowestPrice - group.lowestPriceRoute.targetPrice)}{" "}
                              {locale === "en" ? "above target" : "acima da meta"}
                            </span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>{t.dashboard.table.pendingScan}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lista de cards do grupo */}
                  {!isCollapsed && (
                    <div className="p-4 sm:p-5 space-y-3.5 bg-slate-100/35 rounded-b-2xl animate-fadeIn">
                      {group.routes.map((route) => (
                        <RouteCard
                          key={route.id}
                          route={route}
                          isInsideGroup={true}
                          onEdit={(r) => {
                            setEditingRoute(r);
                            setIsRouteModalOpen(true);
                          }}
                          onDelete={handleDeleteRoute}
                          onToggleActive={handleToggleActive}
                          onViewHistory={(r) => setHistoryModalRoute(r)}
                          onViewLiveResults={(r, opts) => {
                            setLiveDrawerRoute(r);
                            setLiveOptions(opts);
                          }}
                          onRefreshList={fetchRoutes}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO LISTA CONTÍNUA INDIVIDUAL */
          <div className="space-y-3">
            {sortedFilteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
                isInsideGroup={false}
                onEdit={(r) => {
                  setEditingRoute(r);
                  setIsRouteModalOpen(true);
                }}
                onDelete={handleDeleteRoute}
                onToggleActive={handleToggleActive}
                onViewHistory={(r) => setHistoryModalRoute(r)}
                onViewLiveResults={(r, opts) => {
                  setLiveDrawerRoute(r);
                  setLiveOptions(opts);
                }}
                onRefreshList={fetchRoutes}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modais & Dialogs */}
      <RouteModal
        isOpen={isRouteModalOpen}
        routeToEdit={editingRoute}
        onClose={() => setIsRouteModalOpen(false)}
        onSuccess={fetchRoutes}
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
        onConfirm={confirmDelete}
        onCancel={() => setRouteToDelete(null)}
        title={t.modal.deleteTitle}
        message={
          locale === "en"
            ? `Are you sure you want to delete the route ${routeToDelete?.origin} → ${routeToDelete?.destination} (${routeToDelete?.flightDate})? All associated price tracking history will be permanently erased.`
            : `Tem certeza que deseja excluir a rota ${routeToDelete?.origin} → ${routeToDelete?.destination} (${routeToDelete?.flightDate})? Todo o histórico de preços associado será perdido.`
        }
        confirmLabel={t.modal.deleteButton}
        cancelLabel={t.common.cancel}
        variant="danger"
      />
    </div>
  );
}

export default function RotasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pb-24 bg-slate-50/60">
          <Navbar />
          <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
            <SkeletonLoader variant="card" count={4} />
          </main>
        </div>
      }
    >
      <RotasContent />
    </Suspense>
  );
}
