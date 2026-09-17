"use client";

import { X, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { FlightOption, MonitoredRoute } from "@/lib/types";
import { formatCurrency, formatDuration, getAirportName, getGoogleFlightsUrl } from "@/lib/utils";
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
      <div ref={containerRef} className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-lg">
                {origin} → {destination}
              </span>
              <span className="text-xs text-sky-800 bg-sky-100 border border-sky-200 px-2 py-0.5 rounded-md font-mono font-bold">
                {flightDate}
              </span>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              {getAirportName(origin)} para {getAirportName(destination)} • Meta:{" "}
              <strong className="text-amber-700 font-bold">{formatCurrency(targetPrice)}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Fechar resultados"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>{options.length} opção(ões) encontrada(s) no Google Flights</span>
            <span>Ordenado por menor preço</span>
          </div>

          {options.length === 0 ? (
            <div className="text-center py-10 text-slate-500 font-medium">
              Nenhuma oferta encontrada para os critérios informados.
            </div>
          ) : (
            options.map((opt, idx) => {
              const optPrice = opt.price;
              const isBelow = optPrice <= targetPrice;
              const airline = opt.airline;
              const flightNumber = opt.flightNumber;
              const departureTime = opt.departureTime;
              const arrivalTime = opt.arrivalTime;
              const durationMinutes = opt.durationMinutes;
              const stops = opt.stops ?? 0;
              const bookingLink =
                opt.bookingLink ||
                getGoogleFlightsUrl(
                  opt.origin || origin,
                  opt.destination || destination,
                  opt.flightDate || flightDate,
                  passengers
                );

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border transition-all ${
                    idx === 0
                      ? isBelow
                        ? "bg-emerald-50/60 border-emerald-300 shadow-xs"
                        : "bg-sky-50/60 border-sky-300 shadow-xs"
                      : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Airline & Flight Details */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">
                          {airline || "Companhia Aérea"}
                        </span>
                        {flightNumber && (
                          <span className="text-xs text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded font-mono font-medium">
                            {flightNumber}
                          </span>
                        )}
                        {idx === 0 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            Mais Barato
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
                          {stops === 0 ? "Voo Direto" : `${stops} parada(s)`}
                        </span>
                      </div>
                    </div>

                    {/* Preço e Botão de Compra */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <div>
                        <span className="text-xl font-extrabold text-slate-900 block">
                          {formatCurrency(optPrice)}
                        </span>
                        {isBelow ? (
                          <span className="text-xs font-bold text-emerald-700 flex items-center justify-end gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Abaixo da meta
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 mt-0.5 block font-medium">
                            {formatCurrency(optPrice - targetPrice)} acima
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
                        <span>Comprar Voo</span>
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
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}


