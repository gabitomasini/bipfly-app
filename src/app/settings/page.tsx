"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { AppSettings, SchedulerStatus } from "@/lib/types";
import { formatDateTimeLocale, formatCurrencyLocale } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import Tooltip from "@/components/Tooltip";
import {
  Settings,
  Clock,
  Key,
  Bell,
  AlertCircle,
  Send,
  Plus,
  Trash2,
  Globe,
  Zap,
  RefreshCw,
  Check,
} from "lucide-react";

export default function ConfiguracoesPage() {
  const { t, locale } = useTranslation();
  const { addToast } = useToast();
  const timeInputRef = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState<AppSettings>({
    scheduleHours: "03:00,14:00",
    searchProvider: "auto",
    serpApiKey: "",
    ntfyTopic: "radar-passagens",
    autoNotify: true,
  });
  const [initialSettings, setInitialSettings] = useState<AppSettings | null>(null);

  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hoursList, setHoursList] = useState<string[]>(["03:00", "14:00"]);
  const [newHourInput, setNewHourInput] = useState("");
  const [hourError, setHourError] = useState<string | null>(null);

  // Teste de Notificação
  const [testNotificationSending, setTestNotificationSending] = useState(false);
  const [testNotificationFeedback, setTestNotificationFeedback] = useState<string | null>(null);

  // Teste de Web Scraping
  const [testScraperRunning, setTestScraperRunning] = useState(false);
  const [testScraperFeedback, setTestScraperFeedback] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/scheduler").then((r) => r.json()),
    ])
      .then(([setRes, schRes]) => {
        if (setRes.success && setRes.data) {
          const raw = setRes.data;
          const scheduleHours = raw.scheduleHours || "03:00,14:00";
          const searchProvider = raw.searchProvider || "auto";
          const serpApiKey = raw.serpApiKey || "";
          const ntfyTopic = raw.ntfyTopic || "radar-passagens";
          const autoNotify = raw.autoNotify ?? true;

          const loadedSettings: AppSettings = {
            scheduleHours,
            searchProvider,
            serpApiKey,
            ntfyTopic,
            autoNotify,
          };

          setSettings(loadedSettings);
          setInitialSettings(loadedSettings);

          const parts = scheduleHours
            .split(",")
            .map((s: string) => s.trim())
            .filter((s: string) => s);
          setHoursList(parts);
        }
        if (schRes.success && schRes.data) {
          setSchedulerStatus(schRes.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const currentScheduleHours = hoursList.join(",");
  const isDirty = initialSettings !== null && (
    settings.searchProvider !== initialSettings.searchProvider ||
    (settings.serpApiKey || "") !== (initialSettings.serpApiKey || "") ||
    (settings.ntfyTopic || "") !== (initialSettings.ntfyTopic || "") ||
    settings.autoNotify !== initialSettings.autoNotify ||
    currentScheduleHours !== initialSettings.scheduleHours
  );

  const handleAddHour = () => {
    setHourError(null);
    const val = newHourInput.trim();
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(val)) {
      setHourError(t.settings.hourFormatError);
      return;
    }
    const formatted = val.padStart(5, "0");
    if (hoursList.includes(formatted)) {
      setHourError(t.settings.hourDuplicateError);
      return;
    }
    const updated = [...hoursList, formatted].sort();
    setHoursList(updated);
    setSettings((prev) => ({ ...prev, scheduleHours: updated.join(",") }));
    setNewHourInput("");
  };

  const handleRemoveHour = (hour: string) => {
    setHourError(null);
    if (hoursList.length <= 1) {
      setHourError(t.settings.hourMinError);
      return;
    }
    const updated = hoursList.filter((h) => h !== hour);
    setHoursList(updated);
    setSettings((prev) => ({ ...prev, scheduleHours: updated.join(",") }));
  };

  const handleApplyPreset = (presetHours: string[]) => {
    setHourError(null);
    setHoursList(presetHours);
    setSettings((prev) => ({ ...prev, scheduleHours: presetHours.join(",") }));
  };

  const activePreset = useMemo(() => {
    const current = [...hoursList].sort().join(",");
    const p1 = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`).sort().join(",");
    const p3 = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"].sort().join(",");
    const p4 = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"].sort().join(",");
    const p6 = ["00:00", "06:00", "12:00", "18:00"].sort().join(",");
    const pTwice = ["03:00", "14:00"].sort().join(",");

    if (current === p1) return "1h";
    if (current === p3) return "3h";
    if (current === p4) return "4h";
    if (current === p6) return "6h";
    if (current === pTwice) return "twice";
    return "custom";
  }, [hoursList]);

  const handleCancelSettings = () => {
    if (!initialSettings) return;
    setSettings(initialSettings);
    const parts = (initialSettings.scheduleHours || "03:00,14:00")
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    setHoursList(parts);
    setHourError(null);
    setNewHourInput("");
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setHourError(null);

    const payload = {
      ...settings,
      scheduleHours: hoursList.join(","),
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || t.toasts.settingsSaved);

      const schRes = await fetch("/api/scheduler");
      const schJson = await schRes.json();
      if (schJson.success) setSchedulerStatus(schJson.data);

      setInitialSettings(payload);
      addToast(t.settings.savedToast, "success");
    } catch (err: any) {
      addToast(err.message || t.toasts.connError, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTestNotificationSending(true);
    setTestNotificationFeedback(null);
    try {
      const topic = settings.ntfyTopic;
      const res = await fetch("/api/notify/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const json = await res.json();
      if (json.success) {
        setTestNotificationFeedback(locale === "en" ? "✅ Test alert triggered! Check your phone's ntfy app." : "✅ Alerta disparado! Verifique seu app ntfy no celular.");
      } else {
        setTestNotificationFeedback(locale === "en" ? `❌ Error: ${json.error || "Failed to send"}` : `❌ Erro: ${json.error || "Falha no envio"}`);
      }
    } catch (err: any) {
      setTestNotificationFeedback(locale === "en" ? `❌ Network error: ${err.message}` : `❌ Erro de rede: ${err.message}`);
    } finally {
      setTestNotificationSending(false);
      setTimeout(() => setTestNotificationFeedback(null), 6000);
    }
  };

  const handleTestScraper = async () => {
    setTestScraperRunning(true);
    setTestScraperFeedback(locale === "en" ? "Launching headless Playwright browser and scraping Google Flights..." : "Iniciando navegador headless Playwright e extraindo Google Flights...");
    try {
      const res = await fetch("/api/scraper/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: "GRU", destination: "MIA" }),
      });
      const json = await res.json();
      const options = json.data?.options || [];
      if (json.success && options.length > 0) {
        const best = options[0];
        const bestPrice = best.price;
        const bestAirline = best.airline;
        const total = json.data.totalOptions ?? options.length;
        setTestScraperFeedback(
          locale === "en"
            ? `✅ Success! Web scraper extracted ${total} live flight options. Lowest: ${formatCurrencyLocale(bestPrice, "BRL", locale)} (${bestAirline}).`
            : `✅ Sucesso! Web Scraper extraiu ${total} voos reais. Menor: ${formatCurrencyLocale(bestPrice, "BRL", locale)} (${bestAirline}).`
        );
      } else {
        setTestScraperFeedback(locale === "en" ? `❌ Scraper failure: ${json.error || "No flights returned"}` : `❌ Falha no scraper: ${json.error || "Nenhum voo retornado"}`);
      }
    } catch (err: any) {
      setTestScraperFeedback(locale === "en" ? `❌ Error: ${err.message}` : `❌ Erro: ${err.message}`);
    } finally {
      setTestScraperRunning(false);
    }
  };

  const activeProvider = settings.searchProvider;

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-sky-600" />
            <span>{t.settings.title}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {t.settings.subtitle}
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Seção 0: Provedor de Busca (Web Scraping vs API) */}
          <div className="glass-panel p-6 space-y-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{t.settings.searchEngineTitle}</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {t.settings.searchEngineDesc}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestScraper}
                disabled={testScraperRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testScraperRunning ? "animate-spin" : ""}`} />
                <span>{testScraperRunning ? t.settings.testingScraper : t.settings.testScraper}</span>
              </button>
            </div>

            {testScraperFeedback && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium animate-fadeIn">
                {testScraperFeedback}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Opção 1: Automático / Híbrido */}
              <label
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeProvider === "auto"
                    ? "bg-sky-50 border-sky-400 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-sky-600" />
                      {t.settings.optAuto}
                    </span>
                    <input
                      type="radio"
                      name="provider"
                      value="auto"
                      checked={activeProvider === "auto"}
                      onChange={() => setSettings({ ...settings, searchProvider: "auto" })}
                      className="w-4 h-4 text-sky-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {t.settings.optAutoDesc}
                  </p>
                </div>
              </label>

              {/* Opção 2: Web Scraping Puro */}
              <label
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeProvider === "scraper"
                    ? "bg-sky-50 border-sky-400 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      {t.settings.optScraper}
                    </span>
                    <input
                      type="radio"
                      name="provider"
                      value="scraper"
                      checked={activeProvider === "scraper"}
                      onChange={() => setSettings({ ...settings, searchProvider: "scraper" })}
                      className="w-4 h-4 text-sky-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {t.settings.optScraperDesc}
                  </p>
                </div>
              </label>

              {/* Opção 3: SerpApi Puro */}
              <label
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  activeProvider === "serpapi"
                    ? "bg-sky-50 border-sky-400 shadow-xs"
                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-600" />
                      {t.settings.optSerpapi}
                    </span>
                    <input
                      type="radio"
                      name="provider"
                      value="serpapi"
                      checked={activeProvider === "serpapi"}
                      onChange={() => setSettings({ ...settings, searchProvider: "serpapi" })}
                      className="w-4 h-4 text-sky-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {t.settings.optSerpapiDesc}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Seção 1: Agendador de Buscas (Parametrização) */}
          <div className="glass-panel p-6 space-y-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.settings.scheduleTitle}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {t.settings.scheduleSubtitle}
                </p>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div>
              <span className="text-xs text-slate-700 block mb-2 font-bold">
                {t.settings.presetLabel}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(
                      Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`)
                    )
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "1h"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "1h" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetEvery1h}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset([
                      "00:00",
                      "03:00",
                      "06:00",
                      "09:00",
                      "12:00",
                      "15:00",
                      "18:00",
                      "21:00",
                    ])
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "3h"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "3h" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetEvery3h}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset([
                      "00:00",
                      "04:00",
                      "08:00",
                      "12:00",
                      "16:00",
                      "20:00",
                    ])
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "4h"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "4h" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetEvery4h}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(["00:00", "06:00", "12:00", "18:00"])
                  }
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "6h"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "6h" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetEvery6h}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["03:00", "14:00"])}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "twice"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "twice" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetTwiceDaily}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    timeInputRef.current?.focus();
                    timeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                    activePreset === "custom"
                      ? "bg-sky-600 hover:bg-sky-700 text-white border-sky-600 shadow-xs font-bold ring-2 ring-sky-500/20"
                      : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-medium hover:border-slate-300 shadow-2xs"
                  }`}
                >
                  {activePreset === "custom" && <Check className="w-3.5 h-3.5 shrink-0" />}
                  <span>{t.settings.presetCustom}</span>
                </button>
              </div>
            </div>

            {/* Lista de Horários Ativos */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                {t.settings.scheduledHours}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {hoursList.map((hour) => (
                  <div
                    key={hour}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sm font-bold font-mono text-sky-800 shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>{hour}</span>
                    <Tooltip content={t.settings.removeTime}>
                      <button
                        type="button"
                        onClick={() => handleRemoveHour(hour)}
                        className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                        aria-label={t.settings.removeTime}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>

            {/* Adicionar Novo Horário */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <input
                  ref={timeInputRef}
                  type="time"
                  value={newHourInput}
                  onChange={(e) => {
                    setNewHourInput(e.target.value);
                    if (hourError) setHourError(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-mono focus:outline-none focus:border-sky-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddHour}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.settings.addTime}</span>
                </button>
              </div>
              {hourError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2 font-medium animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{hourError}</span>
                </div>
              )}
            </div>

            {/* Status Atual do Agendador */}
            {schedulerStatus && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t.settings.schedulerStatus}</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    {t.settings.schedulerActive}
                  </span>
                </div>
                {schedulerStatus.nextRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t.settings.nextRun}</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {formatDateTimeLocale(schedulerStatus.nextRun, locale)}
                    </span>
                  </div>
                )}
                {schedulerStatus.lastRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">{t.settings.lastRun}</span>
                    <span className="font-mono text-slate-600">
                      {formatDateTimeLocale(schedulerStatus.lastRun, locale)} (
                      {schedulerStatus.lastRunSummary || t.settings.lastRunCompleted})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 2: SerpApi (Google Flights) */}
          <div className="glass-panel p-6 space-y-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.settings.serpApiKeyTitle}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {t.settings.serpApiKeyDesc}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                SERPAPI_API_KEY
              </label>
              <input
                type="password"
                value={settings.serpApiKey || ""}
                onChange={(e) => setSettings({ ...settings, serpApiKey: e.target.value })}
                placeholder={t.settings.serpApiPlaceholder}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
              <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                {t.settings.serpApiFreeTier}{" "}
                <a
                  href="https://serpapi.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline font-bold"
                >
                  serpapi.com
                </a>
                .
              </span>
            </div>
          </div>

          {/* Seção 3: Notificações Push (ntfy.sh) */}
          <div className="glass-panel p-6 space-y-4 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-600">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{t.settings.ntfyTitle}</h2>
                <p className="text-xs text-slate-500 font-medium">
                  {t.settings.ntfyDesc}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.settings.ntfyTopicLabel}
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={settings.ntfyTopic || ""}
                  onChange={(e) => setSettings({ ...settings, ntfyTopic: e.target.value })}
                  placeholder={t.settings.ntfyTopicPlaceholder}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testNotificationSending || !settings.ntfyTopic}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${testNotificationSending ? "animate-spin" : ""}`} />
                  <span>{testNotificationSending ? t.settings.testingPush : t.settings.testPush}</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                {t.settings.ntfyAppTip}
              </span>
            </div>

            {testNotificationFeedback && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium">
                {testNotificationFeedback}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="auto-notify-chk"
                checked={settings.autoNotify}
                onChange={(e) => setSettings({ ...settings, autoNotify: e.target.checked })}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="auto-notify-chk" className="text-xs text-slate-700 font-medium cursor-pointer">
                {t.settings.autoNotifyCheck}
              </label>
            </div>
          </div>

          {/* Sticky Save Bar */}
          {isDirty && (
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg animate-fadeIn">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>{t.settings.unsavedChanges}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancelSettings}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                  >
                    {t.common.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {saving ? t.settings.savingBtn : t.settings.saveBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
