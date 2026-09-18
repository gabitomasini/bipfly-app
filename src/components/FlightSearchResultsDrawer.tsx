"use client";

import { X, Clock, CheckCircle2, ExternalLink } from "lucide-react";
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
  const { overlayProps, containerRef } = useModalBehavior({
    isOpen,
    onClose,
  });

  if (!isOpen || !route) return null;

  const origin = route.origin;
  const destination = route.destination;
  const flightDate = route.flightDate;
  const targetPrice = route.targetPrice;
  const passengers = route.passengers;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn" {...overlayProps} role="dialog" aria-modal="true" aria-labelledby="flight-results-title">
      <div ref={containerRef} className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-lg">
                {origin} → {destination}
              </span>
              <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-bold">
                {formatDate(flightDate)}
              </span>
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

        {/* Lista de Opções de Voos */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {options.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              {t.common.noResults}
            </div>
          ) : (
            options.map((opt, idx) => {
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
                getGoogleFlightsUrl(origin, destination, flightDate, passengers);

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
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {stops === 0 ? (locale === "en" ? "Nonstop" : "Voo Direto") : `${stops} ${locale === "en" ? "stop(s)" : "parada(s)"}`}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botão de Compra */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div>
                        <span className="text-xl font-extrabold text-slate-900 block">
                          {formatCurrency(optPrice)}
                        </span>
                        {locale === "en" && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            {formatUsdEstimate(optPrice)}
                          </span>
                        )}
                        {isBelow ? (
                          <span className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {t.dashboard.table.targetMet}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                            +{formatCurrency(optPrice - targetPrice)} {locale === "en" ? "above target" : "acima"}
                          </span>
                        )}
                      </div>

                      <a
                        href={bookingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors cursor-pointer shadow-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{t.common.viewFlight}</span>
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
