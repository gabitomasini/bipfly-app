import Database from "better-sqlite3";
import path from "path";
import {
  MonitoredRoute,
  FlightHistoryEntry,
  AppSettings,
  FlightPriceRecord,
  AppLog,
  LogLevel,
  LogCategory,
  LogStats,
  LogFilterOptions,
} from "./types";

const DB_NAME = "radar_passagens.db";
const DB_PATH = path.join(process.cwd(), DB_NAME);

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: Database.Database) {
  // 1. Migração de tabelas legadas (Português -> Inglês) se necessário
  migrateLegacySchema(db);

  // 2. Tabela de rotas monitoradas (monitored_routes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_routes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      origin          TEXT    NOT NULL,
      destination     TEXT    NOT NULL,
      flight_date     TEXT    NOT NULL,
      passengers      INTEGER NOT NULL DEFAULT 1 CHECK (passengers >= 1),
      target_price    REAL    NOT NULL CHECK (target_price > 0),
      interval_hours  INTEGER DEFAULT 12,
      is_active       INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT    NOT NULL,
      updated_at      TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_monitored_routes_active ON monitored_routes(is_active);
  `);

  // 3. Tabela de histórico de buscas de voos (flight_history)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flight_history (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      searched_at      TEXT    NOT NULL,
      origin           TEXT    NOT NULL,
      destination      TEXT    NOT NULL,
      flight_date      TEXT    NOT NULL,
      lowest_price     REAL    NOT NULL,
      currency         TEXT    NOT NULL DEFAULT 'BRL',
      route_id         INTEGER,
      airline          TEXT,
      flight_number    TEXT,
      departure_time   TEXT,
      arrival_time     TEXT,
      stops            INTEGER,
      duration_minutes INTEGER,
      booking_link     TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_flight_history_route_id ON flight_history(route_id);
    CREATE INDEX IF NOT EXISTS idx_flight_history_searched_at ON flight_history(searched_at);
  `);

  // 4. Tabela de preços brutos / leituras estatísticas (flight_prices)
  db.exec(`
    CREATE TABLE IF NOT EXISTS flight_prices (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      origin          TEXT    NOT NULL,
      destination     TEXT    NOT NULL,
      departure_date  TEXT    NOT NULL,
      price           REAL    NOT NULL CHECK (price > 0),
      recorded_at     TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_flight_prices_lookup ON flight_prices(origin, destination, departure_date);
    CREATE INDEX IF NOT EXISTS idx_flight_prices_recorded_at ON flight_prices(recorded_at);
  `);

  // 5. Tabela de configurações da aplicação (app_settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // 6. Tabela de Logs de Execução e Auditoria (app_logs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp  TEXT NOT NULL,
      level      TEXT NOT NULL CHECK (level IN ('INFO', 'SUCCESS', 'WARN', 'ERROR')),
      category   TEXT NOT NULL,
      message    TEXT NOT NULL,
      details    TEXT,
      route_id   INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
    CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);
  `);

  // Inserir valores padrão de configurações caso não existam
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
  `);

  const now = new Date().toISOString();
  insertSetting.run("schedule_hours", process.env.SCHEDULE_HOURS || "00:00,03:00,06:00,09:00,12:00,15:00,18:00,21:00", now);
  insertSetting.run("search_provider", "scraper", now);
  insertSetting.run("serpapi_api_key", process.env.SERPAPI_API_KEY || "", now);
  insertSetting.run("ntfy_topic", process.env.NTFY_TOPIC || "radar-passagens", now);
  insertSetting.run("auto_notify", "true", now);
}

/**
 * Migra esquemas antigos com colunas em português para o padrão em inglês preservando dados.
 */
function migrateLegacySchema(db: Database.Database) {
  try {
    // 1. Verifica se monitored_routes tem colunas antigas em português
    const routeCols = db.prepare("PRAGMA table_info(monitored_routes)").all() as { name: string }[];
    const routeColNames = new Set(routeCols.map((c) => c.name));

    if (routeColNames.has("origem") || routeColNames.has("preco_limite")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS monitored_routes_new (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          origin          TEXT    NOT NULL,
          destination     TEXT    NOT NULL,
          flight_date     TEXT    NOT NULL,
          passengers      INTEGER NOT NULL DEFAULT 1 CHECK (passengers >= 1),
          target_price    REAL    NOT NULL CHECK (target_price > 0),
          interval_hours  INTEGER DEFAULT 12,
          is_active       INTEGER NOT NULL DEFAULT 1,
          created_at      TEXT    NOT NULL,
          updated_at      TEXT    NOT NULL
        );

        INSERT INTO monitored_routes_new (id, origin, destination, flight_date, passengers, target_price, interval_hours, is_active, created_at, updated_at)
        SELECT 
          id,
          origem,
          destino,
          data_voo,
          COALESCE(passageiros, 1),
          preco_limite,
          COALESCE(intervalo_horas, 12),
          COALESCE(ativo, 1),
          COALESCE(criado_em, datetime('now')),
          COALESCE(atualizado_em, datetime('now'))
        FROM monitored_routes;

        DROP TABLE monitored_routes;
        ALTER TABLE monitored_routes_new RENAME TO monitored_routes;
      `);
    }

    // 2. Verifica se flight_history tem colunas antigas em português
    const historyCols = db.prepare("PRAGMA table_info(flight_history)").all() as { name: string }[];
    const historyColNames = new Set(historyCols.map((c) => c.name));

    if (historyColNames.has("data_consulta") || historyColNames.has("menor_preco") || historyColNames.has("origem")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS flight_history_new (
          id               INTEGER PRIMARY KEY AUTOINCREMENT,
          searched_at      TEXT    NOT NULL,
          origin           TEXT    NOT NULL,
          destination      TEXT    NOT NULL,
          flight_date      TEXT    NOT NULL,
          lowest_price     REAL    NOT NULL,
          currency         TEXT    NOT NULL DEFAULT 'BRL',
          route_id         INTEGER,
          airline          TEXT,
          flight_number    TEXT,
          departure_time   TEXT,
          arrival_time     TEXT,
          stops            INTEGER,
          duration_minutes INTEGER,
          booking_link     TEXT
        );

        INSERT INTO flight_history_new (
          id, searched_at, origin, destination, flight_date, lowest_price, currency,
          route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link
        )
        SELECT 
          id,
          data_consulta,
          origem,
          destino,
          data_voo,
          menor_preco,
          COALESCE(moeda, 'BRL'),
          route_id,
          cia_aerea,
          numero_voo,
          partida_horario,
          chegada_horario,
          escalas,
          duracao_minutos,
          link_compra
        FROM flight_history;

        DROP TABLE flight_history;
        ALTER TABLE flight_history_new RENAME TO flight_history;
      `);
    }

    // 3. Verifica app_settings atualizado_em -> updated_at
    const settingsCols = db.prepare("PRAGMA table_info(app_settings)").all() as { name: string }[];
    const settingsColNames = new Set(settingsCols.map((c) => c.name));
    if (settingsColNames.has("atualizado_em")) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS app_settings_new (
          key         TEXT PRIMARY KEY,
          value       TEXT NOT NULL,
          updated_at  TEXT NOT NULL
        );
        INSERT OR IGNORE INTO app_settings_new (key, value, updated_at)
        SELECT key, value, atualizado_em FROM app_settings;
        DROP TABLE app_settings;
        ALTER TABLE app_settings_new RENAME TO app_settings;
      `);
    }
  } catch (err) {
    console.error("Erro durante migração de esquema legado:", err);
  }
}

// ==========================================
// Monitored Routes (CRUD)
// ==========================================

export function listRoutes(activeOnly = false): MonitoredRoute[] {
  const db = getDatabase();
  const query = activeOnly
    ? `SELECT r.*, 
        (SELECT lowest_price FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_price,
        (SELECT MIN(lowest_price) FROM flight_history WHERE route_id = r.id) as lowest_historical_price,
        (SELECT searched_at FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_searched_at,
        (SELECT airline FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_airline,
        (SELECT flight_number FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_flight_number,
        (SELECT booking_link FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_booking_link,
        (SELECT COUNT(*) FROM flight_history WHERE route_id = r.id) as total_searches
       FROM monitored_routes r
       WHERE r.is_active = 1
       ORDER BY r.created_at DESC`
    : `SELECT r.*, 
        (SELECT lowest_price FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_price,
        (SELECT MIN(lowest_price) FROM flight_history WHERE route_id = r.id) as lowest_historical_price,
        (SELECT searched_at FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_searched_at,
        (SELECT airline FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_airline,
        (SELECT flight_number FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_flight_number,
        (SELECT booking_link FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_booking_link,
        (SELECT COUNT(*) FROM flight_history WHERE route_id = r.id) as total_searches
       FROM monitored_routes r
       ORDER BY r.created_at DESC`;

  const rows = db.prepare(query).all() as any[];
  return rows.map(mapRouteRow);
}

export function findRouteById(id: number): MonitoredRoute | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT r.*,
        (SELECT lowest_price FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_price,
        (SELECT MIN(lowest_price) FROM flight_history WHERE route_id = r.id) as lowest_historical_price,
        (SELECT searched_at FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_searched_at,
        (SELECT airline FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_airline,
        (SELECT flight_number FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_flight_number,
        (SELECT booking_link FROM flight_history WHERE route_id = r.id ORDER BY searched_at DESC, id DESC LIMIT 1) as last_booking_link,
        (SELECT COUNT(*) FROM flight_history WHERE route_id = r.id) as total_searches
       FROM monitored_routes r 
       WHERE r.id = ?`
    )
    .get(id) as any;

  if (!row) return null;
  return mapRouteRow(row);
}

export function createRoute(data: {
  origin: string;
  destination: string;
  flightDate: string;
  passengers?: number;
  targetPrice: number;
  intervalHours?: number;
}): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO monitored_routes (
      origin, destination, flight_date, passengers, target_price, interval_hours, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const info = stmt.run(
    data.origin.trim().toUpperCase(),
    data.destination.trim().toUpperCase(),
    data.flightDate.trim(),
    data.passengers || 1,
    data.targetPrice,
    data.intervalHours || 12,
    now,
    now
  );

  return Number(info.lastInsertRowid);
}

export function updateRoute(
  id: number,
  data: Partial<{
    origin: string;
    destination: string;
    flightDate: string;
    passengers: number;
    targetPrice: number;
    intervalHours: number;
    isActive: boolean;
  }>
): boolean {
  const db = getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.origin !== undefined) {
    fields.push("origin = ?");
    values.push(data.origin.trim().toUpperCase());
  }
  if (data.destination !== undefined) {
    fields.push("destination = ?");
    values.push(data.destination.trim().toUpperCase());
  }
  if (data.flightDate !== undefined) {
    fields.push("flight_date = ?");
    values.push(data.flightDate.trim());
  }
  if (data.passengers !== undefined) {
    fields.push("passengers = ?");
    values.push(data.passengers);
  }
  if (data.targetPrice !== undefined) {
    fields.push("target_price = ?");
    values.push(data.targetPrice);
  }
  if (data.intervalHours !== undefined) {
    fields.push("interval_hours = ?");
    values.push(data.intervalHours);
  }
  if (data.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) return false;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE monitored_routes SET ${fields.join(", ")} WHERE id = ?`);
  const info = stmt.run(...values);
  return info.changes > 0;
}

export function deleteRoute(id: number): boolean {
  const db = getDatabase();
  const deleteHistory = db.prepare("DELETE FROM flight_history WHERE route_id = ?");
  const deleteRouteStmt = db.prepare("DELETE FROM monitored_routes WHERE id = ?");

  const tx = db.transaction(() => {
    deleteHistory.run(id);
    return deleteRouteStmt.run(id).changes > 0;
  });

  return tx();
}

function mapRouteRow(row: any): MonitoredRoute {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    flightDate: row.flight_date,
    passengers: row.passengers,
    targetPrice: row.target_price,
    intervalHours: row.interval_hours,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    latestPrice: row.latest_price ?? null,
    lowestHistoricalPrice: row.lowest_historical_price ?? null,
    lastSearchedAt: row.last_searched_at ?? null,
    lastAirline: row.last_airline ?? null,
    lastFlightNumber: row.last_flight_number ?? null,
    lastBookingLink: row.last_booking_link ?? null,
    totalSearches: row.total_searches ?? 0,
  };
}

// ==========================================
// Flight History (flight_history)
// ==========================================

export function recordFlightHistory(data: {
  searchedAt?: string;
  origin: string;
  destination: string;
  flightDate: string;
  lowestPrice: number;
  currency?: string;
  routeId?: number | null;
  airline?: string | null;
  flightNumber?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  stops?: number | null;
  durationMinutes?: number | null;
  bookingLink?: string | null;
}): number {
  const db = getDatabase();
  const searchedAt = data.searchedAt || new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO flight_history (
      searched_at, origin, destination, flight_date, lowest_price, currency,
      route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    searchedAt,
    data.origin.trim().toUpperCase(),
    data.destination.trim().toUpperCase(),
    data.flightDate.trim(),
    data.lowestPrice,
    data.currency || "BRL",
    data.routeId || null,
    data.airline || null,
    data.flightNumber || null,
    data.departureTime || null,
    data.arrivalTime || null,
    data.stops ?? null,
    data.durationMinutes ?? null,
    data.bookingLink || null
  );

  // Também grava na tabela estatística flight_prices
  insertFlightPrice({
    origin: data.origin,
    destination: data.destination,
    departureDate: data.flightDate,
    price: data.lowestPrice,
    recordedAt: searchedAt,
  });

  return Number(info.lastInsertRowid);
}

/**
 * Insere registros de preços históricos retroativos em lote sem duplicar registros para a mesma rota e data
 */
export function bulkInsertHistoricalFlightPrices(
  routeId: number,
  points: { date: string; price: number; currency?: string; source?: string }[]
): { inserted: number; skipped: number } {
  const db = getDatabase();
  const route = findRouteById(routeId);
  if (!route) {
    throw new Error(`Rota #${routeId} não encontrada para inserção de histórico.`);
  }

  // Verifica se já existe registro com a mesma data para a rota
  const checkStmt = db.prepare(`
    SELECT id FROM flight_history 
    WHERE route_id = ? AND substr(searched_at, 1, 10) = ?
    LIMIT 1
  `);

  const insertHistoryStmt = db.prepare(`
    INSERT INTO flight_history (
      searched_at, origin, destination, flight_date, lowest_price, currency,
      route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPriceStmt = db.prepare(`
    INSERT INTO flight_prices (origin, destination, departure_date, price, recorded_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  let skipped = 0;

  const tx = db.transaction(() => {
    for (const pt of points) {
      const datePart = pt.date.slice(0, 10);
      const existing = checkStmt.get(routeId, datePart);
      if (existing) {
        skipped++;
        continue;
      }

      const searchedAt = `${datePart}T12:00:00.000Z`;
      const airlineName = pt.source || "Google Flights (Histórico)";

      insertHistoryStmt.run(
        searchedAt,
        route.origin,
        route.destination,
        route.flightDate,
        pt.price,
        pt.currency || "BRL",
        route.id,
        airlineName,
        null,
        null,
        null,
        null,
        null,
        null
      );

      insertPriceStmt.run(
        route.origin,
        route.destination,
        route.flightDate,
        pt.price,
        searchedAt
      );

      inserted++;
    }
  });

  tx();

  return { inserted, skipped };
}

export function getHistoryByRoute(routeId: number, limit = 50): FlightHistoryEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM flight_history 
    WHERE route_id = ? 
    ORDER BY searched_at DESC, id DESC 
    LIMIT ?
  `);
  const rows = stmt.all(routeId, limit) as any[];
  return rows.map(mapHistoryRow);
}

export function getAllHistory(limit = 200): FlightHistoryEntry[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM flight_history 
    ORDER BY searched_at DESC, id DESC 
    LIMIT ?
  `);
  const rows = stmt.all(limit) as any[];
  return rows.map(mapHistoryRow);
}

function mapHistoryRow(row: any): FlightHistoryEntry {
  return {
    id: row.id,
    searchedAt: row.searched_at,
    origin: row.origin,
    destination: row.destination,
    flightDate: row.flight_date,
    lowestPrice: row.lowest_price,
    currency: row.currency || "BRL",
    routeId: row.route_id ?? null,
    airline: row.airline ?? null,
    flightNumber: row.flight_number ?? null,
    departureTime: row.departure_time ?? null,
    arrivalTime: row.arrival_time ?? null,
    stops: row.stops ?? null,
    durationMinutes: row.duration_minutes ?? null,
    bookingLink: row.booking_link ?? null,
  };
}

// ==========================================
// App Settings (app_settings)
// ==========================================

export function getAppSettings(): AppSettings {
  const db = getDatabase();
  const rows = db.prepare("SELECT key, value FROM app_settings").all() as {
    key: string;
    value: string;
  }[];

  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }

  return {
    scheduleHours: map["schedule_hours"] || "00:00,03:00,06:00,09:00,12:00,15:00,18:00,21:00",
    searchProvider: (map["search_provider"] as any) || "scraper",
    serpApiKey: map["serpapi_api_key"] || "",
    ntfyTopic: map["ntfy_topic"] || "radar-passagens",
    autoNotify: map["auto_notify"] !== "false",
  };
}

export function saveAppSettings(newSettings: Partial<AppSettings>): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);

  const tx = db.transaction(() => {
    if (newSettings.scheduleHours !== undefined) {
      stmt.run("schedule_hours", newSettings.scheduleHours, now);
    }
    if (newSettings.searchProvider !== undefined) {
      stmt.run("search_provider", newSettings.searchProvider, now);
    }
    if (newSettings.serpApiKey !== undefined) {
      stmt.run("serpapi_api_key", newSettings.serpApiKey, now);
    }
    if (newSettings.ntfyTopic !== undefined) {
      stmt.run("ntfy_topic", newSettings.ntfyTopic, now);
    }
    if (newSettings.autoNotify !== undefined) {
      stmt.run("auto_notify", newSettings.autoNotify ? "true" : "false", now);
    }
  });

  tx();
  return true;
}

// ==========================================
// Raw Prices & Statistics (flight_prices)
// ==========================================

export function insertFlightPrice(data: {
  origin: string;
  destination: string;
  departureDate: string;
  price: number;
  recordedAt?: string;
}): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO flight_prices (origin, destination, departure_date, price, recorded_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const departureDate = data.departureDate || (data as any).departure_date || "";
  const recordedAt = data.recordedAt || (data as any).recorded_at || new Date().toISOString();

  const info = stmt.run(
    data.origin.trim().toUpperCase(),
    data.destination.trim().toUpperCase(),
    departureDate.trim(),
    data.price,
    recordedAt
  );

  return Number(info.lastInsertRowid);
}

export function getRecentPriceHistory(
  origin: string,
  destination: string,
  departureDate: string,
  days = 30
): FlightPriceRecord[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      id, origin, destination, departure_date as departureDate, price, recorded_at as recordedAt
    FROM flight_prices 
    WHERE origin = ? 
      AND destination = ? 
      AND departure_date = ? 
      AND datetime(recorded_at) >= datetime('now', ?)
    ORDER BY recorded_at ASC
  `);

  return stmt.all(
    origin.trim().toUpperCase(),
    destination.trim().toUpperCase(),
    departureDate.trim(),
    `-${days} days`
  ) as FlightPriceRecord[];
}

// ==========================================
// System Execution Logs (app_logs)
// ==========================================

export function recordLog(data: {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  routeId?: number | null;
  timestamp?: string;
}): number {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO app_logs (timestamp, level, category, message, details, route_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let detailsStr: string | null = null;
  if (data.details !== undefined && data.details !== null) {
    if (typeof data.details === "string") {
      detailsStr = data.details;
    } else {
      try {
        detailsStr = JSON.stringify(data.details, null, 2);
      } catch {
        detailsStr = String(data.details);
      }
    }
  }

  const info = stmt.run(
    data.timestamp || new Date().toISOString(),
    data.level,
    data.category,
    data.message,
    detailsStr,
    data.routeId || null
  );

  return Number(info.lastInsertRowid);
}

export function getLogs(options: LogFilterOptions = {}): { logs: AppLog[]; total: number } {
  const db = getDatabase();
  const {
    level = "ALL",
    category = "ALL",
    search = "",
    routeId,
    limit = 100,
    offset = 0,
  } = options;

  const conditions: string[] = [];
  const params: any[] = [];

  if (level && level !== "ALL") {
    conditions.push("level = ?");
    params.push(level);
  }

  if (category && category !== "ALL") {
    conditions.push("category = ?");
    params.push(category);
  }

  if (routeId) {
    conditions.push("route_id = ?");
    params.push(routeId);
  }

  if (search && search.trim()) {
    conditions.push("(message LIKE ? OR details LIKE ?)");
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countStmt = db.prepare(`SELECT COUNT(*) as total FROM app_logs ${whereClause}`);
  const countResult = countStmt.get(...params) as { total: number };
  const total = countResult ? countResult.total : 0;

  // Query records
  const queryStmt = db.prepare(`
    SELECT id, timestamp, level, category, message, details, route_id as routeId
    FROM app_logs 
    ${whereClause} 
    ORDER BY timestamp DESC, id DESC 
    LIMIT ? OFFSET ?
  `);

  const logs = queryStmt.all(...params, limit, offset) as AppLog[];
  return { logs, total };
}

export function getLogStats(): LogStats {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) as info,
      SUM(CASE WHEN level = 'SUCCESS' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) as warn,
      SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as error
    FROM app_logs
  `);

  const res = stmt.get() as any;
  return {
    total: res?.total || 0,
    info: res?.info || 0,
    success: res?.success || 0,
    warn: res?.warn || 0,
    error: res?.error || 0,
  };
}

export function clearLogs(days?: number): number {
  const db = getDatabase();
  if (days && days > 0) {
    const stmt = db.prepare(`
      DELETE FROM app_logs 
      WHERE datetime(timestamp) < datetime('now', ?)
    `);
    const res = stmt.run(`-${days} days`);
    return res.changes;
  }

  const stmt = db.prepare("DELETE FROM app_logs");
  const res = stmt.run();
  return res.changes;
}

// Backward-compatibility aliases during transition
export const listarRotas = listRoutes;
export const buscarRotaPorId = findRouteById;
export const criarRota = createRoute;
export const atualizarRota = updateRoute;
export const excluirRota = deleteRoute;
export const registrarHistorico = recordFlightHistory;
export const obterHistoricoPorRota = getHistoryByRoute;
export const obterTodoHistorico = getAllHistory;
export const obterConfiguracoes = getAppSettings;
export const salvarConfiguracoes = saveAppSettings;
export const gravarLogDb = recordLog;
export const obterLogsDb = getLogs;
export const obterEstatisticasLogsDb = getLogStats;
export const limparLogsDb = clearLogs;
export const inserirFlightPrice = insertFlightPrice;
export const buscarHistoricoPrecosRecentes = getRecentPriceHistory;
