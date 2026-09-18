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
  Clock,
  Sparkles,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import { getAirportName, getGoogleFlightsUrl } from "@/lib/utils";
import AirlineBadge from "@/components/AirlineBadge";
import Tooltip from "@/components/Tooltip";
import { useTranslation } from "@/lib/i18n/context";

interface RouteCardProps {
  route: MonitoredRoute;
  onEdit: (route: MonitoredRoute) => void;
  onDelete: (id: number) => void;
  onToggleActive: (id: number, currentActive: boolean) => void;
  onViewHistory: (route: MonitoredRoute) => void;
  onViewLiveResults?: (route: MonitoredRoute, options: FlightOption[]) => void;
  onRefreshList: () => void;
  isInsideGroup?: boolean;
}

export default function RouteCard({
  route,
  onEdit,
  onDelete,
  onToggleActive,
  onViewHistory,
  onViewLiveResults,
  onRefreshList,
  isInsideGroup = false,
}: RouteCardProps) {
  const { t, formatCurrency, formatUsdEstimate, formatDate, formatRelativeTime, locale } = useTranslation();
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
        setFeedback(
          locale === "en"
            ? "Price updated successfully!"
            : "Cotação atualizada com sucesso!"
        );
        onRefreshList();
        if (json.data?.foundOptions && onViewLiveResults) {
          onViewLiveResults(route, json.data.foundOptions);
        }
      } else {
        setFeedback(
          `${locale === "en" ? "Error:" : "Erro:"} ${json.error || t.toasts.searchFailed}`
        );
      }
    } catch (err: any) {
      setFeedback(`${locale === "en" ? "Error:" : "Erro:"} ${err.message}`);
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
        setFeedback(
          locale === "en"
            ? `30-day historical data simulated! (${json.inserted} entries created)`
            : `Histórico de 30 dias gerado! (${json.inserted} registros criados)`
        );
        onRefreshList();
      } else {
        setFeedback(
          `${locale === "en" ? "Error:" : "Erro:"} ${json.error || t.history.backfillError}`
        );
      }
    } catch (err: any) {
      setFeedback(`${locale === "en" ? "Error:" : "Erro:"} ${err.message}`);
    } finally {
      setIsBackfilling(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const currentPrice = route.latestPrice;
  const target = route.targetPrice;
  const hasPrice = currentPrice !== null && currentPrice !== undefined;
  const isBelowLimit = hasPrice && currentPrice <= target;
  const diff = hasPrice ? target - currentPrice : 0;

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
      className={`relative p-4 sm:p-5 rounded-2xl border bg-white shadow-2xs transition-all hover:shadow-md ${
        isMenuOpen ? "z-30" : "z-0"
      } ${
        !route.isActive
          ? "opacity-60 border-slate-200 bg-slate-50/40"
          : isBelowLimit
          ? "border-emerald-300 ring-1 ring-emerald-400/20 bg-emerald-50/5"
          : "border-slate-200/90"
      }`}
    >
      {/* Top Bar: Status / Delta Chip on Left (+ standalone Route Code if not in group) */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {!isInsideGroup && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono font-black mr-1">
              <span>{route.origin}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span>{route.destination}</span>
            </div>
          )}

          {/* Status / Delta Chip on Top Left */}
          {!hasPrice ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" />
              <span>{t.dashboard.table.pendingScan}</span>
            </span>
          ) : isBelowLimit ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>
                -{formatCurrency(diff)} {t.dashboard.table.targetMet.toLowerCase()}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
              <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
              <span>
                +{formatCurrency(currentPrice - target)} {t.dashboard.table.aboveTargetDiff}
              </span>
            </span>
          )}
        </div>

        {!route.isActive && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            {t.common.paused}
          </span>
        )}
      </div>

      {/* Main Row: Metadata (Left), Prices (Center), CTAs & Time (Right) in ONE PERFECT HORIZONTAL AXIS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
        {/* Left: Metadata (Date, Airline, Flight Number, Passengers) */}
        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap shrink-0">
          {/* Flight Date */}
          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span>{formatDate(route.flightDate)}</span>
          </span>

          {/* Airline */}
          <AirlineBadge airline={route.lastAirline} size="sm" />

          {/* Flight Number */}
          {route.lastFlightNumber && (
            <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
              {route.lastFlightNumber}
            </span>
          )}

          {/* Passengers */}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>
              {route.passengers || 1}{" "}
              {(route.passengers || 1) === 1 ? t.routes.adult : t.routes.adults}
            </span>
          </span>
        </div>

        {/* Center: Price & Target in pure single row */}
        <div className="flex items-baseline gap-2.5 flex-wrap shrink-0">
          {/* Current Price (Hero) */}
          <span
            className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
              hasPrice
                ? isBelowLimit
                  ? "text-emerald-600"
                  : "text-slate-900"
                : "text-slate-400"
            }`}
          >
            {hasPrice ? formatCurrency(currentPrice) : "—"}
          </span>

          {/* Target Price Reference & USD estimate */}
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
            <span>{t.common.target}:</span>
            <strong className="text-slate-700 font-bold tabular-nums">{formatCurrency(target)}</strong>
            {locale === "en" && hasPrice && (
              <span className="text-slate-400 font-normal ml-1">
                ({formatUsdEstimate(currentPrice)})
              </span>
            )}
          </div>
        </div>

        {/* Right Side: Last Checked Time + Unified Blue CTAs */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Last Checked Time */}
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1 whitespace-nowrap">
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>
              {route.lastSearchedAt ? formatRelativeTime(route.lastSearchedAt) : t.dashboard.table.pendingScan}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Primary Action: View Flight (Solid Blue & Contrast) */}
            <Tooltip content={t.routes.cardViewFlightTooltip}>
              <a
                href={flightUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 border border-transparent transition-all shadow-xs hover:shadow-md cursor-pointer whitespace-nowrap shrink-0"
                aria-label={t.routes.cardViewFlightTooltip}
              >
                <span>{t.common.viewFlight}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Tooltip>

            {/* Secondary: Refresh / Scan */}
            <Tooltip content={t.routes.cardSearchTooltip}>
              <button
                onClick={handleSearchNow}
                disabled={isSearching || !route.isActive}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-700 border border-sky-100 transition-all cursor-pointer disabled:opacity-40 shrink-0"
                aria-label={t.routes.cardSearchTooltip}
              >
                <RefreshCw className={`w-4 h-4 ${isSearching ? "animate-spin text-sky-600" : ""}`} />
              </button>
            </Tooltip>

            {/* Secondary: Price History */}
            <Tooltip content={t.routes.cardHistoryTooltip}>
              <button
                onClick={() => onViewHistory(route)}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-700 border border-sky-100 transition-all cursor-pointer shrink-0"
                aria-label={t.routes.cardHistoryTooltip}
              >
                <BarChart2 className="w-4 h-4 text-sky-600" />
              </button>
            </Tooltip>

            {/* More Options Dropdown */}
            <div className="relative flex items-center shrink-0" ref={menuRef}>
              <Tooltip content={locale === "en" ? "More options" : "Mais opções"}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-700 border border-sky-100 transition-all cursor-pointer shrink-0"
                  aria-label="More options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </Tooltip>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-1.5 text-xs animate-fadeIn">
                  <button
                    onClick={handleBackfillHistory}
                    disabled={isBackfilling}
                    className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium disabled:opacity-40 cursor-pointer"
                  >
                    <History className={`w-3.5 h-3.5 text-sky-600 ${isBackfilling ? "animate-spin" : ""}`} />
                    <span>{isBackfilling ? t.history.importing : t.history.import30d}</span>
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
                        <span>{locale === "en" ? "Pause monitoring" : "Pausar monitoramento"}</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{locale === "en" ? "Resume monitoring" : "Retomar monitoramento"}</span>
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
                    <span>{t.modal.editRouteTitle}</span>
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
                    <span>{t.modal.deleteButton}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Internal Feedback Banner */}
      {feedback && (
        <div className="mt-3 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200/80 text-xs text-sky-900 font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
}
