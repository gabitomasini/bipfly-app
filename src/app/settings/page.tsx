"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { SchedulerStatus } from "@/lib/types";
import { formatDateTimeLocale } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import {
  Clock,
  CheckCircle2,
} from "lucide-react";

const PRESET_6H = "00:00,06:00,12:00,18:00";
const PRESET_12H = "06:00,18:00";

export default function ConfiguracoesPage() {
  const { t, locale } = useTranslation();
  const { addToast } = useToast();

  const [selectedInterval, setSelectedInterval] = useState<"6h" | "12h">("6h");
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/scheduler").then((r) => r.json()),
    ])
      .then(([setRes, schRes]) => {
        if (setRes.success && setRes.data) {
          const rawHours = (setRes.data.scheduleHours || "").trim();
          const count = rawHours.split(",").filter(Boolean).length;
          // If 2 hours or matches 12h preset, select 12h; otherwise default to 6h
          if (count === 2 || rawHours === PRESET_12H || rawHours === "00:00,12:00") {
            setSelectedInterval("12h");
          } else {
            setSelectedInterval("6h");
          }
        }
        if (schRes.success && schRes.data) {
          setSchedulerStatus(schRes.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectInterval = async (intervalToSave: "6h" | "12h") => {
    if (saving || intervalToSave === selectedInterval) return;
    setSaving(true);
    const scheduleHours = intervalToSave === "6h" ? PRESET_6H : PRESET_12H;

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleHours }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t.toasts.settingsSaved);

      const schRes = await fetch("/api/scheduler");
      const schJson = await schRes.json();
      if (schJson.success) setSchedulerStatus(schJson.data);

      setSelectedInterval(intervalToSave);
      addToast(
        locale === "en"
          ? `Search schedule updated to every ${intervalToSave === "6h" ? "6 hours" : "12 hours"}!`
          : `Frequência de busca atualizada para a cada ${intervalToSave === "6h" ? "6 horas" : "12 horas"}!`,
        "success"
      );
    } catch (err: any) {
      addToast(err.message || t.toasts.connError, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-600" />
            <span>{locale === "en" ? "Automatic Search Times" : "Horários de Busca Automática"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            {locale === "en"
              ? "Choose the frequency for automated Google Flights price checks."
              : "Escolha a frequência para verificação automática de preços no Google Flights."}
          </p>
        </div>

        {/* Schedule Interval Selection Cards */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {locale === "en" ? "Search Frequency" : "Frequência de Varredura"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {locale === "en"
                  ? "Select how often BipFly checks for new flight deals."
                  : "Selecione com que frequência o BipFly pesquisa novas ofertas de voos."}
              </p>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              {locale === "en" ? "Automated" : "Automático"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opção 1: A cada 6 horas */}
            <button
              type="button"
              onClick={() => handleSelectInterval("6h")}
              disabled={saving}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedInterval === "6h"
                  ? "bg-sky-50/70 border-sky-500 shadow-xs ring-2 ring-sky-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-100 text-sky-800 text-xs font-black">
                    {locale === "en" ? "4x daily" : "4x ao dia"}
                  </span>
                  {selectedInterval === "6h" && (
                    <CheckCircle2 className="w-5 h-5 text-sky-600" />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {locale === "en" ? "Every 6 hours" : "A cada 6 horas"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {locale === "en"
                      ? "Fastest deal detection with 4 daily automated price scans."
                      : "Detecção ágil de promoções com 4 checagens automáticas por dia."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-mono text-slate-600 font-semibold">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>00:00 • 06:00 • 12:00 • 18:00</span>
              </div>
            </button>

            {/* Opção 2: A cada 12 horas */}
            <button
              type="button"
              onClick={() => handleSelectInterval("12h")}
              disabled={saving}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                selectedInterval === "12h"
                  ? "bg-sky-50/70 border-sky-500 shadow-xs ring-2 ring-sky-500/20"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                    {locale === "en" ? "2x daily" : "2x ao dia"}
                  </span>
                  {selectedInterval === "12h" && (
                    <CheckCircle2 className="w-5 h-5 text-sky-600" />
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {locale === "en" ? "Every 12 hours" : "A cada 12 horas"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                    {locale === "en"
                      ? "Standard monitoring with 2 scheduled daily scans (morning & evening)."
                      : "Monitoramento diário com 2 varreduras programadas (manhã e noite)."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-mono text-slate-600 font-semibold">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>06:00 • 18:00</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scheduler Live Status */}
        {loading ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded-md animate-pulse" />
              <div className="h-4 w-20 bg-slate-200 rounded-full animate-pulse" />
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="h-4 w-24 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-4 w-36 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
        ) : schedulerStatus ? (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">{t.settings.schedulerStatus}</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {t.settings.schedulerActive}
              </span>
            </div>

            {schedulerStatus.nextRun && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500">{t.settings.nextRun}</span>
                <span className="font-mono text-slate-900 font-bold">
                  {formatDateTimeLocale(schedulerStatus.nextRun, locale)}
                </span>
              </div>
            )}

            {schedulerStatus.lastRun && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <span className="text-slate-500">{t.settings.lastRun}</span>
                <span className="font-mono text-slate-600 font-medium">
                  {formatDateTimeLocale(schedulerStatus.lastRun, locale)}
                </span>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
