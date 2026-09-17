"use client";

import { MonitoredRoute, SchedulerStatus } from "@/lib/types";
import { formatCurrency, formatDateTimeBR } from "@/lib/utils";
import { Plane, TrendingDown, Target, Clock } from "lucide-react";

interface MetricCardsProps {
  routes: MonitoredRoute[];
  schedulerStatus?: SchedulerStatus | null;
}

export default function MetricCards({ routes, schedulerStatus }: MetricCardsProps) {
  const activeRoutes = routes.filter((r) => r.isActive);
  const onTargetRoutes = routes.filter(
    (r) => r.isActive && r.latestPrice !== null && r.latestPrice !== undefined && r.latestPrice <= r.targetPrice
  );

  let lowestOverallPrice: number | null = null;
  let lowestPriceRoute: MonitoredRoute | null = null;

  for (const r of routes) {
    if (r.latestPrice !== null && r.latestPrice !== undefined) {
      if (lowestOverallPrice === null || r.latestPrice < lowestOverallPrice) {
        lowestOverallPrice = r.latestPrice;
        lowestPriceRoute = r;
      }
    }
  }

  // Format next run time simply (e.g. "14:00" or next schedule hours)
  const nextRunText = schedulerStatus?.nextRun
    ? new Date(schedulerStatus.nextRun).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : schedulerStatus?.scheduleHours?.[0] || "03:00";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1: Rotas Ativas */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium text-slate-500">Rotas Ativas</span>
          <Plane className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{activeRoutes.length}</span>
          <span className="text-xs text-slate-400">/ {routes.length} total</span>
        </div>
      </div>

      {/* 2: Menor Preço Encontrado */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium text-slate-500">Menor Tarifa</span>
          <TrendingDown className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-1.5 truncate">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {lowestOverallPrice ? formatCurrency(lowestOverallPrice) : "—"}
          </span>
          {lowestPriceRoute && (
            <span className="text-xs text-slate-400 truncate">
              {lowestPriceRoute.origin}→{lowestPriceRoute.destination}
            </span>
          )}
        </div>
      </div>

      {/* 3: No Alvo */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium text-slate-500">No Preço Alvo</span>
          <Target className={`w-4 h-4 ${onTargetRoutes.length > 0 ? "text-emerald-600" : "text-slate-400"}`} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-bold tracking-tight ${
              onTargetRoutes.length > 0 ? "text-emerald-600" : "text-slate-900"
            }`}
          >
            {onTargetRoutes.length}
          </span>
          <span className="text-xs text-slate-400">
            {onTargetRoutes.length === 1 ? "rota no alvo" : "rotas no alvo"}
          </span>
        </div>
      </div>

      {/* 4: Próxima Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between text-slate-500 mb-1.5">
          <span className="text-xs font-medium text-slate-500">Próxima Busca</span>
          <Clock className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{nextRunText}</span>
          <span className="text-xs text-slate-400">automática</span>
        </div>
      </div>
    </div>
  );
}
