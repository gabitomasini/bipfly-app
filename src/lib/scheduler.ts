import cron, { ScheduledTask } from "node-cron";
import { getAppSettings } from "./db";
import { scanAllActiveRoutes } from "./scanner";
import { SchedulerStatus } from "./types";
import { logger } from "./logger";

interface SchedulerState {
  tasks: ScheduledTask[];
  running: boolean;
  lastRun: string | null;
  lastRunStatus: "success" | "error" | "running" | "idle";
  lastRunSummary: string | null;
  activeHours: string[];
}

// In-memory singleton state for the Node.js runtime
declare global {
  // eslint-disable-next-line no-var
  var __flightSchedulerState: SchedulerState | undefined;
}

const state: SchedulerState = global.__flightSchedulerState || {
  tasks: [],
  running: false,
  lastRun: null,
  lastRunStatus: "idle",
  lastRunSummary: null,
  activeHours: [],
};

global.__flightSchedulerState = state;

const DEFAULT_SCHEDULE_HOURS = [
  "00:00",
  "03:00",
  "06:00",
  "09:00",
  "12:00",
  "15:00",
  "18:00",
  "21:00",
];

export function parseScheduleHours(hoursStr: string): string[] {
  if (!hoursStr) return DEFAULT_SCHEDULE_HOURS;
  const parts = hoursStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s));

  return parts.length > 0 ? parts : DEFAULT_SCHEDULE_HOURS;
}

export function calculateNextRun(hours: string[]): string | null {
  if (!hours || hours.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parsed = hours
    .map((h) => {
      const [hh, mm] = h.split(":").map(Number);
      return { str: h, mins: hh * 60 + mm };
    })
    .sort((a, b) => a.mins - b.mins);

  for (const item of parsed) {
    if (item.mins > currentMinutes) {
      const nextDate = new Date(now);
      const [hh, mm] = item.str.split(":").map(Number);
      nextDate.setHours(hh, mm, 0, 0);
      return nextDate.toISOString();
    }
  }

  const first = parsed[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hh, mm] = first.str.split(":").map(Number);
  tomorrow.setHours(hh, mm, 0, 0);
  return tomorrow.toISOString();
}

async function triggerScheduledScan(triggerSource = "Scheduler") {
  logger.info("SCHEDULER", `⏰ [${triggerSource}] Iniciando varredura programada de passagens...`);
  state.lastRunStatus = "running";
  state.lastRun = new Date().toISOString();

  try {
    const res = await scanAllActiveRoutes();
    state.lastRunStatus = "success";
    state.lastRunSummary = `${res.successes}/${res.totalRoutes} rotas verificadas com sucesso. (${res.alertsTriggered} alertas enviados)`;
    logger.success("SCHEDULER", `Varredura programada finalizada: ${state.lastRunSummary}`, res);
  } catch (err: any) {
    state.lastRunStatus = "error";
    state.lastRunSummary = `Erro na execução programada: ${err.message}`;
    logger.error("SCHEDULER", `Falha na varredura programada: ${err.message}`, { stack: err.stack });
  }
}

export function startScheduler(): void {
  for (const t of state.tasks) {
    try {
      t.stop();
    } catch {}
  }
  state.tasks = [];

  const settings = getAppSettings();
  const hours = parseScheduleHours(settings.scheduleHours);
  state.activeHours = hours;

  logger.info(
    "SCHEDULER",
    `🚀 Inicializando agendador automático com horários: ${hours.join(", ")} (Fuso: America/Sao_Paulo)`
  );

  for (const h of hours) {
    const [hh, mm] = h.split(":").map(Number);
    const cronExpr = `${mm} ${hh} * * *`;

    try {
      const task = cron.schedule(
        cronExpr,
        () => {
          triggerScheduledScan(`Horário ${h}`);
        },
        {
          timezone: "America/Sao_Paulo",
        }
      );
      state.tasks.push(task);
    } catch (err: any) {
      logger.error("SCHEDULER", `Falha ao agendar horário ${h} (${cronExpr}): ${err.message}`);
    }
  }

  state.running = true;
}

export function restartScheduler(): SchedulerStatus {
  startScheduler();
  return getSchedulerStatus();
}

export function getSchedulerStatus(): SchedulerStatus {
  if (!state.running && state.tasks.length === 0) {
    startScheduler();
  }

  const nextRun = calculateNextRun(state.activeHours);

  return {
    running: state.running,
    scheduleHours: state.activeHours,
    nextRun,
    lastRun: state.lastRun,
    lastRunStatus: state.lastRunStatus,
    lastRunSummary: state.lastRunSummary,
  };
}

export async function triggerImmediateScan() {
  return await scanAllActiveRoutes();
}

// Backward-compatibility aliases
export const iniciarScheduler = startScheduler;
export const reiniciarScheduler = restartScheduler;
export const obterStatusScheduler = getSchedulerStatus;
export const dispararBuscaImediata = triggerImmediateScan;
export const calcularProximaExecucao = calculateNextRun;
