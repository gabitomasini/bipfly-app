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
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatRelativeTime,
  getAirportName,
  getGoogleFlightsUrl,
} from "@/lib/utils";
import AirlineBadge from "@/components/AirlineBadge";
import Tooltip from "@/components/Tooltip";

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
        setFeedback("Cotação atualizada com sucesso!");
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
  const diffPercent = hasPrice && target > 0 ? Math.round(Math.abs((target - currentPrice) / target) * 100) : 0;

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
      className={`bg-white rounded-2xl border transition-all duration-200 p-4 shadow-2xs hover:border-slate-300 hover:shadow-md ${
        !route.isActive
          ? "opacity-60 border-dashed border-slate-300 bg-slate-50/50"
          : isBelowLimit
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50/25 to-white"
          : "border-slate-200/90"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Bloco 1: Trecho, Data do Voo & Cia Aérea */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0 lg:w-5/12">
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Badges IATA & Status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 font-black text-slate-900 tracking-tight text-sm">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                  {route.origin}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                  {route.destination}
                </span>
              </div>

              {/* Data do Voo */}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100/90 text-slate-700 text-[11px] font-semibold border border-slate-200/70">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>{formatDateBR(route.flightDate)}</span>
              </span>

              {/* Status Badge */}
              {isBelowLimit && route.isActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>No Alvo (-{formatCurrency(savings)})</span>
                </span>
              )}

              {!route.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  Pausada
                </span>
              )}
            </div>

            {/* Aeroportos e Cia */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="truncate max-w-[240px]">
                {getAirportName(route.origin)} → {getAirportName(route.destination)}
              </span>
              <span className="text-slate-300">•</span>
              <AirlineBadge airline={route.lastAirline} size="sm" />
            </div>
          </div>
        </div>

        {/* Bloco 2: Preços (Atual x Meta) & Última Varredura */}
        <div className="flex items-center justify-between lg:justify-end gap-6 lg:w-4/12 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          {/* Preço Atual */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Preço Atual
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-black tracking-tight tabular-nums ${
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

          {/* Sua Meta */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Sua Meta
            </span>
            <div className="text-xs font-bold text-slate-600 tabular-nums">
              {formatCurrency(target)}
            </div>
            {hasPrice && !isBelowLimit && (
              <span className="text-[10px] text-rose-600 font-semibold block">
                +{formatCurrency(currentPrice - target)} (+{diffPercent}%)
              </span>
            )}
          </div>

          {/* Última Checagem */}
          <div className="hidden xl:block text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Última Busca
            </span>
            <div className="text-xs font-medium text-slate-500 flex items-center justify-end gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>
                {route.lastSearchedAt ? formatRelativeTime(route.lastSearchedAt) : "Pendente"}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco 3: Barra de Ações Rápidas */}
        <div className="flex items-center justify-between lg:justify-end gap-1.5 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0">
          {/* Botão Buscar Agora */}
          <Tooltip content="Buscar cotação instantânea no Google Flights">
            <button
              onClick={handleSearchNow}
              disabled={isSearching || !route.isActive}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isSearching
                  ? "bg-sky-100 text-sky-800 border border-sky-300"
                  : "bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80"
              } disabled:opacity-40`}
              aria-label="Buscar cotação instantânea no Google Flights"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? "animate-spin text-sky-600" : "text-sky-600"}`} />
              <span>{isSearching ? "Buscando..." : "Buscar"}</span>
            </button>
          </Tooltip>

          {/* Ver Voo Google Flights */}
          <Tooltip content="Abrir no Google Flights">
            <a
              href={flightUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
              aria-label="Abrir no Google Flights"
            >
              <span>Ver Voo</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </Tooltip>

          {/* Gráfico & Histórico */}
          <Tooltip content="Ver histórico de preços e gráfico">
            <button
              onClick={() => onViewHistory(route)}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs cursor-pointer"
              aria-label="Ver histórico de preços e gráfico"
            >
              <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Histórico</span>
            </button>
          </Tooltip>

          {/* Menu de Mais Ações (...) */}
          <div className="relative" ref={menuRef}>
            <Tooltip content="Mais opções">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-xl text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                aria-label="Mais opções"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </Tooltip>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 py-1.5 text-xs animate-fadeIn">
                <button
                  onClick={handleBackfillHistory}
                  disabled={isBackfilling}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium disabled:opacity-40 cursor-pointer"
                >
                  <History className={`w-3.5 h-3.5 text-indigo-600 ${isBackfilling ? "animate-spin" : ""}`} />
                  <span>{isBackfilling ? "Importando..." : "Importar histórico (30d)"}</span>
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleActive(route.id, route.isActive);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  {route.isActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pausar monitoramento</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Retomar monitoramento</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onEdit(route);
                  }}
                  className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Editar parâmetros</span>
                </button>

                <div className="my-1 border-t border-slate-100" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(route.id);
                  }}
                  className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir rota</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner de Feedback Interno */}
      {feedback && (
        <div className="mt-3 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200/80 text-xs text-sky-900 font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
