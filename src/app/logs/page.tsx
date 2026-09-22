"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import CustomSelect from "@/components/CustomSelect";
import Tooltip from "@/components/Tooltip";
import { AppLog, LogCategory, LogLevel, LogStats } from "@/lib/types";
import { formatDateTimeLocale, formatRelativeTimeLocale } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useScanning } from "@/context/ScanningContext";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";
import {
  Terminal,
  RefreshCw,
  Trash2,
  Search,
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Play,
  Activity,
  Layers,
  Radio,
  Pause,
  ArrowDownCircle,
  Send,
  Zap,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

export default function LogsPage() {
  const { t, locale } = useTranslation();
  const { isScanning, scanAllRoutes } = useScanning();
  const { user, isLoading: authLoading } = useAuth();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    info: 0,
    success: 0,
    warn: 0,
    error: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel | "ALL">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | "ALL">("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Real-time Event Stream State
  const [streamActive, setStreamActive] = useState(true);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [latestLiveLogId, setLatestLiveLogId] = useState<number | null>(null);

  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isSearchingNow, setIsSearchingNow] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const levelConfigMap = useMemo<Record<
    LogLevel,
    {
      label: string;
      bg: string;
      text: string;
      border: string;
      icon: typeof CheckCircle2;
      cardBorder: string;
      dotBg: string;
    }
  >>(() => ({
    SUCCESS: {
      label: t.logs.statSuccess,
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      icon: CheckCircle2,
      cardBorder: "border-l-emerald-500",
      dotBg: "bg-emerald-500",
    },
    INFO: {
      label: t.logs.statInfo,
      bg: "bg-sky-50",
      text: "text-sky-700",
      border: "border-sky-200",
      icon: Info,
      cardBorder: "border-l-sky-500",
      dotBg: "bg-sky-500",
    },
    WARN: {
      label: t.logs.statWarn,
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: AlertTriangle,
      cardBorder: "border-l-amber-500",
      dotBg: "bg-amber-500",
    },
    ERROR: {
      label: t.logs.statError,
      bg: "bg-rose-50",
      text: "text-rose-700",
      border: "border-rose-200",
      icon: AlertCircle,
      cardBorder: "border-l-rose-500",
      dotBg: "bg-rose-500",
    },
  }), [t]);

  const categories = useMemo<{ id: LogCategory | "ALL"; label: string }[]>(() => [
    { id: "ALL", label: t.logs.catAll },
    { id: "SCHEDULER", label: t.logs.catScheduler },
    { id: "SCRAPER", label: t.logs.catScraper },
    { id: "SCANNER", label: t.logs.catScanner },
    { id: "NOTIFICATION", label: t.logs.catNotification },
    { id: "API", label: t.logs.catApi },
    { id: "SYSTEM", label: t.logs.catSystem },
  ], [t]);

  // Carrega histórico inicial do banco
  const fetchInitialLogs = useCallback(async () => {
    if (authLoading || !user || !user.isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedLevel !== "ALL") params.set("level", selectedLevel);
      if (selectedCategory !== "ALL") params.set("category", selectedCategory);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      params.set("limit", "200");

      const res = await fetch(`/api/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setLogs(json.data.logs || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar logs iniciais:", err);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, selectedLevel, selectedCategory, searchTerm]);

  useEffect(() => {
    fetchInitialLogs();
    setCurrentPage(1);
  }, [fetchInitialLogs]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(logs.length / itemsPerPage));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return logs.slice(start, start + itemsPerPage);
  }, [logs, currentPage, itemsPerPage]);

  // Gerenciador de Server-Sent Events (SSE) em Tempo Real
  useEffect(() => {
    if (authLoading || !user || !user.isAdmin || !streamActive) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnectionState("disconnected");
      return;
    }

    setConnectionState("connecting");
    const es = new EventSource("/api/logs/stream");
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setConnectionState("connected");
    });

    es.addEventListener("log", (event) => {
      try {
        const newLog: AppLog = JSON.parse(event.data);
        
        // Atualiza estatísticas em tempo real
        setStats((prev) => {
          const key = newLog.level.toLowerCase() as keyof Omit<LogStats, "total">;
          return {
            ...prev,
            total: prev.total + 1,
            [key]: (prev[key] || 0) + 1,
          };
        });

        // Adiciona ao topo da lista respeitando filtros
        setLogs((prev) => {
          if (selectedLevel !== "ALL" && newLog.level !== selectedLevel) return prev;
          if (selectedCategory !== "ALL" && newLog.category !== selectedCategory) return prev;
          if (searchTerm.trim() && !newLog.message.toLowerCase().includes(searchTerm.toLowerCase().trim())) {
            return prev;
          }
          return [newLog, ...prev].slice(0, 500);
        });

        setLatestLiveLogId(newLog.id);
        setTimeout(() => setLatestLiveLogId(null), 3000);
      } catch (err) {
        console.error("Erro ao processar evento de log:", err);
      }
    });

    es.onerror = () => {
      setConnectionState("disconnected");
    };

    return () => {
      es.close();
    };
  }, [authLoading, user, streamActive, selectedLevel, selectedCategory, searchTerm]);

  const toggleExpand = (id: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyDetails = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearLogs = async () => {
    if (!confirm(t.logs.clearConfirm)) return;
    setIsClearing(true);
    try {
      const res = await fetch("/api/logs", { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setLogs([]);
        setStats({ total: 0, info: 0, success: 0, warn: 0, error: 0 });
      }
    } catch (err) {
      console.error("Erro ao limpar logs:", err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleTriggerSearchNow = async () => {
    if (isSearchingNow) return;
    setIsSearchingNow(true);
    try {
      await fetch("/api/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_now" }),
      });
    } catch (err) {
      console.error("Erro ao acionar busca imediata:", err);
    } finally {
      setIsSearchingNow(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen pb-24 bg-slate-50/70">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-6">
          <div className="h-10 w-48 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen pb-24 bg-slate-50/70">
        <Navbar />
        <main className="max-w-xl mx-auto px-4 pt-20 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">
              {locale === "en" ? "Restricted Access" : "Acesso Restrito"}
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {locale === "en"
                ? "Viewing system logs and telemetry is strictly restricted to authenticated administrators."
                : "A visualização de logs e telemetria do sistema é restrita aos administradores cadastrados."}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{locale === "en" ? "Back to Dashboard" : "Voltar ao Início"}</span>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-slate-50/70">
      <Navbar onSearchTriggered={() => fetchInitialLogs()} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6">
        {/* Header Principal & Indicador de Stream */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
                <Terminal className="w-6 h-6 text-sky-600" />
                <span>{t.logs.title}</span>
              </h1>

              {/* Status de Conexão Event-Driven */}
              {connectionState === "connected" && streamActive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{t.logs.liveSse}</span>
                </span>
              ) : connectionState === "connecting" ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                  <span>{t.logs.connecting}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                  <Pause className="w-3 h-3" />
                  <span>{t.logs.paused}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {t.logs.subtitle}
            </p>
          </div>

          {/* Botões de Ação Rápida */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Botão Disparar Busca Imediata (Para testar live stream) */}
            <Tooltip content={t.logs.runNowTooltip}>
              <button
                onClick={handleTriggerSearchNow}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-white" : "text-amber-300"}`} />
                <span>{isScanning ? t.logs.running : t.logs.runNow}</span>
              </button>
            </Tooltip>

            {/* Toggle Stream Ao Vivo */}
            <button
              onClick={() => setStreamActive(!streamActive)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${
                streamActive
                  ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600"
              }`}
            >
              {streamActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-500" />
                  <span>{t.logs.pauseStream}</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-white" />
                  <span>{t.logs.reconnectStream}</span>
                </>
              )}
            </button>

            {/* Botão Recarregar Histórico */}
            <Tooltip content={t.logs.reloadTooltip}>
              <button
                onClick={() => fetchInitialLogs()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-600" : ""}`} />
                <span>{t.logs.reload}</span>
              </button>
            </Tooltip>

            {/* Botão Limpar */}
            <Tooltip content={t.logs.clearTooltip}>
              <button
                onClick={handleClearLogs}
                disabled={isClearing || stats.total === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.logs.clear}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Cards de Métricas e Estatísticas de Logs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* Total */}
          <button
            onClick={() => setSelectedLevel("ALL")}
            className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
              selectedLevel === "ALL"
                ? "bg-sky-50 border-sky-300 shadow-xs ring-2 ring-sky-500/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              <span>{t.logs.statTotal}</span>
              <Layers className="w-4 h-4 text-slate-400" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-1 font-medium">{t.logs.statTotalDesc}</div>
          </button>

          {/* Sucesso */}
          <button
            onClick={() => setSelectedLevel("SUCCESS")}
            className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
              selectedLevel === "SUCCESS"
                ? "bg-emerald-50 border-emerald-300 shadow-xs ring-2 ring-emerald-500/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              <span>{t.logs.statSuccess}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-emerald-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-black text-emerald-700">{stats.success}</div>
            )}
            <div className="text-[11px] text-emerald-600/80 mt-1 font-medium">{t.logs.statSuccessDesc}</div>
          </button>

          {/* Info */}
          <button
            onClick={() => setSelectedLevel("INFO")}
            className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
              selectedLevel === "INFO"
                ? "bg-sky-50 border-sky-300 shadow-xs ring-2 ring-sky-500/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">
              <span>{t.logs.statInfo}</span>
              <Info className="w-4 h-4 text-sky-500" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-sky-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-black text-sky-700">{stats.info}</div>
            )}
            <div className="text-[11px] text-sky-600/80 mt-1 font-medium">{t.logs.statInfoDesc}</div>
          </button>

          {/* Aviso */}
          <button
            onClick={() => setSelectedLevel("WARN")}
            className={`p-4 rounded-xl border transition-all text-left cursor-pointer ${
              selectedLevel === "WARN"
                ? "bg-amber-50 border-amber-300 shadow-xs ring-2 ring-amber-500/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
              <span>{t.logs.statWarn}</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-amber-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-black text-amber-700">{stats.warn}</div>
            )}
            <div className="text-[11px] text-amber-600/80 mt-1 font-medium">{t.logs.statWarnDesc}</div>
          </button>

          {/* Erro */}
          <button
            onClick={() => setSelectedLevel("ERROR")}
            className={`p-4 rounded-xl border transition-all text-left cursor-pointer col-span-2 sm:col-span-1 ${
              selectedLevel === "ERROR"
                ? "bg-rose-50 border-rose-300 shadow-xs ring-2 ring-rose-500/20"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
              <span>{t.logs.statError}</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            {loading ? (
              <div className="h-8 w-16 bg-rose-100 rounded animate-pulse my-1" />
            ) : (
              <div className="text-2xl font-black text-rose-700">{stats.error}</div>
            )}
            <div className="text-[11px] text-rose-600/80 mt-1 font-medium">{t.logs.statErrorDesc}</div>
          </button>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Campo de Busca */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t.logs.searchPlaceholder}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feed de Logs em Tempo Real */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                {t.logs.eventStream} ({logs.length})
              </span>
              {streamActive && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {t.logs.streamSubtitle}
            </span>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 animate-pulse shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                    </div>
                    <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <Terminal className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">{t.logs.emptyLogsTitle}</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {t.logs.emptyLogsDesc}
              </p>
            </div>
          ) : (
            <div>
              <div className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => {
                  const config = levelConfigMap[log.level] || levelConfigMap.INFO;
                  const IconComponent = config.icon;
                  const isExpanded = expandedLogIds.has(log.id);
                  const hasDetails = Boolean(log.details && log.details.trim());
                  const isJustArrived = latestLiveLogId === log.id;

                  return (
                    <div
                      key={log.id}
                      className={`p-4 transition-all duration-500 hover:bg-slate-50/80 border-l-4 ${config.cardBorder} ${
                        isJustArrived ? "bg-emerald-50/70 scale-[1.002]" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left: Icon, Badges, Timestamp & Message */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-1.5 rounded-lg ${config.bg} ${config.text} shrink-0 mt-0.5`}>
                            <IconComponent className="w-4 h-4" />
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Severidade Badge */}
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${config.bg} ${config.text} border ${config.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotBg}`}></span>
                                {config.label}
                              </span>

                              {/* Categoria Pill */}
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                {log.category}
                              </span>

                              {/* Timestamp com Formato Relativo e Tooltip */}
                              <Tooltip content={formatDateTimeLocale(log.timestamp, locale)}>
                                <span className="text-xs text-slate-400 font-medium flex items-center gap-1 cursor-default">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>{formatRelativeTimeLocale(log.timestamp, locale)}</span>
                                </span>
                              </Tooltip>

                              {/* Live Badge if just arrived */}
                              {isJustArrived && (
                                <span className="text-[10px] font-extrabold uppercase tracking-wide px-1.5 py-0.2 bg-emerald-500 text-white rounded animate-bounce">
                                  {t.logs.newBadge}
                                </span>
                              )}
                            </div>

                            {/* Mensagem Principal */}
                            <div className="text-xs sm:text-sm font-semibold text-slate-800 break-words pt-0.5">
                              {log.message}
                            </div>
                          </div>
                        </div>

                        {/* Right: Expand details toggle */}
                        {hasDetails && (
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <span>{isExpanded ? t.logs.hideJson : t.logs.viewJson}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Detalhes Expansíveis (JSON Payload / Stack Trace) */}
                      {isExpanded && hasDetails && (
                        <div className="mt-3 pt-3 border-t border-slate-100 pl-9">
                          <div className="relative bg-slate-900 text-slate-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto shadow-inner border border-slate-800">
                            <button
                              onClick={() => handleCopyDetails(log.id, log.details || "")}
                              className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-sans transition-colors cursor-pointer"
                            >
                              {copiedId === log.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">{t.logs.copied}</span>
                                </>
                              ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>{t.logs.copyJson}</span>
                              </>
                            )}
                            </button>
                            <pre className="text-emerald-400/95 whitespace-pre-wrap leading-relaxed pr-24">
                              {log.details}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Controles de Paginação */}
              {logs.length > 0 && (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-3">
                    <span>
                      {t.common.showing} <strong>{Math.min(logs.length, (currentPage - 1) * itemsPerPage + 1)}</strong> {t.common.to} <strong>{Math.min(logs.length, currentPage * itemsPerPage)}</strong> {t.common.of} <strong>{logs.length}</strong> {t.common.events}
                    </span>

                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-slate-400">{t.common.perPage}</span>
                      <div className="w-20">
                        <CustomSelect
                          value={String(itemsPerPage)}
                          onChange={(val) => {
                            setItemsPerPage(Number(val));
                            setCurrentPage(1);
                          }}
                          options={[
                            { value: "10", label: "10" },
                            { value: "25", label: "25" },
                            { value: "50", label: "50" },
                            { value: "100", label: "100" },
                          ]}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">
                      {t.common.page} {currentPage} {t.common.of} {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <Tooltip content={t.common.previousPage}>
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content={t.common.nextPage}>
                        <button
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
