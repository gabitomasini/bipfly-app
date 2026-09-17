import { EventEmitter } from "events";
import { recordLog } from "./db";
import { AppLog, LogCategory, LogLevel } from "./types";

// Singleton do EventEmitter para Server-Sent Events (SSE) no Node runtime
declare global {
  // eslint-disable-next-line no-var
  var __logEventEmitter: EventEmitter | undefined;
}

export const logEmitter: EventEmitter = global.__logEventEmitter || new EventEmitter();
logEmitter.setMaxListeners(50);
global.__logEventEmitter = logEmitter;

class AppLogger {
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: any,
    routeId?: number | null
  ): AppLog {
    const timestamp = new Date().toISOString();
    const prefix = `[${category}]`;

    // Console output com formatação
    if (level === "ERROR") {
      console.error(`❌ ${prefix} ${message}`, details ? details : "");
    } else if (level === "WARN") {
      console.warn(`⚠️ ${prefix} ${message}`, details ? details : "");
    } else if (level === "SUCCESS") {
      console.log(`✅ ${prefix} ${message}`, details ? details : "");
    } else {
      console.log(`ℹ️ ${prefix} ${message}`, details ? details : "");
    }

    let insertedId = 0;
    // Persistência segura em SQLite
    try {
      insertedId = recordLog({
        timestamp,
        level,
        category,
        message,
        details,
        routeId,
      });
    } catch (err) {
      console.error("Falha ao persistir log no SQLite:", err);
    }

    let detailsStr: string | null = null;
    if (details !== undefined && details !== null) {
      if (typeof details === "string") {
        detailsStr = details;
      } else {
        try {
          detailsStr = JSON.stringify(details, null, 2);
        } catch {
          detailsStr = String(details);
        }
      }
    }

    const logEntry: AppLog = {
      id: insertedId || Date.now(),
      timestamp,
      level,
      category,
      message,
      details: detailsStr,
      routeId: routeId || null,
    };

    // Emite evento em tempo real para os clientes conectados via SSE
    try {
      logEmitter.emit("app_log", logEntry);
    } catch (err) {
      console.error("Falha ao emitir evento SSE:", err);
    }

    return logEntry;
  }

  public info(category: LogCategory, message: string, details?: any, routeId?: number | null) {
    return this.log("INFO", category, message, details, routeId);
  }

  public success(category: LogCategory, message: string, details?: any, routeId?: number | null) {
    return this.log("SUCCESS", category, message, details, routeId);
  }

  public warn(category: LogCategory, message: string, details?: any, routeId?: number | null) {
    return this.log("WARN", category, message, details, routeId);
  }

  public error(category: LogCategory, message: string, details?: any, routeId?: number | null) {
    return this.log("ERROR", category, message, details, routeId);
  }
}

export const logger = new AppLogger();
