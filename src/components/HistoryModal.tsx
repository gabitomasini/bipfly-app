"use client";

import { useEffect, useState, useMemo } from "react";
import { X, BarChart2, RefreshCw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import { FlightHistoryEntry, MonitoredRoute } from "@/lib/types";
import { formatCurrency, formatDateTimeBR, getAirportName, getGoogleFlightsUrl } from "@/lib/utils";
import PriceHistoryChart from "./PriceHistoryChart";
import StatisticalAnalysisCard from "./StatisticalAnalysisCard";

interface HistoryModalProps {
  isOpen: boolean;
  route: MonitoredRoute | null;
  onClose: () => void;
}

export default function HistoryModal({ isOpen, route, onClose }: HistoryModalProps) {
  const [history, setHistory] = useState<FlightHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && route) {
      setLoading(true);
      fetch(`/api/history?routeId=${route.id}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setHistory(json.data || []);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, route]);

  const [sortField, setSortField] = useState<"searchedAt" | "lowestPrice">("searchedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page when route or history changes
  useEffect(() => {
    setCurrentPage(1);
  }, [route?.id, history.length, pageSize]);

  const handleToggleSort = (field: "searchedAt" | "lowestPrice") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "lowestPrice" ? "asc" : "desc");
    }
  };

  const sortedHistory = useMemo(() => {
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

  const totalItems = sortedHistory.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedHistory.slice(start, start + pageSize);
  }, [sortedHistory, currentPage, pageSize]);

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

  if (!isOpen || !route) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {route.origin} → {route.destination}
                </h2>
                <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-md font-mono font-bold">
                  {route.flightDate}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {getAirportName(route.origin)} para {getAirportName(route.destination)} • Meta:{" "}
                <strong className="text-amber-700 font-bold">{formatCurrency(route.targetPrice)}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-sky-600 mb-2" />
              <span className="text-xs font-semibold">Carregando histórico de cotações...</span>
            </div>
          ) : (
            <>
              {/* Statistical Analysis Card */}
              <StatisticalAnalysisCard
                history={history}
                currentPrice={route.latestPrice}
                origin={route.origin}
                destination={route.destination}
                departureDate={route.flightDate}
              />

              {/* Price Chart */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span>Evolução do Preço ao Longo do Tempo</span>
                </h3>
                <PriceHistoryChart
                  data={history}
                  targetPrice={route.targetPrice}
                  origin={route.origin}
                  destination={route.destination}
                />
              </div>

              {/* History Table */}
              <div className="space-y-3">
                {/* Header da Tabela com Controles Superiores de Paginação */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">
                    Registro de Todas as Consultas ({totalItems})
                  </h3>

                  {totalItems > 0 && (
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
                          {currentPage} de {totalPages}
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
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Próxima página"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {totalItems === 0 ? (
                  <p className="text-xs text-slate-500 py-4">Nenhum registro encontrado.</p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
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
                          {paginatedHistory.map((item, idx) => {
                            const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                            const isBelow = item.lowestPrice <= route.targetPrice;
                            const flightUrl =
                              item.bookingLink ||
                              getGoogleFlightsUrl(
                                item.origin,
                                item.destination,
                                item.flightDate,
                                route.passengers
                              );
                            return (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                                  {item.airline || "--"}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {item.flightNumber || "--"}
                                </td>
                                <td className="px-4 py-3 font-mono text-slate-600">
                                  {item.departureTime || "--"} → {item.arrivalTime || "--"}
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
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                                    title="Ver no Google Flights"
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
                          {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                        </strong>{" "}
                        a{" "}
                        <strong className="text-slate-800">
                          {Math.min(currentPage * pageSize, totalItems)}
                        </strong>{" "}
                        de <strong className="text-slate-800">{totalItems}</strong> registros
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1)
                            .filter((pageNum) => {
                              return (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                Math.abs(pageNum - currentPage) <= 1
                              );
                            })
                            .map((pageNum, idx, arr) => {
                              const prev = arr[idx - 1];
                              const showEllipsis = prev && pageNum - prev > 1;

                              return (
                                <span key={pageNum} className="flex items-center">
                                  {showEllipsis && (
                                    <span className="px-1 text-slate-400 select-none">…</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                      currentPage === pageNum
                                        ? "bg-sky-600 text-white shadow-xs"
                                        : "text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                </span>
                              );
                            })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
