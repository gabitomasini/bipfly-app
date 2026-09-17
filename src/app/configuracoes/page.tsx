"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { AppSettings, SchedulerStatus } from "@/lib/types";
import { formatDateTimeBR, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/Toast";
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
} from "lucide-react";

export default function ConfiguracoesPage() {
  const { addToast } = useToast();
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
      setHourError("Por favor, digite um horário válido no formato HH:MM (ex: 08:30 ou 14:00).");
      return;
    }
    const formatted = val.padStart(5, "0");
    if (hoursList.includes(formatted)) {
      setHourError("Este horário já está na lista.");
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
      setHourError("Você deve manter pelo menos um horário diário de busca configurado.");
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
      if (!json.success) throw new Error(json.error || "Falha ao salvar configurações.");

      const schRes = await fetch("/api/scheduler");
      const schJson = await schRes.json();
      if (schJson.success) setSchedulerStatus(schJson.data);

      setInitialSettings(payload);
      addToast("Configurações salvas e agendador reprogramado com sucesso!", "success");
    } catch (err: any) {
      addToast(err.message || "Erro ao salvar configurações", "error");
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
        setTestNotificationFeedback("✅ Alerta disparado! Verifique seu app ntfy no celular.");
      } else {
        setTestNotificationFeedback(`❌ Erro: ${json.error || "Falha no envio"}`);
      }
    } catch (err: any) {
      setTestNotificationFeedback(`❌ Erro de rede: ${err.message}`);
    } finally {
      setTestNotificationSending(false);
      setTimeout(() => setTestNotificationFeedback(null), 6000);
    }
  };

  const handleTestScraper = async () => {
    setTestScraperRunning(true);
    setTestScraperFeedback("Iniciando navegador headless Playwright e extraindo Google Flights...");
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
          `✅ Sucesso! Web Scraper extraiu ${total} voos reais. Menor: ${formatCurrency(bestPrice)} (${bestAirline}).`
        );
      } else {
        setTestScraperFeedback(`❌ Falha no scraper: ${json.error || "Nenhum voo retornado"}`);
      }
    } catch (err: any) {
      setTestScraperFeedback(`❌ Erro: ${err.message}`);
    } finally {
      setTestScraperRunning(false);
    }
  };

  const activeProvider = settings.searchProvider;

  return (
    <div className="min-h-screen pb-16 bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-sky-600" />
            <span>Configurações do Sistema & Agendador</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Personalize os horários de busca, modo Web Scraping / API e notificações no celular.
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
                  <h2 className="text-base font-bold text-slate-900">Motor de Busca de Voos</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Escolha entre Web Scraping direto (Playwright) ou consulta via API estruturada.
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
                <span>{testScraperRunning ? "Testando Scraper..." : "Testar Web Scraper"}</span>
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
                      Automático / Híbrido
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
                    ⭐ <strong>Recomendado</strong>: Tenta Web Scraping primeiro (gratuito); se houver bloqueio, usa a API como fallback.
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
                      Web Scraping Direto
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
                    Acessa o Google Flights via navegador invisível (Playwright). 100% gratuito e ilimitado.
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
                      SerpApi Google Flights
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
                    Busca estruturada direta via API com cota gratuita mensal de 250 buscas.
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
                <h2 className="text-base font-bold text-slate-900">Horários de Busca Automática</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Defina os horários em que o radar deve consultar o Google Flights todos os dias.
                </p>
              </div>
            </div>

            {/* Presets Rápidos */}
            <div>
              <span className="text-xs text-slate-700 block mb-2 font-bold">
                Atalhos de configuração rápida:
              </span>
              <div className="flex flex-wrap gap-2">
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
                  className="px-3.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 border border-sky-300 text-xs font-bold text-sky-800 transition-colors cursor-pointer"
                >
                  ⭐ A cada 3 horas (8x ao dia - Recomendado p/ Scraper)
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
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  A cada 4 horas (6x ao dia)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleApplyPreset(["00:00", "06:00", "12:00", "18:00"])
                  }
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  A cada 6 horas (4x ao dia)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset(["03:00", "14:00"])}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  2x ao dia (03:00 e 14:00)
                </button>
              </div>
            </div>

            {/* Lista de Horários Ativos */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                Horários Atualmente Agendados:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {hoursList.map((hour) => (
                  <div
                    key={hour}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sm font-bold font-mono text-sky-800 shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    <span>{hour}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHour(hour)}
                      className="text-slate-400 hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                      title="Remover horário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Adicionar Novo Horário */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-3">
                <input
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
                  <span>Adicionar Horário</span>
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
                  <span className="text-slate-500">Status do Agendador:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Ativo & Rodando
                  </span>
                </div>
                {schedulerStatus.nextRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Próxima Execução Programada:</span>
                    <span className="font-mono text-slate-900 font-semibold">
                      {formatDateTimeBR(schedulerStatus.nextRun)}
                    </span>
                  </div>
                )}
                {schedulerStatus.lastRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Última Execução:</span>
                    <span className="font-mono text-slate-600">
                      {formatDateTimeBR(schedulerStatus.lastRun)} (
                      {schedulerStatus.lastRunSummary || "concluída"})
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
                <h2 className="text-base font-bold text-slate-900">Chave SerpApi (Google Flights)</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Permite buscar cotações reais direto da malha do Google Flights.
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
                placeholder="Insira sua chave SerpApi..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
              <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                Plano gratuito inclui 250 buscas mensais sem custo em{" "}
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
                <h2 className="text-base font-bold text-slate-900">Alertas Push no Celular (ntfy.sh)</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Receba alertas instantâneos no smartphone Android/iOS quando uma passagem atingir seu preço alvo.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Tópico ntfy.sh
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={settings.ntfyTopic || ""}
                  onChange={(e) => setSettings({ ...settings, ntfyTopic: e.target.value })}
                  placeholder="Ex: radar-passagens-meu-topico-secreto"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testNotificationSending || !settings.ntfyTopic}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Send className={`w-3.5 h-3.5 ${testNotificationSending ? "animate-spin" : ""}`} />
                  <span>{testNotificationSending ? "Enviando..." : "Testar Push"}</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                Instale o app gratuito <strong>ntfy</strong> no seu celular e assine o mesmo nome de tópico configurado aqui.
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
                Enviar notificação push automaticamente sempre que o menor preço for igual ou menor que a meta
              </label>
            </div>
          </div>

          {/* Sticky Save Bar */}
          {isDirty && (
            <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg animate-fadeIn">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Existem alterações não salvas</span>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Configurações"}
                </button>
              </div>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

