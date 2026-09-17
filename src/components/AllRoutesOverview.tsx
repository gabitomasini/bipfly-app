"use client";

import { useMemo } from "react";
import { MonitoredRoute, FlightHistoryEntry } from "@/lib/types";
import { formatCurrency, formatDateBR, getAirportName, getGoogleFlightsUrl } from "@/lib/utils";
import {
  TrendingDown,
  CheckCircle2,
  ExternalLink,
  Tag,
  DollarSign,
  Compass,
  Calendar,
  Building,
} from "lucide-react";
import { ROUTE_COLORS } from "./MultiRoutePriceChart";

interface AllRoutesOverviewProps {
  routes: MonitoredRoute[];
  allHistory: FlightHistoryEntry[];
  onSelectRoute: (id: number) => void;
}

export default function AllRoutesOverview({
  routes,
  allHistory,
  onSelectRoute,
}: AllRoutesOverviewProps) {
  // Estatísticas Globais
  const globalStats = useMemo(() => {
    const routesWithPrice = routes.filter((r) => r.latestPrice !== null && r.latestPrice !== undefined);
    const totalSearches = allHistory.length;

    if (routesWithPrice.length === 0) {
      return {
        totalRoutes: routes.length,
        routesOnTarget: 0,
        lowestPriceRoute: null,
        bestDiscountRoute: null,
        avgPrice: null,
        totalSearches,
      };
    }

    // Rota com menor preço absoluto
    const lowestPriceRoute = [...routesWithPrice].sort(
      (a, b) => (a.latestPrice as number) - (b.latestPrice as number)
    )[0];

    // Rota com maior desconto ou proximidade da meta
    const bestDiscountRoute = [...routesWithPrice].sort((a, b) => {
      const priceA = a.latestPrice as number;
      const targetA = a.targetPrice || 1;
      const pctA = (priceA - targetA) / targetA;

      const priceB = b.latestPrice as number;
      const targetB = b.targetPrice || 1;
      const pctB = (priceB - targetB) / targetB;

      return pctA - pctB;
    })[0];

    // Rotas no alvo
    const routesOnTarget = routesWithPrice.filter((r) => (r.latestPrice as number) <= r.targetPrice).length;

    // Média geral
    const sum = routesWithPrice.reduce((acc, r) => acc + (r.latestPrice as number), 0);
    const avgPrice = Math.round(sum / routesWithPrice.length);

    return {
      totalRoutes: routes.length,
      routesOnTarget,
      lowestPriceRoute,
      bestDiscountRoute,
      avgPrice,
      totalSearches,
    };
  }, [routes, allHistory]);

  return (
    <div className="space-y-6">
      {/* 4 Cards de Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Rotas */}
        <div className="glass-panel p-4 bg-white border border-slate-200 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Rotas Monitoradas</span>
            <Compass className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{globalStats.totalRoutes}</span>
            <span className="text-xs text-slate-500 font-medium">rotas ativas</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold mt-1">
            {globalStats.routesOnTarget} rota(s) dentro da meta
          </div>
        </div>

        {/* Menor Preço Atual */}
        <div className="glass-panel p-4 bg-white border border-slate-200 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Menor Preço Hoje</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          {globalStats.lowestPriceRoute && globalStats.lowestPriceRoute.latestPrice !== null && globalStats.lowestPriceRoute.latestPrice !== undefined ? (
            <div>
              <div className="text-2xl font-black text-emerald-700">
                {formatCurrency(globalStats.lowestPriceRoute.latestPrice)}
              </div>
              <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                {globalStats.lowestPriceRoute.origin} → {globalStats.lowestPriceRoute.destination}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 font-medium">Aguardando busca</div>
          )}
        </div>

        {/* Melhor Oportunidade */}
        <div className="glass-panel p-4 bg-white border border-slate-200 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Melhor Desconto vs Meta</span>
            <TrendingDown className="w-4 h-4 text-indigo-600" />
          </div>
          {globalStats.bestDiscountRoute && globalStats.bestDiscountRoute.latestPrice !== null && globalStats.bestDiscountRoute.latestPrice !== undefined ? (
            <div>
              {(() => {
                const price = globalStats.bestDiscountRoute.latestPrice as number;
                const target = globalStats.bestDiscountRoute.targetPrice || 1;
                const orig = globalStats.bestDiscountRoute.origin;
                const dest = globalStats.bestDiscountRoute.destination;
                return (
                  <>
                    <div className="text-2xl font-black text-indigo-700">
                      {Math.round(((price - target) / target) * 100)}%
                    </div>
                    <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
                      {orig} → {dest} (Meta: {formatCurrency(target)})
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-sm text-slate-400 font-medium">Sem dados</div>
          )}
        </div>

        {/* Média Consolidada */}
        <div className="glass-panel p-4 bg-white border border-slate-200 shadow-xs rounded-xl">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Média de Preço Geral</span>
            <Tag className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {globalStats.avgPrice !== null ? formatCurrency(globalStats.avgPrice) : "--"}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {globalStats.totalSearches} cotações no banco
          </div>
        </div>
      </div>

      {/* Grid de Cards Compactos de Cada Rota com Links Diretos */}
      <div>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
          <span>Quadro Geral de Todas as Rotas</span>
          <span className="text-xs text-slate-500 font-normal">
            Clique em &ldquo;Focar Rota&rdquo; para ver a análise individual detalhada
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routes.map((r, idx) => {
            const price = r.latestPrice;
            const target = r.targetPrice;
            const origin = r.origin;
            const destination = r.destination;
            const flightDate = r.flightDate;
            const passengers = r.passengers;
            const airline = r.lastAirline;
            const bookingLink = r.lastBookingLink;

            const hasPrice = price !== null && price !== undefined;
            const isBelow = hasPrice && (price as number) <= target;
            const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
            const flightUrl = bookingLink || getGoogleFlightsUrl(origin, destination, flightDate, passengers);

            return (
              <div
                key={r.id}
                className="glass-panel p-4 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Header do Card */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-extrabold text-slate-900 text-sm">
                        {origin} → {destination}
                      </span>
                    </div>

                    {isBelow && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        No Alvo
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-medium mb-3">
                    {getAirportName(origin)} para {getAirportName(destination)}
                  </div>

                  {/* Informações de Voo */}
                  <div className="space-y-1.5 text-xs text-slate-600 py-2 border-y border-slate-100 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-sky-600" /> Data:
                      </span>
                      <strong className="text-slate-800">{formatDateBR(flightDate)}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-amber-600" /> Preço Meta:
                      </span>
                      <strong className="text-slate-800">{formatCurrency(target)}</strong>
                    </div>

                    {airline && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-indigo-600" /> Cia:
                        </span>
                        <span className="font-semibold text-slate-700">{airline}</span>
                      </div>
                    )}
                  </div>

                  {/* Preço Atual */}
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-xs text-slate-500 font-medium">Último Preço:</span>
                    <span
                      className={`text-xl font-black ${
                        hasPrice
                          ? isBelow
                            ? "text-emerald-700"
                            : "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {hasPrice ? formatCurrency(price as number) : "Sem dados"}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onSelectRoute(r.id)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer text-center"
                  >
                    Focar Rota
                  </button>

                  <a
                    href={flightUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 transition-colors cursor-pointer shadow-2xs"
                    title="Ver no Google Flights"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ver Voo</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


