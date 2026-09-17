"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import RouteCard from "@/components/RouteCard";
import RouteModal from "@/components/RouteModal";
import HistoryModal from "@/components/HistoryModal";
import FlightSearchResultsDrawer from "@/components/FlightSearchResultsDrawer";
import CustomSelect from "@/components/CustomSelect";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import { formatCurrency, getAirportName } from "@/lib/utils";
import {
  Plus,
  Search,
  RefreshCw,
  Layers,
  List,
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";

type SortOption = "date_asc" | "date_desc" | "price_asc" | "price_desc";

export default function RotasPage() {
  const [routes, setRoutes] = useState<MonitoredRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "target">("all");
  const [sortBy, setSortBy] = useState<SortOption>("date_asc");
  const [isGrouped, setIsGrouped] = useState(true);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MonitoredRoute | null>(null);
  const [historyModalRoute, setHistoryModalRoute] = useState<MonitoredRoute | null>(null);
  const [liveDrawerRoute, setLiveDrawerRoute] = useState<MonitoredRoute | null>(null);
  const [liveOptions, setLiveOptions] = useState<FlightOption[]>([]);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch("/api/routes");
      const json = await res.json();
      if (json.success) {
        setRoutes(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      await fetch(`/api/routes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive, ativo: !currentActive }),
      });
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRoute = async (id: number) => {
    if (!confirm("Tem certeza que deseja excluir esta rota monitorada?")) return;
    try {
      await fetch(`/api/routes/${id}`, { method: "DELETE" });
      fetchRoutes();
    } catch (err) {
      console.error(err);
    }
  };

  // Contadores
  const counts = useMemo(() => {
    const total = routes.length;
    const active = routes.filter((r) => r.isActive).length;
    const paused = routes.filter((r) => !r.isActive).length;
    const target = routes.filter((r) => {
      const p = r.latestPrice;
      return r.isActive && p !== null && p !== undefined && p <= r.targetPrice;
    }).length;
    return { total, active, paused, target };
  }, [routes]);

  // Filtros aplicados
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      // Filtro de Status
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "paused" && r.isActive) return false;
      if (statusFilter === "target") {
        const p = r.latestPrice;
        if (!r.isActive || p === null || p === undefined || p > r.targetPrice) return false;
      }

      // Filtro de Busca
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const origin = (r.origin || "").toLowerCase();
        const destination = (r.destination || "").toLowerCase();
        const flightDate = (r.flightDate || "").toLowerCase();
        const airline = (r.lastAirline || "").toLowerCase();

        return (
          origin.includes(term) ||
          destination.includes(term) ||
          flightDate.includes(term) ||
          airline.includes(term)
        );
      }

      return true;
    });
  }, [routes, statusFilter, searchTerm]);

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
      return 0;
    });
  }, [filteredRoutes, sortBy]);

  // Agrupamento por Origem e Destino exatos (ex: SAO-MIA ou GRU-FCO) com ordenação aplicada
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

      // Ordena as rotas internas de acordo com a preferência de ordenação
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
        return 0;
      });

      // Menor preço do grupo
      let lowestPrice: number | null = null;
      let hasTargetHit = false;
      let earliestDate = sortedRoutes[0]?.flightDate || "";
      let latestDate = sortedRoutes[sortedRoutes.length - 1]?.flightDate || "";

      sortedRoutes.forEach((r) => {
        if (r.latestPrice !== null && r.latestPrice !== undefined) {
          if (lowestPrice === null || r.latestPrice < lowestPrice) {
            lowestPrice = r.latestPrice;
          }
          if (r.isActive && r.latestPrice <= r.targetPrice) {
            hasTargetHit = true;
          }
        }
      });

      return {
        key,
        origin,
        destination,
        routes: sortedRoutes,
        lowestPrice,
        hasTargetHit,
        earliestDate,
        latestDate,
      };
    });

    // Ordena os grupos entre si
    return groups.sort((a, b) => {
      if (sortBy === "date_asc") {
        return a.earliestDate.localeCompare(b.earliestDate);
      }
      if (sortBy === "date_desc") {
        return b.latestDate.localeCompare(a.latestDate);
      }
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
      return 0;
    });
  }, [filteredRoutes, sortBy]);

  return (
    <div className="min-h-screen pb-24 bg-slate-50/60">
      <Navbar onSearchTriggered={fetchRoutes} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Rotas Monitoradas
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
              Gerencie seus destinos, cotações e importação de histórico retroativo.
            </p>
          </div>

          <div>
            <button
              onClick={() => {
                setEditingRoute(null);
                setIsRouteModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Rota</span>
            </button>
          </div>
        </div>

        {/* Clean Filter, Sort and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex rounded-xl bg-slate-200/60 p-1 text-xs font-medium overflow-x-auto shrink-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todas ({counts.total})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ativas ({counts.active})
            </button>
            <button
              onClick={() => setStatusFilter("target")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === "target"
                  ? "bg-white text-emerald-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              No Alvo ({counts.target})
            </button>
            <button
              onClick={() => setStatusFilter("paused")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === "paused"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pausadas ({counts.paused})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Ordenação Customizado */}
            <CustomSelect<SortOption>
              value={sortBy}
              onChange={setSortBy}
              icon={<ArrowUpDown className="w-3.5 h-3.5" />}
              options={[
                { value: "date_asc", label: "Data (Próximos)" },
                { value: "date_desc", label: "Data (Distantes)" },
                { value: "price_asc", label: "Menor Preço" },
                { value: "price_desc", label: "Maior Preço" },
              ]}
            />

            {/* Toggle de Agrupamento por Origem e Destino */}
            <div className="inline-flex rounded-xl bg-slate-200/60 p-1 text-xs font-medium shrink-0">
              <button
                onClick={() => setIsGrouped(true)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isGrouped
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Agrupar por origem e destino"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Agrupado</span>
              </button>
              <button
                onClick={() => setIsGrouped(false)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  !isGrouped
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Exibir lista contínua individual"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-52">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar rota, cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Route List / Groups */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mb-2" />
            <span className="text-xs">Carregando rotas...</span>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-medium text-slate-700 mb-1">
              {searchTerm || statusFilter !== "all"
                ? "Nenhuma rota encontrada para os filtros aplicados."
                : "Nenhuma rota monitorada no momento."}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchTerm || statusFilter !== "all"
                ? "Tente ajustar os termos de busca ou mudar a aba de filtro."
                : "Cadastre uma nova rota para começar o rastreamento de tarifas."}
            </p>
            {searchTerm || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
              >
                Limpar Filtros
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingRoute(null);
                  setIsRouteModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white transition-colors cursor-pointer"
              >
                Cadastrar Rota
              </button>
            )}
          </div>
        ) : isGrouped ? (
          /* ========================================================== */
          /* MODO AGRUPADO POR ORIGEM E DESTINO                         */
          /* ========================================================== */
          <div className="space-y-6">
            {routeGroups.map((group) => (
              <div
                key={group.key}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Cabeçalho do Grupo */}
                <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-900 tracking-tight">
                        {group.origin}
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="text-base font-bold text-slate-900 tracking-tight">
                        {group.destination}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200/70 text-slate-700">
                        {group.routes.length} {group.routes.length === 1 ? "data" : "datas"}
                      </span>

                      {group.hasTargetHit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          No Alvo
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 font-normal mt-0.5">
                      {getAirportName(group.origin)} → {getAirportName(group.destination)}
                    </div>
                  </div>

                  {group.lowestPrice !== null && (
                    <div className="flex items-baseline gap-1.5 text-xs text-slate-600">
                      <span className="text-slate-400">A partir de:</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {formatCurrency(group.lowestPrice)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lista de cards retangulares ordenados */}
                <div className="p-3 space-y-2.5 bg-slate-50/30">
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
              </div>
            ))}
          </div>
        ) : (
          /* ========================================================== */
          /* MODO LISTA CONTÍNUA INDIVIDUAL ORDENADA                    */
          /* ========================================================== */
          <div className="space-y-2.5">
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
    </div>
  );
}
