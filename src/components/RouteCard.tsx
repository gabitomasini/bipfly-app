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
  Sparkles,
  Users,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { MonitoredRoute, FlightOption } from "@/lib/types";
import { getGoogleFlightsUrl } from "@/lib/utils";
import AirlineBadge from "@/components/AirlineBadge";
import Tooltip from "@/components/Tooltip";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/context";
import { useScanning } from "@/context/ScanningContext";

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
  const { t, formatCurrency, formatUsdEstimate, formatDate, formatDateTime, locale } = useTranslation();
  const { isScanning, activeRouteId, startCustomScan, endCustomScan } = useScanning();
  const [isSearching, setIsSearching] = useState(false);
  const isCardSearching = isSearching || (isScanning && (activeRouteId === route.id || activeRouteId === null));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUnpauseConfirmOpen, setIsUnpauseConfirmOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
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

  const executeSearch = async () => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/scraper/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: route.origin,
          destination: route.destination,
          date: route.flightDate,
          returnDate: route.returnDate || undefined,
          tripType: route.tripType || (route.returnDate ? "round_trip" : "one_way"),
          passengers: route.passengers || 1,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.options && data.options.length > 0 && onViewLiveResults) {
          onViewLiveResults(route, data.options);
        } else {
          setFeedback(
            locale === "en"
              ? "Price updated successfully!"
              : "Cotação atualizada com sucesso!"
          );
          setTimeout(() => setFeedback(null), 4000);
        }
        onRefreshList();
      } else {
        setFeedback(
          data.error ||
            (locale === "en"
              ? "Failed to check flight prices."
              : "Erro ao buscar cotação.")
        );
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      setFeedback(
        locale === "en"
          ? "Failed to check flight prices."
          : "Erro ao buscar cotação."
      );
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    if (!route.isActive) {
      setIsUnpauseConfirmOpen(true);
    } else {
      executeSearch();
    }
  };

  const handleConfirmUnpauseAndSearch = async () => {
    setIsUnpauseConfirmOpen(false);
    try {
      await fetch(`/api/routes/${route.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true, ativo: true }),
      });
      onRefreshList();
    } catch (err) {
      console.error("Error unpausing route:", err);
    }
    executeSearch();
  };

  const handleBackfillHistory = async () => {
    setIsBackfilling(true);
    setIsMenuOpen(false);
    setFeedback(null);
    const routeLabel = `${route.origin} → ${route.destination}`;
    const scanTitle = locale === "en"
      ? "Importing 30-Day Price History"
      : "Importando Histórico de 30 Dias";
    const scanSub = `${routeLabel} • Google Flights`;
    startCustomScan(scanTitle, scanSub, route.id);
    try {
      const res = await fetch(`/api/routes/${route.id}/backfill`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        endCustomScan(true);
        setFeedback(
          locale === "en"
            ? "30-day historical data imported successfully!"
            : "Histórico de 30 dias importado com sucesso!"
        );
        setTimeout(() => setFeedback(null), 4000);
        onRefreshList();
      } else {
        endCustomScan(false);
        setFeedback(
          data.error ||
            (locale === "en"
              ? "Failed to import historical data."
              : "Erro ao importar histórico.")
        );
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {
      endCustomScan(false);
      setFeedback(
        locale === "en"
          ? "Failed to import historical data."
          : "Erro ao importar histórico."
      );
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsBackfilling(false);
    }
  };

  const currentPrice = route.latestPrice;
  const target = route.targetPrice;
  const hasPrice = currentPrice !== null && currentPrice !== undefined;
  const isBelowLimit = hasPrice && currentPrice <= target;
  const diff = hasPrice ? target - currentPrice : 0;

  const isRoundTrip = route.tripType === "round_trip" || Boolean(route.returnDate);

  let durationDays: number | null = null;
  if (route.returnDate && route.flightDate) {
    const d1 = new Date(route.flightDate);
    const d2 = new Date(route.returnDate);
    const diffTime = d2.getTime() - d1.getTime();
    if (diffTime >= 0) {
      durationDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  const flightUrl =
    route.lastBookingLink ||
    getGoogleFlightsUrl(
      route.origin,
      route.destination,
      route.flightDate,
      route.passengers || 1,
      route.returnDate,
      route.tripType,
      route.children || 0,
      route.infantsInLap || 0
    );

  const totalPax = (route.passengers || 1) + (route.children || 0) + (route.infantsInLap || 0);

  return (
    <div
      className={`relative p-3.5 sm:px-5 sm:py-4 rounded-2xl border transition-all hover:shadow-md ${
        isMenuOpen ? "z-30" : "z-0"
      } ${
        !route.isActive
          ? "border-slate-200/90 bg-slate-50/75 shadow-none"
          : isBelowLimit
          ? "border-[#2ab85e]/50 border-l-4 border-l-[#2ab85e] bg-white shadow-2xs"
          : "border-slate-200/90 bg-white shadow-2xs"
      }`}
    >
      {/* LINHA RESPONSIVA FLEXÍVEL */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4">
        {/* Bloco de Informações do Voo + Preço Agrupados com espaçamento equilibrado */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 lg:gap-6 min-w-0 flex-1">
          {/* Dados do Voo: GRU → CWB (se simples) • Data • LATAM • 1 Adult */}
          <div
            className={`flex items-center gap-2 sm:gap-3 text-xs flex-wrap min-w-0 ${
              !route.isActive ? "opacity-75" : "text-slate-600"
            }`}
          >
            {!isInsideGroup && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-200 text-xs font-mono font-black shadow-2xs shrink-0">
                <span>{route.origin}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{route.destination}</span>
              </div>
            )}

            {/* Flight Date & Trip Type */}
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 text-xs sm:text-sm shrink-0">
              <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
              {isRoundTrip && route.returnDate ? (
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/80">
                    {t.routes.roundTrip}
                  </span>
                  <span>{formatDate(route.flightDate)} → {formatDate(route.returnDate)}</span>
                  {durationDays !== null && (
                    <span className="text-xs text-slate-400 font-semibold">
                      ({durationDays} {durationDays === 1 ? t.routes.day : t.routes.days})
                    </span>
                  )}
                </span>
              ) : (
                <span>{formatDate(route.flightDate)}</span>
              )}
            </span>

            {/* Airline Badge */}
            <AirlineBadge airline={route.lastAirline} size="sm" />

            {/* Flight Number */}
            {route.lastFlightNumber && (
              <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 shrink-0">
                {route.lastFlightNumber}
              </span>
            )}

            {/* Passengers */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 shrink-0">
              <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {route.passengers || 1}{" "}
                {(route.passengers || 1) === 1 ? t.routes.adult : t.routes.adults}
                {Boolean(route.children) && `, ${route.children} ${route.children === 1 ? t.routes.child : t.routes.children}`}
                {Boolean(route.infantsInLap) && `, ${route.infantsInLap} ${route.infantsInLap === 1 ? t.routes.infantInLap : t.routes.infantsInLap}`}
              </span>
            </span>

            {/* Paused status badge (apenas no modo agrupado) */}
            {isInsideGroup && !route.isActive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs shrink-0">
                <Pause className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                <span>{t.common.paused}</span>
              </span>
            )}
          </div>

          {/* Preço com espaçamento dedicado e sem ficar espremido */}
          <div className="flex items-center gap-2 shrink-0 py-0.5 sm:pl-2">
            <div className={`flex flex-col ${!route.isActive ? "opacity-75" : ""}`}>
              {hasPrice ? (
                <div className="flex items-baseline gap-1.5 flex-nowrap">
                  <span
                    className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none ${
                      !route.isActive
                        ? "text-slate-400"
                        : isBelowLimit
                        ? "text-emerald-600"
                        : "text-slate-900"
                    }`}
                  >
                    {formatCurrency(currentPrice)}
                  </span>

                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                    {t.routes.perPersonSuffix || "/ pess."}
                  </span>

                  {locale === "en" && (
                    <span className="text-xs text-slate-400 font-normal whitespace-nowrap">
                      ({formatUsdEstimate(currentPrice, "~")})
                    </span>
                  )}
                </div>
              ) : route.lastError ? (
                <div className="flex flex-col">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs whitespace-nowrap">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{locale === "en" ? "No flights available" : "Sem vôos no trecho"}</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl sm:text-2xl font-black tracking-tight tabular-nums leading-none text-slate-400">
                    —
                  </span>
                </div>
              )}

              {totalPax > 1 && hasPrice && (
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {locale === "en" ? "Total: " : "Total: "}
                  {formatCurrency(currentPrice * totalPax)}
                </span>
              )}
            </div>

            {/* Hint de Alerta / Status no modo lista */}
            {!isInsideGroup && (
              <Tooltip
                className="translate-y-[1.5px]"
                content={
                  !route.isActive ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        {locale === "en"
                          ? `Monitoring paused on ${formatDateTime(route.updatedAt)}`
                          : `Monitoramento pausado em ${formatDateTime(route.updatedAt)}`}
                      </span>
                    </div>
                  ) : !hasPrice ? (
                    route.lastError ? (
                      <div className="flex items-start gap-1.5 text-[11px] max-w-xs text-left">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{route.lastError}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{t.dashboard.table.pendingScan}</span>
                      </div>
                    )
                  ) : isBelowLimit ? (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        {t.common.target}: {formatCurrency(target)} {t.routes.perPersonSuffix || "/ pess."} (-{formatCurrency(diff)}{" "}
                        {locale === "en" ? "target met" : "no alvo"})
                        {totalPax > 1 && ` • Total: ${formatCurrency(currentPrice * totalPax)}`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>
                        {t.common.target}: {formatCurrency(target)} {t.routes.perPersonSuffix || "/ pess."} (+{formatCurrency(currentPrice - target)}{" "}
                        {locale === "en" ? "above target" : "acima da meta"})
                        {totalPax > 1 && ` • Total: ${formatCurrency(currentPrice * totalPax)}`}
                      </span>
                    </div>
                  )
                }
              >
                <div
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full cursor-help transition-all hover:scale-110 shadow-2xs ${
                    !route.isActive
                      ? "bg-amber-50 text-amber-600 border border-amber-200"
                      : !hasPrice
                      ? route.lastError
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : "bg-amber-50 text-amber-600 border border-amber-200"
                      : isBelowLimit
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-rose-50 text-rose-600 border border-rose-200/80"
                  }`}
                  aria-label="Status alert"
                >
                  {!route.isActive ? (
                    <Pause className="w-3 h-3 text-amber-600" />
                  ) : !hasPrice ? (
                    route.lastError ? (
                      <AlertTriangle className="w-3 h-3 text-amber-700" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )
                  ) : isBelowLimit ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-rose-600" />
                  )}
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Action Buttons (Mantidos exatamente iguais no desktop) */}
        <div className="flex items-center gap-1.5 shrink-0 xl:ml-auto pt-2 sm:pt-0 border-t border-slate-100 sm:border-0 w-full sm:w-auto justify-between sm:justify-end">
            {/* Primary Action: View Flight */}
            <Tooltip content={t.routes.cardViewFlightTooltip}>
              <a
                href={flightUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-bold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  !route.isActive
                    ? "bg-slate-100 text-slate-400 hover:bg-slate-200/70 hover:text-slate-600 border-slate-200/70 shadow-none"
                    : "text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 border-transparent shadow-xs hover:shadow-md"
                }`}
                aria-label={t.routes.cardViewFlightTooltip}
              >
                <span>{t.common.viewFlight}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Tooltip>

            {/* Secondary: Refresh / Scan */}
            <Tooltip content={t.routes.cardSearchTooltip}>
              <button
                onClick={handleSearchClick}
                disabled={isCardSearching}
                className="inline-flex items-center justify-center h-9 w-9 rounded-xl text-sky-600 bg-sky-50 hover:bg-sky-100 hover:text-sky-700 border border-sky-100 transition-all cursor-pointer disabled:opacity-40 shrink-0"
                aria-label={t.routes.cardSearchTooltip}
              >
                <RefreshCw className={`w-4 h-4 ${isCardSearching ? "animate-spin text-sky-600" : ""}`} />
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

      {/* Internal Feedback Banner */}
      {feedback && (
        <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-sky-50 border border-sky-200/80 text-xs text-sky-900 font-semibold flex items-center gap-2 animate-fadeIn">
          <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Warning Notice for Routes with No Flights Available */}
      {!hasPrice && route.lastError && (
        <div className="mt-2.5 px-3.5 py-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <p className="font-bold text-amber-900 leading-tight">
              {locale === "en" ? "Flight Route Notice:" : "Aviso sobre a rota:"}
            </p>
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
              {route.lastError}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal to Unpause & Search */}
      <ConfirmDialog
        isOpen={isUnpauseConfirmOpen}
        onConfirm={handleConfirmUnpauseAndSearch}
        onCancel={() => setIsUnpauseConfirmOpen(false)}
        title={
          locale === "en"
            ? "Resume Monitoring & Check Prices?"
            : "Reativar Monitoramento e Buscar Preços?"
        }
        message={
          locale === "en"
            ? "This route is currently paused. Searching now will automatically resume active monitoring for this flight."
            : "Esta rota está atualmente pausada. Buscar agora irá reativar o monitoramento automático deste voo."
        }
        confirmLabel={
          locale === "en" ? "Resume & Search" : "Reativar e Buscar"
        }
        confirmIcon={<RefreshCw className="w-3.5 h-3.5 shrink-0" />}
        cancelLabel={locale === "en" ? "Cancel" : "Cancelar"}
        variant="default"
      />
    </div>
  );
}
