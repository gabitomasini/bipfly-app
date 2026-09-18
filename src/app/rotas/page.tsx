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
import { formatCurrency, getAirportName } from "@/lib/utils";
import {
  Plus,
  Search,
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
  Sparkles,
} from "lucide-react";

type SortOption = "date_asc" | "date_desc" | "price_asc" | "price_desc" | "discount_desc" | "route";

function RotasContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();
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
      addToast("Erro ao carregar rotas monitoradas", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

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
          currentActive ? "Monitoramento pausado para esta rota" : "Monitoramento reativado com sucesso!",
          "info"
        );
        fetchRoutes();
      }
    } catch (err) {
      console.error(err);
      addToast("Erro ao alterar status da rota", "error");
    }
  };

  const handleDeleteRoute = (id: number) => {
    const target = routes.find((r) => r.id === id);
    if (target) {
      setRouteToDelete(target);
    }
  };

  const confirmDelete = async () => {
    if (!routeToDelete) return;
    try {
      const res = await fetch(`/api/routes/${routeToDelete.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        addToast(
          `Rota ${routeToDelete.origin} → ${routeToDelete.destination} excluída com sucesso!`,
          "success"
        );
      }
      setRouteToDelete(null);
      fetchRoutes();
    } catch (err: any) {
      addToast(`Erro ao excluir rota: ${err.message}`, "error");
    }
  };

  const toggleGroupCollapse = (key: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // KPIs & Counts
  const counts = useMemo(() => {
    const total = routes.length;
    const active = routes.filter((r) => r.isActive).length;
    const paused = routes.filter((r) => !r.isActive).length;
    const target = routes.filter((r) => {
      const p = r.latestPrice;
      return r.isActive && p !== null && p !== undefined && p <= r.targetPrice;
    }).length;

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

  // Unique Airlines
  const availableAirlines = useMemo(() => {
    const set = new Set<string>();
    routes.forEach((r) => {
      if (r.lastAirline && r.lastAirline.trim()) {
        set.add(r.lastAirline.trim());
      }
    });
    return Array.from(set).sort();
  }, [routes]);

  // Filtros aplicados
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      // 1. Status Filter
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "paused" && r.isActive) return false;
      if (statusFilter === "target") {
        const p = r.latestPrice;
        if (!r.isActive || p === null || p === undefined || p > r.targetPrice) return false;
      }

      // 2. Airline Filter
      if (selectedAirline !== "all") {
        if ((r.lastAirline || "").toLowerCase() !== selectedAirline.toLowerCase()) {
          return false;
        }
      }

      // 3. Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const origin = (r.origin || "").toLowerCase();
        const destination = (r.destination || "").toLowerCase();
        const originName = (getAirportName(r.origin) || "").toLowerCase();
        const destName = (getAirportName(r.destination) || "").toLowerCase();
        const flightDate = (r.flightDate || "").toLowerCase();
        const airline = (r.lastAirline || "").toLowerCase();

        return (
          origin.includes(term) ||
          destination.includes(term) ||
          originName.includes(term) ||
          destName.includes(term) ||
          flightDate.includes(term) ||
          airline.includes(term)
        );
      }

      return true;
    });
  }, [routes, statusFilter, selectedAirline, searchTerm]);

  // Ordenação individual
  const sortedFilteredRoutes = useMemo(() => {
    return [...filteredRoutes].sort((a, b) => {
      if (sortBy === "date_asc") {
        return a.flightDate.localeCompare(b.flightDate);
      }
      if (sortBy === "date_desc") {
        return b.flightDate.localeCompare(a.flightDate);
      }
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

  // Agrupamento por Origem e Destino exatos (ex: SAO-MIA ou GRU-FCO)
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
      const earliestDate = sortedRoutes[0]?.flightDate || "";
      const latestDate = sortedRoutes[sortedRoutes.length - 1]?.flightDate || "";

      sortedRoutes.forEach((r) => {
        if (r.latestPrice !== null && r.latestPrice !== undefined) {
          if (lowestPrice === null || r.latestPrice < lowestPrice) {
            lowestPrice = r.latestPrice;
          }
          if (r.isActive && r.latestPrice <= r.targetPrice) {
            targetHitsCount += 1;
          }
        }
      });

      return {
        key,
        origin,
        destination,
        routes: sortedRoutes,
        lowestPrice,
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
        {/* Header com Ação Primária */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Rotas Monitoradas
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {counts.total} destinos
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
              Gerenciamento completo de cotações, parâmetros de alerta e histórico retroativo.
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
              <span>Nova Rota</span>
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
                Total Monitorado
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.total} <span className="text-xs font-medium text-slate-400">rotas</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Ativas
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.active} <span className="text-xs font-medium text-slate-400">em varredura</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0">
              <Target className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                No Alvo
              </span>
              <span className="text-base font-black text-emerald-600 tabular-nums">
                {counts.target} <span className="text-xs font-medium text-slate-400">prontas</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <TrendingDown className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Menor Tarifa
              </span>
              <span className="text-base font-black text-slate-900 tabular-nums">
                {counts.lowestPrice ? formatCurrency(counts.lowestPrice) : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* SaaS Filter & Control Bar */}
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
                Todas ({counts.total})
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ativas ({counts.active})
              </button>
              <button
                onClick={() => setStatusFilter("target")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "target"
                    ? "bg-white text-emerald-700 shadow-2xs font-bold"
                    : "text-slate-600 hover:text-emerald-700"
                }`}
              >
                Alvo ({counts.target})
              </button>
              <button
                onClick={() => setStatusFilter("paused")}
                className={`py-1 px-3 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === "paused"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Pausadas ({counts.paused})
              </button>
            </div>

            {/* Controls Group: Airline + Sort + Mode Toggle + Expandable Search */}
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap justify-end">
              {/* Airline CustomSelect */}
              <CustomSelect
                value={selectedAirline}
                onChange={setSelectedAirline}
                options={[
                  { value: "all", label: "Todas as Cias" },
                  ...availableAirlines.map((cia) => ({ value: cia, label: cia })),
                ]}
              />

              {/* Sort CustomSelect */}
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                icon={<ArrowUpDown className="w-3.5 h-3.5" />}
                options={[
                  { value: "date_asc", label: "Data (Mais Próxima)" },
                  { value: "date_desc", label: "Data (Mais Distante)" },
                  { value: "price_asc", label: "Menor Preço" },
                  { value: "discount_desc", label: "Maior Desconto" },
                  { value: "price_desc", label: "Maior Preço" },
                  { value: "route", label: "Trecho A-Z" },
                ]}
              />

              {/* View Mode Switch */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 justify-center">
                <Tooltip content="Visualização agrupada por trecho">
                  <button
                    onClick={() => setIsGrouped(true)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isGrouped ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    aria-label="Visualização agrupada por trecho"
                  >
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
                <Tooltip content="Visualização em lista individual">
                  <button
                    onClick={() => setIsGrouped(false)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      !isGrouped ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
                    }`}
                    aria-label="Visualização em lista individual"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              </div>

              {/* Expandable Search Button */}
              <ExpandableSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar trecho, cia..."
              />
            </div>
          </div>

          {/* Active Filter Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">
                Mostrando <strong>{filteredRoutes.length}</strong> de {routes.length} rotas cadastradas
              </span>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Limpar filtros</span>
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
              {routes.length === 0
                ? "Nenhuma rota cadastrada no momento"
                : "Nenhuma rota corresponde aos filtros"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4 font-medium">
              {routes.length === 0
                ? "Cadastre sua primeira rota para iniciar o rastreamento automático de tarifas aéreas."
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
                Cadastrar Nova Rota
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
        ) : isGrouped ? (
          /* ========================================================== */
          /* MODO AGRUPADO POR ORIGEM E DESTINO                         */
          /* ========================================================== */
          <div className="space-y-4">
            {routeGroups.map((group) => {
              const isCollapsed = Boolean(collapsedGroups[group.key]);

              return (
                <div
                  key={group.key}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Cabeçalho do Grupo */}
                  <div
                    onClick={() => toggleGroupCollapse(group.key)}
                    className="p-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 cursor-pointer select-none transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 font-black text-slate-900 tracking-tight text-base">
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                              {group.origin}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
                              {group.destination}
                            </span>
                          </div>

                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-200/80 text-slate-700">
                            {group.routes.length} {group.routes.length === 1 ? "data monitorada" : "datas monitoradas"}
                          </span>

                          {group.hasTargetHit && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {group.targetHitsCount} no alvo
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {getAirportName(group.origin)} → {getAirportName(group.destination)}
                        </div>
                      </div>
                    </div>

                    {/* Preço Mínimo do Grupo */}
                    <div className="flex items-center gap-3 sm:justify-end">
                      {group.lowestPrice !== null && (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            A partir de
                          </span>
                          <span className="text-base font-black text-emerald-600 tabular-nums">
                            {formatCurrency(group.lowestPrice)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de cards do grupo */}
                  {!isCollapsed && (
                    <div className="p-3.5 space-y-3 bg-slate-50/30 animate-fadeIn">
                      {group.routes.map((route) => (
                        <RouteCard
                          key={route.id}
                          route={route}
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
          /* ========================================================== */
          /* MODO LISTA CONTÍNUA INDIVIDUAL                             */
          /* ========================================================== */
          <div className="space-y-3">
            {sortedFilteredRoutes.map((route) => (
              <RouteCard
                key={route.id}
                route={route}
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
        title="Excluir Rota Monitorada"
        message={`Tem certeza que deseja excluir a rota ${routeToDelete?.origin} → ${routeToDelete?.destination} (${routeToDelete?.flightDate})? Todo o histórico de preços associado será perdido.`}
        confirmLabel="Excluir Rota"
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
