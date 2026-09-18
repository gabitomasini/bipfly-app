"use client";

import { useState, useMemo } from "react";
import { X, Clock, CheckCircle2, ExternalLink, Plane, Layers, Sparkles } from "lucide-react";
import { FlightOption, MonitoredRoute } from "@/lib/types";
import { formatDuration, getAirportName, getGoogleFlightsUrl } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useModalBehavior } from "@/hooks/useModalBehavior";

interface FlightSearchResultsDrawerProps {
  isOpen: boolean;
  route: MonitoredRoute | null;
  options: FlightOption[];
  onClose: () => void;
}

export default function FlightSearchResultsDrawer({
  isOpen,
  route,
  options,
  onClose,
}: FlightSearchResultsDrawerProps) {
  const { t, formatCurrency, formatUsdEstimate, formatDate, locale } = useTranslation();
  const [filterType, setFilterType] = useState<"all" | "direct" | "stops">("all");
  const { overlayProps, containerRef } = useModalBehavior({
    isOpen,
    onClose,
  });

  const directOptions = useMemo(
    () => options.filter((o) => (o.stops ?? 0) === 0).sort((a, b) => a.price - b.price),
    [options]
  );
  const stopsOptions = useMemo(
    () => options.filter((o) => (o.stops ?? 0) > 0).sort((a, b) => a.price - b.price),
    [options]
  );

  const bestDirect = directOptions[0] || null;
  const bestWithStops = stopsOptions[0] || null;

  const displayedOptions = useMemo(() => {
    if (filterType === "direct") return directOptions;
    if (filterType === "stops") return stopsOptions;
    return options;
  }, [filterType, directOptions, stopsOptions, options]);

  if (!isOpen || !route) return null;

  const origin = route.origin;
  const destination = route.destination;
  const flightDate = route.flightDate;
  const targetPrice = route.targetPrice;
  const passengers = route.passengers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn" {...overlayProps} role="dialog" aria-modal="true" aria-labelledby="flight-results-title">
      <div ref={containerRef} className="glass-panel w-full max-w-2xl max-h-[88vh] flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-lg">
                {origin} → {destination}
              </span>
              <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-bold">
                {formatDate(flightDate)}
                {route.tripType === "round_trip" && route.returnDate && ` → ${formatDate(route.returnDate)}`}
              </span>
              {route.tripType === "round_trip" && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md">
                  🔁 {t.modal?.roundTrip || (locale === "en" ? "Round Trip" : "Ida e Volta")}
                </span>
              )}
              {route.onlyDirect && (
                <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-md">
                  {locale === "en" ? "Direct only" : "Apenas direto"}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {getAirportName(origin)} {locale === "en" ? "to" : "para"} {getAirportName(destination)} • {t.history.targetLabel}{" "}
              <strong className="text-amber-700 font-bold">{formatCurrency(targetPrice)}</strong>
              {locale === "en" && (
                <span className="text-slate-400 font-normal ml-1">
                  ({formatUsdEstimate(targetPrice)})
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Highlight Cards: Best Direct vs Lowest with Stops */}
        {options.length > 0 && (
          <div className="p-4 pb-0 bg-slate-50/40 border-b border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Best Direct Flight */}
              <div className={`p-3 rounded-xl border ${bestDirect ? "bg-white border-emerald-200 shadow-2xs" : "bg-slate-50 border-slate-200/70 opacity-60"}`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Plane className="w-3.5 h-3.5" />
                    <span>{t.flightDrawer.bestDirect}</span>
                  </span>
                  {bestDirect && bestDirect.price <= targetPrice && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      {t.dashboard.table.targetMet}
                    </span>
                  )}
                </div>
                {bestDirect ? (
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-base font-black text-slate-900 tabular-nums">
                        {formatCurrency(bestDirect.price)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block truncate">
                        {bestDirect.airline} {bestDirect.flightNumber ? `• ${bestDirect.flightNumber}` : ""}
                      </span>
                    </div>
                    {bestDirect.durationMinutes && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDuration(bestDirect.durationMinutes)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {locale === "en" ? "No direct flights found" : "Nenhum voo direto encontrado"}
                  </span>
                )}
              </div>

              {/* Lowest with Stops */}
              <div className={`p-3 rounded-xl border ${bestWithStops ? "bg-white border-sky-200 shadow-2xs" : "bg-slate-50 border-slate-200/70 opacity-60"}`}>
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-700 mb-1">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{t.flightDrawer.bestWithStops}</span>
                  </span>
                  {bestWithStops && bestWithStops.price <= targetPrice && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      {t.dashboard.table.targetMet}
                    </span>
                  )}
                </div>
                {bestWithStops ? (
                  <div className="flex items-baseline justify-between mt-1">
                    <div>
                      <span className="text-base font-black text-slate-900 tabular-nums">
                        {formatCurrency(bestWithStops.price)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium block truncate">
                        {bestWithStops.airline} ({bestWithStops.stops === 1 ? (locale === "en" ? "1 stop" : "1 parada") : `${bestWithStops.stops} ${locale === "en" ? "stops" : "paradas"}`})
                      </span>
                    </div>
                    {bestWithStops.durationMinutes && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {formatDuration(bestWithStops.durationMinutes)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">
                    {locale === "en" ? "No flights with stops" : "Nenhum voo c/ escala"}
                  </span>
                )}
              </div>
            </div>

            {/* Filter Tabs if multiple options exist */}
            {options.length > 1 && (
              <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-100 text-xs">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === "all"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {t.flightDrawer.allOptions} ({options.length})
                </button>
                {directOptions.length > 0 && (
                  <button
                    onClick={() => setFilterType("direct")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterType === "direct"
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {t.flightDrawer.directOptions} ({directOptions.length})
                  </button>
                )}
                {stopsOptions.length > 0 && (
                  <button
                    onClick={() => setFilterType("stops")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      filterType === "stops"
                        ? "bg-sky-600 text-white shadow-2xs"
                        : "text-sky-700 hover:bg-sky-50"
                    }`}
                  >
                    {t.flightDrawer.stopsOptions} ({stopsOptions.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Lista de Opções de Voos */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {displayedOptions.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {t.common.noResults}
            </div>
          ) : (
            displayedOptions.map((opt, idx) => {
              const optId = `${opt.airline || "flight"}-${opt.flightNumber || idx}-${idx}`;
              const airline = opt.airline;
              const flightNumber = opt.flightNumber;
              const optPrice = opt.price;
              const isBelow = optPrice <= targetPrice;
              const departureTime = opt.departureTime;
              const arrivalTime = opt.arrivalTime;
              const durationMinutes = opt.durationMinutes;
              const stops = opt.stops;
              const bookingLink =
                opt.bookingLink ||
                getGoogleFlightsUrl(origin, destination, flightDate, passengers, route.returnDate, route.tripType, route.children || 0, route.infantsInLap || 0);

              return (
                <div
                  key={optId}
                  className={`p-4 rounded-xl border transition-all ${
                    isBelow
                      ? "bg-emerald-50/50 border-emerald-200 hover:border-emerald-300"
                      : "bg-slate-50/50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Cia e Voo */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {airline}
                        </span>
                        {flightNumber && (
                          <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {flightNumber}
                          </span>
                        )}
                      </div>

                      {/* Times & Stops */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 font-medium">
                        {(departureTime || arrivalTime) && (
                          <div className="flex items-center gap-1.5 font-mono text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-sky-600" />
                            <span>
                              {departureTime || "--:--"} → {arrivalTime || "--:--"}
                            </span>
                          </div>
                        )}

                        {durationMinutes && (
                          <span className="text-slate-500">
                            {formatDuration(durationMinutes)}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            stops === 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {stops === 0 ? (locale === "en" ? "Direct" : "Voo Direto") : `${stops} ${locale === "en" ? (stops === 1 ? "stop" : "stops") : (stops === 1 ? "parada" : "paradas")}`}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botão */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60">
                      <div className="text-left sm:text-right">
                        <span
                          className={`text-base font-black tracking-tight ${
                            isBelow ? "text-emerald-600" : "text-slate-900"
                          }`}
                        >
                          {formatCurrency(optPrice)}
                        </span>
                        {locale === "en" && (
                          <span className="text-xs font-semibold text-slate-400 block -mt-0.5">
                            ({formatUsdEstimate(optPrice, "~")})
                          </span>
                        )}
                        {isBelow && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 justify-start sm:justify-end mt-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            {t.dashboard.table.targetMet}
                          </span>
                        )}
                      </div>

                      <a
                        href={bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        <span>{locale === "en" ? "View" : "Ver"}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  );
}
