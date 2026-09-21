"use client";

import { useState, useEffect } from "react";
import { X, Calendar, DollarSign, AlertCircle, Sparkles, Users, Plane, ArrowRight, RotateCcw } from "lucide-react";
import { MonitoredRoute } from "@/lib/types";
import AirportCombobox from "./AirportCombobox";
import CustomSelect from "./CustomSelect";
import CustomDatePicker from "./CustomDatePicker";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import { useScanning } from "@/context/ScanningContext";
import { BRL_TO_USD_RATE } from "@/lib/i18n/formatters";
import { formatCurrency } from "@/lib/utils";

interface RouteModalProps {
  isOpen: boolean;
  routeToEdit?: MonitoredRoute | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RouteModal({
  isOpen,
  routeToEdit,
  onClose,
  onSuccess,
}: RouteModalProps) {
  const { t, locale } = useTranslation();
  const { user, openAuthModal } = useAuth();
  const { scanSingleRoute } = useScanning();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [tripType, setTripType] = useState<"one_way" | "round_trip">("round_trip");
  const [flightDate, setFlightDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState(1); // adults
  const [children, setChildren] = useState(0);
  const [infantsInLap, setInfantsInLap] = useState(0);
  const [targetPrice, setTargetPrice] = useState("");
  const [onlyDirect, setOnlyDirect] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { overlayProps, containerRef } = useModalBehavior({ isOpen, onClose });

  useEffect(() => {
    if (routeToEdit) {
      setOrigin(routeToEdit.origin);
      setDestination(routeToEdit.destination);
      setFlightDate(routeToEdit.flightDate);
      setReturnDate(routeToEdit.returnDate || "");
      setTripType(routeToEdit.tripType || (routeToEdit.returnDate ? "round_trip" : "one_way"));
      setPassengers(routeToEdit.passengers || 1);
      setChildren(routeToEdit.children || 0);
      setInfantsInLap(routeToEdit.infantsInLap || 0);
      setOnlyDirect(Boolean(routeToEdit.onlyDirect));
      setTargetPrice(String(routeToEdit.targetPrice));
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 45);
      const isoDate = defaultDate.toISOString().split("T")[0];

      const returnDefault = new Date(defaultDate);
      returnDefault.setDate(returnDefault.getDate() + 12);
      const isoReturn = returnDefault.toISOString().split("T")[0];

      setOrigin("GRU");
      setDestination("MCO");
      setFlightDate(isoDate);
      setReturnDate(isoReturn);
      setTripType("round_trip");
      setPassengers(1);
      setChildren(0);
      setInfantsInLap(0);
      setOnlyDirect(false);
      setTargetPrice("2500");
    }
    setError(null);
  }, [routeToEdit, isOpen, locale]);

  if (!isOpen) return null;

  const numericInputPrice = parseFloat(targetPrice.replace(",", ".")) || 0;
  const usdEstimate = numericInputPrice > 0 ? Math.round(numericInputPrice * BRL_TO_USD_RATE) : 0;
  const usdRateFormatted = (1 / BRL_TO_USD_RATE).toFixed(2);
  const totalPassengers = passengers + children + infantsInLap;

  const handleAdultsChange = (delta: number) => {
    const newVal = Math.max(1, Math.min(9, passengers + delta));
    setPassengers(newVal);
    // Se diminuir adultos e bebês de colo exceder adultos, ajusta bebês
    if (infantsInLap > newVal) {
      setInfantsInLap(newVal);
    }
  };

  const handleChildrenChange = (delta: number) => {
    const newVal = Math.max(0, Math.min(8, children + delta));
    setChildren(newVal);
  };

  const handleInfantsChange = (delta: number) => {
    // Máx de bebês de colo = número de adultos
    const newVal = Math.max(0, Math.min(passengers, infantsInLap + delta));
    setInfantsInLap(newVal);
  };

  const getPassengerSummaryText = () => {
    const parts: string[] = [];
    parts.push(`${passengers} ${passengers === 1 ? t.routes.adult : t.routes.adults}`);
    if (children > 0) {
      parts.push(`${children} ${children === 1 ? t.routes.child : t.routes.children}`);
    }
    if (infantsInLap > 0) {
      parts.push(`${infantsInLap} ${infantsInLap === 1 ? t.routes.infantInLap : t.routes.infantsInLap}`);
    }
    return parts.join(", ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normOrigin = origin.trim().toUpperCase();
    const normDestination = destination.trim().toUpperCase();
    const parsedPrice = parseFloat(targetPrice.replace(",", "."));

    if (!normOrigin || normOrigin.length !== 3) {
      setError(
        locale === "en"
          ? "Please select a valid 3-letter origin airport code."
          : "Selecione um aeroporto de origem válido (sigla de 3 letras)."
      );
      return;
    }
    if (!normDestination || normDestination.length !== 3) {
      setError(
        locale === "en"
          ? "Please select a valid 3-letter destination airport code."
          : "Selecione um aeroporto de destino válido (sigla de 3 letras)."
      );
      return;
    }
    if (normOrigin === normDestination) {
      setError(
        locale === "en"
          ? "Origin and destination cannot be the same airport."
          : "Origem e destino não podem ser o mesmo aeroporto."
      );
      return;
    }
    if (!flightDate) {
      setError(t.modal.errorRequired);
      return;
    }
    if (tripType === "round_trip") {
      if (!returnDate) {
        setError(
          locale === "en"
            ? "Please select a return date for round-trip flights."
            : "Selecione uma data de retorno para viagens de ida e volta."
        );
        return;
      }
      if (returnDate < flightDate) {
        setError(t.modal.errorReturnBeforeDeparture);
        return;
      }
    }
    if (infantsInLap > passengers) {
      setError(t.modal.errorInfantsExceedAdults);
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError(t.modal.errorPriceInvalid);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        origin: normOrigin,
        destination: normDestination,
        flightDate,
        returnDate: tripType === "round_trip" ? returnDate : null,
        tripType,
        passengers: Number(passengers),
        children: Number(children),
        infantsInLap: Number(infantsInLap),
        targetPrice: parsedPrice,
        onlyDirect,
        isActive: routeToEdit ? routeToEdit.isActive !== false : true,
        locale,
      };

      // Se for criação e o usuário não estiver autenticado, abre o modal de progressive profiling
      if (!routeToEdit && !user) {
        setLoading(false);
        onClose();
        openAuthModal({
          mode: "progressive",
          routeDataToSave: payload,
          onSuccess: () => {
            onSuccess();
          },
        });
        return;
      }

      if (routeToEdit) {
        const res = await fetch(`/api/routes/${routeToEdit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to update route.");
        onSuccess();
        onClose();
        // Dispara busca atualizada em tempo real
        scanSingleRoute(routeToEdit.id, `${normOrigin} → ${normDestination}`).catch(() => {});
      } else {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          if (json.requiresAuth) {
            setLoading(false);
            onClose();
            openAuthModal({
              mode: "progressive",
              routeDataToSave: payload,
              onSuccess: () => {
                onSuccess();
              },
            });
            return;
          }
          throw new Error(json.error || "Failed to create route.");
        }

        onSuccess();
        onClose();
        // Dispara a busca imediata para encontrar o preço de agora
        if (json.data?.id) {
          scanSingleRoute(json.data.id, `${normOrigin} → ${normDestination}`).catch(() => {});
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn"
      {...overlayProps}
      role="dialog"
      aria-modal="true"
      aria-labelledby="route-modal-title"
    >
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-xl bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-scaleIn max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 id="route-modal-title" className="text-base font-bold text-slate-900">
              {routeToEdit ? t.modal.editRouteTitle : t.modal.newRouteTitle}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {routeToEdit ? t.modal.editRouteDesc : t.modal.newRouteDesc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label={t.common.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 overflow-y-auto overflow-x-hidden">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Trip Type Selector */}
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">
              {t.modal.tripTypeLabel}
            </label>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setTripType("round_trip");
                  if (!returnDate && flightDate) {
                    const d = new Date(flightDate);
                    d.setDate(d.getDate() + 10);
                    setReturnDate(d.toISOString().split("T")[0]);
                  }
                }}
                className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  tripType === "round_trip"
                    ? "bg-white text-sky-700 shadow-xs ring-1 ring-sky-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-600" />
                <span>{t.modal.roundTrip}</span>
              </button>
              <button
                type="button"
                onClick={() => setTripType("one_way")}
                className={`py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                  tripType === "one_way"
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5 text-sky-600" />
                <span>{t.modal.oneWay}</span>
              </button>
            </div>
          </div>

          {/* 2. Origin and Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-40">
            <AirportCombobox
              label={t.modal.originLabel}
              value={origin}
              onChange={setOrigin}
              placeholder={locale === "en" ? "Origin (e.g. JFK, London, GRU)" : "Origem (ex: São Paulo, GRU)"}
            />

            <AirportCombobox
              label={t.modal.destinationLabel}
              value={destination}
              onChange={setDestination}
              placeholder={locale === "en" ? "Destination (e.g. Rome, MIA, FCO)" : "Destino (ex: Roma, MIA, FCO)"}
            />
          </div>

          {/* 3. Dates */}
          <div className={`grid ${tripType === "round_trip" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"} gap-3.5 items-start relative z-30`}>
            {/* Departure Date */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>{tripType === "round_trip" ? t.modal.departureDateLabel : t.common.date}</span>
              </label>
              <CustomDatePicker
                value={flightDate}
                minDate={new Date().toISOString().split("T")[0]}
                onChange={(newVal) => {
                  setFlightDate(newVal);
                  if (tripType === "round_trip" && returnDate && returnDate < newVal) {
                    const retD = new Date(newVal);
                    retD.setDate(retD.getDate() + 10);
                    setReturnDate(retD.toISOString().split("T")[0]);
                  }
                }}
                accentColor="sky"
                align="left"
                required
              />
            </div>

            {/* Return Date (Only when Round-Trip) */}
            {tripType === "round_trip" && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{t.modal.returnDateLabel}</span>
                </label>
                <CustomDatePicker
                  value={returnDate}
                  minDate={flightDate || new Date().toISOString().split("T")[0]}
                  onChange={setReturnDate}
                  accentColor="indigo"
                  align="right"
                  required
                />
              </div>
            )}
          </div>

          {/* 4. Passageiros (Adultos, Crianças, Bebês de Colo) - Steppers Modernos */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200 relative z-20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t.modal.passengersLabel}</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                {getPassengerSummaryText()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Adultos (12+ anos) */}
              <div className="flex items-center justify-between sm:flex-col sm:items-stretch p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs gap-2">
                <div>
                  <span className="block text-xs font-bold text-slate-900">{t.modal.adultsTitle}</span>
                  <span className="block text-[10px] text-slate-500 font-medium">{t.modal.adultsSubtitle}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleAdultsChange(-1)}
                    disabled={passengers <= 1}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-black text-slate-900 text-sm w-4 text-center tabular-nums">
                    {passengers}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdultsChange(1)}
                    disabled={totalPassengers >= 9}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Crianças (2-11 anos) */}
              <div className="flex items-center justify-between sm:flex-col sm:items-stretch p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs gap-2">
                <div>
                  <span className="block text-xs font-bold text-slate-900">{t.modal.childrenTitle}</span>
                  <span className="block text-[10px] text-slate-500 font-medium">{t.modal.childrenSubtitle}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleChildrenChange(-1)}
                    disabled={children <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-black text-slate-900 text-sm w-4 text-center tabular-nums">
                    {children}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleChildrenChange(1)}
                    disabled={totalPassengers >= 9}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Bebês de Colo (< 2 anos) */}
              <div className="flex items-center justify-between sm:flex-col sm:items-stretch p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs gap-2">
                <div>
                  <span className="block text-xs font-bold text-slate-900">{t.modal.infantsInLapTitle}</span>
                  <span className="block text-[10px] text-slate-500 font-medium">{t.modal.infantsInLapSubtitle}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleInfantsChange(-1)}
                    disabled={infantsInLap <= 0}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-black text-slate-900 text-sm w-4 text-center tabular-nums">
                    {infantsInLap}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleInfantsChange(1)}
                    disabled={infantsInLap >= passengers || totalPassengers >= 9}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-slate-700 text-sm flex items-center justify-center transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {infantsInLap > 0 && (
              <div className="text-[10px] text-indigo-700 bg-indigo-50/60 rounded-lg px-2.5 py-1 font-medium border border-indigo-100">
                👶 {locale === "en" ? "Max 1 lap infant per adult passenger" : "Máximo de 1 bebê no colo por adulto acompanhante"}
              </div>
            )}
          </div>

          {/* 5. Flight Preference: Compact Segmented Control */}
          <div className="space-y-1.5 relative z-10">
            <label className="block text-xs font-bold text-slate-700">
              {t.modal.flightPreferenceLabel}
            </label>

            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setOnlyDirect(false)}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                  !onlyDirect
                    ? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>
                  {locale === "en"
                    ? "Any flight (with/without stops)"
                    : "Qualquer voo (com ou sem conexões)"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setOnlyDirect(true)}
                className={`py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                  onlyDirect
                    ? "bg-white text-sky-700 shadow-xs ring-1 ring-sky-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>
                  {locale === "en"
                    ? "Direct flights only"
                    : "Apenas voos diretos"}
                </span>
              </button>
            </div>

            {/* Disclaimer when Only Direct is selected */}
            {onlyDirect && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-[11px] text-amber-900 animate-fadeIn mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>{locale === "en" ? "Notice:" : "Aviso:"}</strong>{" "}
                  {t.modal.flightPreferenceDirectDisclaimer}
                </p>
              </div>
            )}
          </div>

          {/* 6. Target Price (R$) per traveler with Group Estimate */}
          <div className="space-y-1.5 relative z-0">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {locale === "en"
                    ? `Target Price per traveler (R$)`
                    : `Preço Alvo por pessoa (R$)`}
                </span>
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/70">
                {locale === "en" ? "per person" : "por pessoa"}
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min={1}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder={locale === "en" ? "1200.00" : "1200.00"}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-black focus:outline-none focus:border-sky-500 focus:bg-white transition-colors font-mono"
              />
            </div>

            {numericInputPrice > 0 ? (
              <div className="space-y-1.5 mt-1.5">
                <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                  <span>≈ ${usdEstimate} USD {locale === "en" ? "/ person" : "/ pessoa"}</span>
                  <span className="text-slate-400 font-normal">
                    ({locale === "en" ? `rate: ${usdRateFormatted}` : `cotação: ${usdRateFormatted}`})
                  </span>
                </p>

                {totalPassengers > 1 && (
                  <div className="p-2.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-[11px] text-slate-700 flex items-center justify-between animate-fadeIn">
                    <span className="font-medium text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        {locale === "en"
                          ? `Estimated total for ${totalPassengers} travelers:`
                          : `Total estimado para ${totalPassengers} passageiros:`}
                      </span>
                    </span>
                    <span className="font-black text-slate-900 font-mono text-xs">
                      {formatCurrency(numericInputPrice * totalPassengers)}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {locale === "en"
                  ? "Alerts will trigger when price per traveler drops to or below this value."
                  : t.modal.targetPriceDesc}
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {loading
                  ? t.modal.saving
                  : routeToEdit
                  ? t.modal.saveButton
                  : t.modal.createButton}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
