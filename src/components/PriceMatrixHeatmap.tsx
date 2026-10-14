"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { PriceMatrixResponse, PriceMatrixCell } from "@/lib/types";
import { formatCurrencyLocale, formatUsdEstimate, formatDateLocale, getAirportName } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";
import {
  Calendar,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Check,
  RefreshCw,
  TrendingDown,
  Info,
  Clock,
  Plane,
  X,
} from "lucide-react";
import SkeletonLoader from "./SkeletonLoader";

interface PriceMatrixHeatmapProps {
  origin: string;
  destination: string;
  baseDepartureDate: string;
  baseReturnDate?: string | null;
  flexibilityDays?: number;
  flexibleWeekends?: boolean;
  currency?: string;
  onSelectDates?: (departureDate: string, returnDate?: string | null, price?: number | null) => void;
  onClose?: () => void;
  className?: string;
}

export default function PriceMatrixHeatmap({
  origin,
  destination,
  baseDepartureDate,
  baseReturnDate,
  flexibilityDays = 2,
  flexibleWeekends = false,
  currency = "BRL",
  onSelectDates,
  onClose,
  className = "",
}: PriceMatrixHeatmapProps) {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<PriceMatrixResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<PriceMatrixCell | null>(null);

  // Filtros internos interativos
  const [activeFlexDays, setActiveFlexDays] = useState<number>(flexibilityDays);
  const [activeWeekendsOnly, setActiveWeekendsOnly] = useState<boolean>(flexibleWeekends);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        origin: origin.toUpperCase(),
        destination: destination.toUpperCase(),
        departureDate: baseDepartureDate,
        flexibilityDays: String(activeFlexDays),
        flexibleWeekends: String(activeWeekendsOnly),
        currency,
      });

      if (baseReturnDate) {
        params.set("returnDate", baseReturnDate);
      }

      const res = await fetch(`/api/flights/matrix?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setData(json);
        // Pré-seleciona a melhor célula ou a data original
        if (json.cheapestCell) {
          setSelectedCell(json.cheapestCell);
        } else if (json.cells.length > 0) {
          setSelectedCell(json.cells[0]);
        }
      } else {
        setError(json.error || "Erro ao consultar matriz de tarifas.");
      }
    } catch (err: any) {
      setError(err.message || "Falha na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, baseDepartureDate, baseReturnDate, activeFlexDays, activeWeekendsOnly, currency]);

  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  // Formata dia da semana abreviado
  const formatDayOfWeek = useCallback(
    (dateStr: string) => {
      try {
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
          weekday: "short",
          timeZone: "UTC",
        }).format(date);
      } catch {
        return "";
      }
    },
    [locale]
  );

  // Formata dia e mês compacto (ex: "15 nov")
  const formatShortDate = useCallback(
    (dateStr: string) => {
      try {
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "pt-BR", {
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        }).format(date);
      } catch {
        return dateStr;
      }
    },
    [locale]
  );

  // Mapa de células para busca instantânea por chave (dep_ret)
  const cellMap = useMemo(() => {
    const map = new Map<string, PriceMatrixCell>();
    if (data?.cells) {
      for (const c of data.cells) {
        const key = `${c.departureDate}_${c.returnDate || ""}`;
        map.set(key, c);
      }
    }
    return map;
  }, [data]);

  // Retorna estilos de cor com base no percentil térmico
  const getCellColorClass = (cell?: PriceMatrixCell) => {
    if (!cell || cell.price === null) {
      return "bg-slate-50 text-slate-400 border-slate-200/60";
    }

    if (cell.isCheapest) {
      return "bg-emerald-500 text-white font-bold border-emerald-600 shadow-sm ring-2 ring-emerald-400/50";
    }

    const p = cell.percentile;
    if (p <= 0.25) {
      return "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold";
    }
    if (p <= 0.5) {
      return "bg-teal-50 text-teal-900 border-teal-200";
    }
    if (p <= 0.75) {
      return "bg-amber-50 text-amber-900 border-amber-200";
    }
    return "bg-rose-50/70 text-rose-900 border-rose-200";
  };

  const isRoundTrip = Boolean(data?.baseReturnDate || baseReturnDate);

  // Diferença do selecionado vs data original
  const savingsInfo = useMemo(() => {
    if (!selectedCell || selectedCell.price === null || data?.basePrice === null || !data?.basePrice) {
      return null;
    }
    const diff = data.basePrice - selectedCell.price;
    const diffPercent = Math.round((diff / data.basePrice) * 100);
    return {
      diff,
      diffPercent,
      isCheaper: diff > 0,
      isSame: diff === 0,
    };
  }, [selectedCell, data?.basePrice]);

  return (
    <div className={`bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden ${className}`}>
      {/* Cabeçalho */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-sky-50/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-sky-100/80 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {locale === "en" ? "Flexible Date Price Matrix" : "Matriz de Tarifas por Data"}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100/70 text-sky-700 border border-sky-200/60">
                <Sparkles className="w-3 h-3 text-sky-600" />
                {locale === "en" ? "Smart Heatmap" : "Heatmap Inteligente"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {getAirportName(origin)} → {getAirportName(destination)}
            </p>
          </div>
        </div>

        {/* Controles de Tolerância e Ações */}
        <div className="flex items-center gap-2">
          {/* Seletor de Tolerância */}
          <div className="inline-flex p-0.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs">
            {[1, 2, 3].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  setActiveWeekendsOnly(false);
                  setActiveFlexDays(days);
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  !activeWeekendsOnly && activeFlexDays === days
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ±{days}d
              </button>
            ))}
            {isRoundTrip && (
              <button
                type="button"
                onClick={() => setActiveWeekendsOnly((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeWeekendsOnly
                    ? "bg-sky-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {locale === "en" ? "Weekends" : "Fim de Semana"}
              </button>
            )}
          </div>

          {/* Botão de Atualizar */}
          <button
            type="button"
            onClick={fetchMatrix}
            disabled={loading}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50 cursor-pointer"
            title={locale === "en" ? "Refresh Matrix" : "Recarregar Matriz"}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Legenda Explicativa */}
      <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
            <span>{locale === "en" ? "Lowest Fare" : "Menor Preço"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300" />
            <span>{locale === "en" ? "Great Deal" : "Ótima Oferta"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-50 border border-amber-200" />
            <span>{locale === "en" ? "Average" : "Média"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-50 border border-rose-200" />
            <span>{locale === "en" ? "Higher" : "Mais Alta"}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sky-700 font-medium">
          <Info className="w-3.5 h-3.5" />
          <span>
            {locale === "en"
              ? "Click any cell to compare and apply date"
              : "Clique em uma célula para comparar e aplicar"}
          </span>
        </div>
      </div>

      {/* Conteúdo da Grade / Heatmap */}
      <div className="p-5">
        {loading ? (
          <div className="space-y-3 py-4">
            <SkeletonLoader variant="card" />
            <SkeletonLoader variant="row" count={3} />
          </div>
        ) : error ? (
          <div className="py-8 text-center text-rose-600">
            <p className="text-sm font-semibold">{error}</p>
            <button
              type="button"
              onClick={fetchMatrix}
              className="mt-3 px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {locale === "en" ? "Try Again" : "Tentar Novamente"}
            </button>
          </div>
        ) : data && isRoundTrip && data.returnDates.length > 0 ? (
          /* Visualização Bidimensional (Ida e Volta) */
          <div className="overflow-x-auto pb-2">
            <table className="w-full border-separate border-spacing-1.5 min-w-[500px]">
              <thead>
                <tr>
                  {/* Canto superior esquerdo vazio / label */}
                  <th className="p-2 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded-xl">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Ida ↓</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-500">Volta →</span>
                    </div>
                  </th>
                  {data.returnDates.map((retDate) => {
                    const isBase = retDate === data.baseReturnDate;
                    return (
                      <th
                        key={retDate}
                        className={`p-2 text-center rounded-xl transition-colors ${
                          isBase
                            ? "bg-sky-50 text-sky-900 border border-sky-200 font-bold"
                            : "bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {formatDayOfWeek(retDate)}
                        </div>
                        <div className="text-xs font-bold whitespace-nowrap">
                          {formatShortDate(retDate)}
                        </div>
                        {isBase && (
                          <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider text-sky-600 font-extrabold">
                            Base
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {data.departureDates.map((depDate) => {
                  const isBaseDep = depDate === data.baseDepartureDate;
                  return (
                    <tr key={depDate}>
                      {/* Cabeçalho da Linha (Data de Ida) */}
                      <th
                        className={`p-2 text-left rounded-xl transition-colors ${
                          isBaseDep
                            ? "bg-sky-50 text-sky-900 border border-sky-200 font-bold"
                            : "bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          {formatDayOfWeek(depDate)}
                        </div>
                        <div className="text-xs font-bold whitespace-nowrap">
                          {formatShortDate(depDate)}
                        </div>
                        {isBaseDep && (
                          <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider text-sky-600 font-extrabold">
                            Base
                          </span>
                        )}
                      </th>

                      {/* Células de Cruzamento Ida x Volta */}
                      {data.returnDates.map((retDate) => {
                        const cellKey = `${depDate}_${retDate}`;
                        const cell = cellMap.get(cellKey);
                        const isInvalid = retDate < depDate;
                        const isSelected =
                          selectedCell?.departureDate === depDate && selectedCell?.returnDate === retDate;

                        if (isInvalid) {
                          return (
                            <td
                              key={retDate}
                              className="p-2 text-center rounded-xl bg-slate-50/30 text-slate-300 text-xs border border-transparent"
                            >
                              —
                            </td>
                          );
                        }

                        return (
                          <td key={retDate} className="p-0">
                            <button
                              type="button"
                              onClick={() => cell && setSelectedCell(cell)}
                              disabled={!cell}
                              className={`w-full h-14 p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${getCellColorClass(
                                cell
                              )} ${
                                isSelected
                                  ? "ring-2 ring-sky-500 ring-offset-1 scale-[1.03] z-10 shadow-md font-bold"
                                  : "hover:scale-[1.02] hover:shadow-xs"
                              }`}
                            >
                              {cell && cell.price !== null ? (
                                <>
                                  <span className="text-xs tracking-tight">
                                    {formatCurrencyLocale(cell.price, currency, locale as any)}
                                  </span>
                                  {cell.isCheapest && (
                                    <span className="text-[9px] uppercase tracking-wider bg-white/30 px-1 rounded-sm mt-0.5">
                                      🏆 {locale === "en" ? "Best" : "Menor"}
                                    </span>
                                  )}
                                  {cell.isBaseDate && !cell.isCheapest && (
                                    <span className="text-[9px] text-sky-700 bg-sky-100/80 px-1 rounded-sm mt-0.5">
                                      🎯 {locale === "en" ? "Base" : "Base"}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-xs text-slate-300">--</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : data ? (
          /* Visualização Unidimensional (Somente Ida) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {data.cells.map((cell) => {
              const isSelected = selectedCell?.departureDate === cell.departureDate;
              return (
                <button
                  key={cell.departureDate}
                  type="button"
                  onClick={() => setSelectedCell(cell)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${getCellColorClass(
                    cell
                  )} ${
                    isSelected
                      ? "ring-2 ring-sky-500 ring-offset-1 scale-[1.02] shadow-md font-bold"
                      : "hover:scale-[1.01]"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-500">
                    {formatDayOfWeek(cell.departureDate)}
                  </span>
                  <span className="text-xs font-bold text-slate-900 my-0.5">
                    {formatShortDate(cell.departureDate)}
                  </span>
                  <span className="text-sm font-extrabold">
                    {cell.price !== null
                      ? formatCurrencyLocale(cell.price, currency, locale as any)
                      : "--"}
                  </span>
                  {cell.isCheapest && (
                    <span className="mt-1 text-[9px] bg-white/40 px-1.5 py-0.5 rounded font-extrabold uppercase">
                      🏆 {locale === "en" ? "Cheapest" : "Mais Barato"}
                    </span>
                  )}
                  {cell.isBaseDate && !cell.isCheapest && (
                    <span className="mt-1 text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded font-bold uppercase">
                      🎯 {locale === "en" ? "Original Date" : "Data Original"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}

        {/* Rodapé de Ação e Detalhes da Célula Selecionada */}
        {selectedCell && (
          <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-sky-50/40 to-emerald-50/40 border border-slate-200/90 flex flex-wrap items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-sky-600 flex items-center justify-center shrink-0 shadow-xs">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {formatDateLocale(selectedCell.departureDate, locale as any)}
                    {selectedCell.returnDate && (
                      <>
                        {" "}
                        <ArrowRight className="inline w-3 h-3 text-slate-400" />{" "}
                        {formatDateLocale(selectedCell.returnDate, locale as any)}
                      </>
                    )}
                  </span>
                  {selectedCell.isBaseDate && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                      {locale === "en" ? "Original" : "Original"}
                    </span>
                  )}
                  {selectedCell.isCheapest && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      🏆 {locale === "en" ? "Lowest Fare" : "Melhor Preço"}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-extrabold text-slate-900">
                    {selectedCell.price !== null
                      ? formatCurrencyLocale(selectedCell.price, currency, locale as any)
                      : "--"}
                  </span>
                  {savingsInfo && savingsInfo.isCheaper && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      <TrendingDown className="w-3.5 h-3.5" />
                      {locale === "en"
                        ? `Save ${formatCurrencyLocale(savingsInfo.diff, currency, locale as any)} (-${savingsInfo.diffPercent}%)`
                        : `Economia de ${formatCurrencyLocale(savingsInfo.diff, currency, locale as any)} (-${savingsInfo.diffPercent}%)`}
                    </span>
                  )}
                  {savingsInfo && !savingsInfo.isCheaper && !savingsInfo.isSame && (
                    <span className="text-xs text-slate-500 font-medium">
                      +{formatCurrencyLocale(Math.abs(savingsInfo.diff), currency, locale as any)} vs original
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedCell.bookingLink && (
                <a
                  href={selectedCell.bookingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <span>Google Flights</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}

              {onSelectDates && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectDates(
                      selectedCell.departureDate,
                      selectedCell.returnDate,
                      selectedCell.price
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-sky-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {locale === "en" ? "Apply This Date" : "Aplicar Esta Data"}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
