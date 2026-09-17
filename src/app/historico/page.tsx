"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import MultiRoutePriceChart from "@/components/MultiRoutePriceChart";
import StatisticalAnalysisCard from "@/components/StatisticalAnalysisCard";
import RouteMultiSelectDropdown from "@/components/RouteMultiSelectDropdown";
import CustomSelect from "@/components/CustomSelect";
import { MonitoredRoute, FlightHistoryEntry } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
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
} from "lucide-react";
import { ROUTE_COLORS } from "@/components/MultiRoutePriceChart";

export default function HistoricoPage() {
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
            text: json.message || "Nenhum ponto de histórico novo a importar.",
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
    Promise.all([
      fetch("/api/routes").then((res) => res.json()),
      fetch("/api/history?limit=500").then((res) => res.json()),
    ])
      .then(([routesRes, historyRes]) => {
        if (routesRes.success && routesRes.data?.length > 0) {
          const loadedRoutes: MonitoredRoute[] = routesRes.data;
          setRoutes(loadedRoutes);
          setSelectedRouteIds(loadedRoutes.map((r) => r.id));
        }
        if (historyRes.success && historyRes.data) {
          setAllHistory(historyRes.data);
          setHistory(historyRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

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

  // Paginação
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [singlePageSize, setSinglePageSize] = useState<number>(10);
  const [singleCurrentPage, setSingleCurrentPage] = useState<number>(1);

  // Reseta página ao mudar filtros de rota ou tamanho da página
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRouteIds, pageSize]);

  useEffect(() => {
    setSingleCurrentPage(1);
  }, [selectedRouteIds, singlePageSize]);

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

  // Mapa de cores
  const routeColorMap = useMemo(() => {
    const map = new Map<number, string>();
    routes.forEach((r, idx) => {
      map.set(r.id, ROUTE_COLORS[idx % ROUTE_COLORS.length]);
    });
    return map;
  }, [routes]);

  // Mapeamento rápido de rotas
  const routeMap = useMemo(() => {
    const map = new Map<number, MonitoredRoute>();
    routes.forEach((r) => map.set(r.id, r));
    return map;
  }, [routes]);

  const [sortField, setSortField] = useState<"searchedAt" | "lowestPrice">("searchedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleToggleSort = (field: "searchedAt" | "lowestPrice") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "lowestPrice" ? "asc" : "desc");
    }
  };

  const sortedSingleHistory = useMemo(() => {
    return [...history].sort((a, b) => {
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
  }, [history, sortField, sortDirection]);

  const sortedMultiHistory = useMemo(() => {
    return [...activeSelectedHistory].sort((a, b) => {
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
  }, [activeSelectedHistory, sortField, sortDirection]);


  // Paginação da tabela multi-rotas
  const totalMultiItems = sortedMultiHistory.length;
  const totalMultiPages = Math.max(1, Math.ceil(totalMultiItems / pageSize));
  const paginatedMultiHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedMultiHistory.slice(start, start + pageSize);
  }, [sortedMultiHistory, currentPage, pageSize]);

  // Paginação da tabela de rota individual
  const totalSingleItems = sortedSingleHistory.length;
  const totalSinglePages = Math.max(1, Math.ceil(totalSingleItems / singlePageSize));
  const paginatedSingleHistory = useMemo(() => {
    const start = (singleCurrentPage - 1) * singlePageSize;
    return sortedSingleHistory.slice(start, start + singlePageSize);
  }, [sortedSingleHistory, singleCurrentPage, singlePageSize]);

  // Reseta páginas ao mudar rota selecionada
  useEffect(() => {
    setSingleCurrentPage(1);
  }, [selectedRouteIds, singlePageSize]);

  const renderSortHeader = (label: string, field: "searchedAt" | "lowestPrice") => {
    const isActive = sortField === field;
    return (
      <button
        type="button"
        onClick={() => handleToggleSort(field)}
        className={`inline-flex items-center gap-1.5 uppercase font-bold text-[10px] tracking-wider transition-colors cursor-pointer select-none hover:text-slate-950 ${
          isActive ? "text-sky-700 font-extrabold" : "text-slate-600"
        }`}
        title={`Ordenar por ${label} (${isActive ? (sortDirection === "asc" ? "crescente" : "decrescente") : "clique para ordenar"})`}
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

  return (
    <div className="min-h-screen pb-20 bg-slate-50/60">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header com Dropdown Customizado de Multi-Seleção */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-600" />
              <span>Histórico de Cotações</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
              Compare a evolução de preços entre rotas ou analise cada data individualmente.
            </p>
          </div>

          {/* Dropdown Customizado com Checkboxes */}
          {routes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Exibir:</span>
              <RouteMultiSelectDropdown
                routes={routes}
                selectedIds={selectedRouteIds}
                onChange={setSelectedRouteIds}
              />
            </div>
          )}
        </div>

        {routes.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-medium text-slate-500">
              Nenhuma rota cadastrada no momento para exibir histórico.
            </p>
          </div>
        ) : selectedRouteIds.length === 0 ? (
          /* ========================================================== */
          /* NENHUMA ROTA SELECIONADA NO DROPDOWN                       */
          /* ========================================================== */
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Nenhuma rota selecionada no filtro
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Use o menu &ldquo;Exibir&rdquo; acima para marcar as rotas que deseja comparar no gráfico.
            </p>
            <button
              onClick={() => setSelectedRouteIds(routes.map((r) => r.id))}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              Selecionar Todas as Rotas
            </button>
          </div>
        ) : selectedRouteIds.length > 1 ? (
          /* ========================================================== */
          /* MODO: MÚLTIPLAS ROTAS SELECIONADAS (COMPARATIVO MULTI-LINHAS)*/
          /* ========================================================== */
          <div className="space-y-6 animate-fadeIn">
            {/* Painel do Gráfico Multi-Linhas */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>Comparativo de Preços ({activeSelectedRoutes.length} rotas)</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Selecione os intervalos abaixo para analisar a evolução das tarifas.
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

            {/* Tabela Consolidada de Cotações com Paginação Superior e Inferior */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              {/* Header da Tabela com Controles Superiores de Paginação */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Histórico Consolidado ({totalMultiItems} registros)
                  </h2>
                </div>

                {totalMultiItems > 0 && (
                  <div className="flex items-center gap-3">
                    {/* Seletor de Itens por Página */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="hidden sm:inline">Itens por pág:</span>
                      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                        {[10, 50, 100].map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setPageSize(size)}
                            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                              pageSize === size
                                ? "bg-white text-slate-900 shadow-xs"
                                : "text-slate-500 hover:text-slate-800"
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Navegação Superior Compacta */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-2 border-l border-slate-200">
                      <span className="font-medium text-[11px] text-slate-500">
                        {currentPage} de {totalMultiPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Página anterior"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalMultiPages, p + 1))}
                        disabled={currentPage === totalMultiPages}
                        className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Próxima página"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {totalMultiItems === 0 ? (
                <p className="text-xs text-slate-500 font-medium py-4">
                  Nenhum registro encontrado para as rotas selecionadas.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                        <tr>
                          <th className="px-3 py-3 w-12 text-slate-400 font-mono text-center">#</th>
                          <th className="px-4 py-3">Rota</th>
                          <th className="px-4 py-3">Data do Voo</th>
                          <th className="px-4 py-3">
                            {renderSortHeader("Data da Consulta", "searchedAt")}
                          </th>
                          <th className="px-4 py-3">
                            {renderSortHeader("Preço", "lowestPrice")}
                          </th>
                          <th className="px-4 py-3">Cia Aérea</th>
                          <th className="px-4 py-3">Status vs Meta</th>
                          <th className="px-4 py-3 text-right">Ação</th>
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
                            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-3 py-3 font-mono text-slate-400 text-center font-medium">
                                {rowNumber}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span>{item.origin} → {item.destination}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-semibold text-slate-800">
                                {formatDateBR(item.flightDate)}
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-500">
                                {formatDateTimeBR(item.searchedAt)}
                              </td>
                              <td className="px-4 py-3 font-extrabold text-slate-900">
                                {formatCurrency(item.lowestPrice, item.currency)}
                              </td>
                              <td className="px-4 py-3 text-slate-700 font-medium">
                                {item.airline || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isBelow
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {isBelow
                                    ? `No Alvo (-${formatCurrency(targetPrice - item.lowestPrice)})`
                                    : `Acima da Meta (+${formatCurrency(item.lowestPrice - targetPrice)})`}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <a
                                  href={flightUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Ver Voo</span>
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
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Anterior</span>
                      </button>

                      {/* Números das Páginas */}
                      <div className="flex items-center gap-1 mx-1">
                        {Array.from({ length: totalMultiPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            // Mostra a primeira, a última, e as páginas próximas à atual
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
                                  className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                    currentPage === pageNum
                                      ? "bg-indigo-600 text-white shadow-xs"
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
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
          /* MODO: ROTA INDIVIDUAL SELECIONADA (ANÁLISE DETALHADA)      */
          /* ========================================================== */
          singleRoute && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header do Card da Rota */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold tracking-tight text-slate-900">
                      {singleRoute.origin} → {singleRoute.destination}
                    </h2>
                    <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md font-bold">
                      {formatDateBR(singleRoute.flightDate)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {getAirportName(singleRoute.origin)} para {getAirportName(singleRoute.destination)} • Meta de Preço:{" "}
                    <strong className="text-slate-800 font-bold">{formatCurrency(singleRoute.targetPrice)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBackfillRoute(singleRoute.id)}
                    disabled={isBackfilling}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer disabled:opacity-50"
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
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver no Google Flights</span>
                  </a>
                </div>
              </div>

              {/* Mensagem de Feedback de Backfill */}
              {backfillMessage && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 animate-fadeIn ${
                    backfillMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : backfillMessage.type === "error"
                      ? "bg-rose-50 border-rose-200 text-rose-900"
                      : "bg-sky-50 border-sky-200 text-sky-900"
                  }`}
                >
                  {backfillMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
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
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
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

              {/* Tabela de Consultas da Rota com Paginação Superior e Inferior */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
                {/* Header da Tabela com Controles Superiores de Paginação */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Registro de Todas as Consultas ({totalSingleItems})
                    </h3>
                  </div>

                  {totalSingleItems > 0 && (
                    <div className="flex items-center gap-3">
                      {/* Seletor de Itens por Página */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="hidden sm:inline">Itens por pág:</span>
                        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                          {[10, 50, 100].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSinglePageSize(size)}
                              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                                singlePageSize === size
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-500 hover:text-slate-800"
                              }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Navegação Superior Compacta */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 pl-2 border-l border-slate-200">
                        <span className="font-medium text-[11px] text-slate-500">
                          {singleCurrentPage} de {totalSinglePages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSingleCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={singleCurrentPage === 1}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Página anterior"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSingleCurrentPage((p) => Math.min(totalSinglePages, p + 1))}
                          disabled={singleCurrentPage === totalSinglePages}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Próxima página"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {totalSingleItems === 0 ? (
                  <p className="text-xs text-slate-500 font-medium py-4">Nenhum registro encontrado.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-xs text-left text-slate-700">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200 font-bold">
                          <tr>
                            <th className="px-3 py-3 w-12 text-slate-400 font-mono text-center">#</th>
                            <th className="px-4 py-3">
                              {renderSortHeader("Data da Consulta", "searchedAt")}
                            </th>
                            <th className="px-4 py-3">
                              {renderSortHeader("Preço", "lowestPrice")}
                            </th>
                            <th className="px-4 py-3">Companhia Aérea</th>
                            <th className="px-4 py-3">Voo</th>
                            <th className="px-4 py-3">Horários</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Ação</th>
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
                              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3 py-3 font-mono text-slate-400 text-center font-medium">
                                  {rowNumber}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-500">
                                  {formatDateTimeBR(item.searchedAt)}
                                </td>
                                <td className="px-4 py-3 font-extrabold text-slate-900">
                                  {formatCurrency(item.lowestPrice, item.currency)}
                                </td>
                                <td className="px-4 py-3 text-slate-800 font-medium">
                                  {item.airline || "—"}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {item.flightNumber || "—"}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {item.departureTime || "—"} → {item.arrivalTime || "—"}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isBelow
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    {isBelow ? "Abaixo da Meta" : "Acima da Meta"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <a
                                    href={flightUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Ver Voo</span>
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                      singleCurrentPage === pageNum
                                        ? "bg-indigo-600 text-white shadow-xs"
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
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
