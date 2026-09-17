"use client";

import { useRouter } from "next/navigation";
import { MonitoredRoute, SchedulerStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plane, TrendingDown, Target, Clock, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";

interface MetricCardsProps {
  routes: MonitoredRoute[];
  schedulerStatus?: SchedulerStatus | null;
}

export default function MetricCards({ routes, schedulerStatus }: MetricCardsProps) {
  const router = useRouter();
  const totalCount = routes.length;
  const activeRoutes = routes.filter((r) => r.isActive);
  const activeCount = activeRoutes.length;
  const activePercent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const onTargetRoutes = routes.filter(
    (r) => r.isActive && r.latestPrice !== null && r.latestPrice !== undefined && r.latestPrice <= r.targetPrice
  );
  const onTargetCount = onTargetRoutes.length;

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

  // Format next run time
  const nextRunText = schedulerStatus?.nextRun
    ? new Date(schedulerStatus.nextRun).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : schedulerStatus?.scheduleHours?.[0] || "03:00";

  const isSchedulerActive = schedulerStatus?.running !== false;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1: Rotas Ativas */}
      <div
        onClick={() => router.push("/rotas?filter=active")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rotas Ativas
          </span>
          <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 group-hover:scale-105 transition-transform">
            <Plane className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              {activeCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              de {totalCount} rotas
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/70">
              {activePercent}% ativas
            </span>
            {totalCount - activeCount > 0 && (
              <span className="text-[11px] text-slate-400 font-medium">
                {totalCount - activeCount} pausada(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2: Menor Preço Encontrado */}
      <div
        onClick={() => router.push("/rotas")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menor Tarifa
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
            <TrendingDown className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums truncate">
              {lowestOverallPrice ? formatCurrency(lowestOverallPrice) : "—"}
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 truncate">
            {lowestPriceRoute ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 truncate">
                <ArrowUpRight className="w-3 h-3 text-emerald-600 shrink-0 rotate-45" />
                {lowestPriceRoute.origin} → {lowestPriceRoute.destination}
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                Aguardando cotação
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3: No Preço Alvo */}
      <div
        onClick={() => router.push("/rotas?filter=target")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            No Preço Alvo
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
            onTargetCount > 0
              ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
              : "bg-slate-50 border border-slate-100 text-slate-400"
          }`}>
            <Target className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black tracking-tight tabular-nums ${
                onTargetCount > 0 ? "text-emerald-600" : "text-slate-900"
              }`}
            >
              {onTargetCount}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              de {activeCount} ativas
            </span>
          </div>

          <div className="mt-2.5 flex items-center gap-1.5">
            {onTargetCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {onTargetCount === 1 ? "1 pronta p/ compra" : `${onTargetCount} prontas p/ compra`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                Aguardando queda
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4: Próxima Varredura */}
      <div
        onClick={() => router.push("/configuracoes")}
        className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ciclo de Busca
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black tracking-tight text-slate-900 tabular-nums">
              {nextRunText}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              {isSchedulerActive ? "Ativo" : "Pausado"}
            </span>
          </div>

          {/* Visual Progress Bar to next cycle */}
          <div className="mt-3">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full w-3/4 animate-pulse" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1">
              <span>Varredura automática</span>
              <span>Horário de Brasília</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
