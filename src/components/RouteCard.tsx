"use client";

import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  RefreshCw,
  BarChart2,
  Trash2,
  Edit2,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Play,
  History,
  CheckCircle2,
} from "lucide-react";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";

interface RouteCardProps {
  route: MonitoredRoute;
  onEdit: (route: MonitoredRoute) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, currentActive: boolean) => void;
  onViewHistory: (route: MonitoredRoute) => void;
  onViewLiveResults?: (route: MonitoredRoute, options: FlightOption[]) => void;
  onRefreshList: () => void;
}

export default function RouteCard({
  route,
  onEdit,
  onDelete,
  onToggleActive,
  onViewHistory,
  onViewLiveResults,
  onRefreshList,
}: RouteCardProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSearchNow = async () => {
    setIsMenuOpen(false);
    setIsSearching(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("Preço atualizado com sucesso!");
        onRefreshList();
        if (json.data?.foundOptions && onViewLiveResults) {
          onViewLiveResults(route, json.data.foundOptions);
        }
      } else {
        setFeedback(`Erro: ${json.error || "Falha na busca"}`);
      }
    } catch (err: any) {
      setFeedback(`Erro: ${err.message}`);
    } finally {
      setIsSearching(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleBackfillHistory = async () => {
    setIsMenuOpen(false);
    setIsBackfilling(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/routes/${route.id}/backfill`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        if (json.importedCount > 0) {
          setFeedback(`${json.importedCount} dias de histórico importados!`);
        } else {
          setFeedback(json.message || "Histórico já está em dia.");
        }
        onRefreshList();
      } else {
        setFeedback(`Erro: ${json.error || "Falha ao importar"}`);
      }
    } catch (err: any) {
      setFeedback(`Erro: ${err.message}`);
    } finally {
      setIsBackfilling(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const hasPrice = route.latestPrice !== null && route.latestPrice !== undefined;
  const currentPrice = route.latestPrice as number;
  const target = route.targetPrice;
  const isBelowLimit = hasPrice && currentPrice <= target;
  const savings = hasPrice && isBelowLimit ? target - currentPrice : 0;

  const flightUrl =
    route.lastBookingLink ||
    getGoogleFlightsUrl(
      route.origin,
      route.destination,
      route.flightDate,
      route.passengers || 1
    );

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 p-3.5 sm:p-4 shadow-xs hover:border-slate-300 hover:shadow-sm ${
        !route.isActive
          ? "opacity-60 border-dashed border-slate-300 bg-slate-50/40"
          : isBelowLimit
          ? "border-emerald-300 bg-emerald-50/10"
          : "border-slate-200/90"
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Coluna 1: Origem → Destino, Cidades & Data */}
        <div className="flex items-start gap-3 min-w-0 md:w-5/12">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {route.origin}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-base font-bold text-slate-900 tracking-tight">
                {route.destination}
              </span>

              {isBelowLimit && route.isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  No Alvo (-{formatCurrency(savings)})
                </span>
              )}

              {!route.isActive && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                  Pausada
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 truncate mt-0.5">
              <span>{getAirportName(route.origin)} → {getAirportName(route.destination)}</span>
              <span className="text-slate-300 mx-1.5">•</span>
              <strong className="text-slate-700 font-semibold">{formatDateBR(route.flightDate)}</strong>
            </div>
          </div>
        </div>

        {/* Coluna 2: Preço, Meta & Cia */}
        <div className="flex items-baseline md:items-center justify-between md:justify-end gap-6 md:w-4/12">
          <div>
            <div className="text-[11px] text-slate-400 font-medium leading-none mb-1">
              Menor Preço
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-lg font-bold tracking-tight ${
                  hasPrice
                    ? isBelowLimit
                      ? "text-emerald-600"
                      : "text-slate-900"
                    : "text-slate-400"
                }`}
              >
                {hasPrice ? formatCurrency(currentPrice) : "—"}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-400 font-medium leading-none mb-1">
              Sua Meta
            </div>
            <div className="text-xs font-semibold text-slate-600">
              {formatCurrency(target)}
            </div>
          </div>

          <div className="hidden lg:block text-right text-[11px] text-slate-400">
            <div>{route.lastAirline || "Google Flights"}</div>
            <div>{route.lastSearchedAt ? formatDateTimeBR(route.lastSearchedAt) : "Pendente"}</div>
          </div>
        </div>

        {/* Coluna 3: Ações Rápidas & Menu */}
        <div className="flex items-center justify-between md:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0 md:w-3/12">
          <a
            href={flightUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Voo</span>
          </a>

          <button
            onClick={() => onViewHistory(route)}
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Ver histórico de preços"
          >
            <BarChart2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Histórico</span>
          </button>

          {/* Context Menu (···) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mais opções"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs animate-fadeIn">
                <button
                  onClick={handleSearchNow}
                  disabled={isSearching || !route.isActive}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${isSearching ? "animate-spin" : ""}`} />
                  <span>{isSearching ? "Buscando..." : "Buscar agora"}</span>
                </button>

                <button
                  onClick={handleBackfillHistory}
                  disabled={isBackfilling}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium disabled:opacity-40 cursor-pointer"
                >
                  <History className={`w-3.5 h-3.5 text-indigo-600 ${isBackfilling ? "animate-spin" : ""}`} />
                  <span>{isBackfilling ? "Importando..." : "Importar histórico (30d)"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleActive(route.id, route.isActive);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  {route.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Retomar</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(route);
                  }}
                  className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Editar</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(route.id);
                  }}
                  className="w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-100 text-xs text-sky-800 font-medium animate-fadeIn">
          {feedback}
        </div>
      )}
    </div>
  );
}
