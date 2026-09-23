import { createClient, Client, Row } from "@libsql/client";
import path from "path";
import {
  User,
  LoginCode,
  UserSession,
  MonitoredRoute,
  FlightHistoryEntry,
  AppSettings,
  FlightPriceRecord,
  AppLog,
  LogLevel,
  LogCategory,
  LogStats,
  LogFilterOptions,
  OnlineUserStats,
  OnlineUserItem,
} from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __libsqlClient: Client | undefined;
  // eslint-disable-next-line no-var
  var __libsqlSchemaInitialized: boolean | undefined;
}

let clientInstance: Client | null = global.__libsqlClient || null;
let isInitialized = global.__libsqlSchemaInitialized || false;

export function getDatabase(): Client {
  if (!clientInstance) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (tursoUrl) {
      console.log(`[DB] 🌐 Conectando ao Turso Cloud: ${tursoUrl}`);
      clientInstance = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken || undefined,
      });
    } else {
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "radar_passagens.db");
      console.log(`[DB] 📁 Conectando ao SQLite Local: ${dbPath}`);
      clientInstance = createClient({
        url: `file:${dbPath}`,
      });
    }
    global.__libsqlClient = clientInstance;
  }
  return clientInstance;
}

/**
 * Garante que o schema e todas as tabelas estejam criadas no banco de dados.
 */
export async function initSchema(db: Client): Promise<void> {
  // 1. Tabela de Usuários (users)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT,
      email       TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);

  // 2. Tabela de Códigos OTP de Autenticação (login_codes)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS login_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      used_at     TEXT,
      ip_address  TEXT,
      created_at  TEXT NOT NULL
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_login_codes_lookup ON login_codes(user_id, code);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_login_codes_user ON login_codes(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_login_codes_created ON login_codes(created_at);`);

  // 3. Tabela de Sessões Persistentes (user_sessions)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token  TEXT NOT NULL UNIQUE,
      expires_at     TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      last_seen_at   TEXT NOT NULL
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_sessions_last_seen ON user_sessions(last_seen_at);`);

  // 4. Tabela de rotas monitoradas (monitored_routes)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS monitored_routes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
      origin          TEXT    NOT NULL,
      destination     TEXT    NOT NULL,
      flight_date     TEXT    NOT NULL,
      return_date     TEXT,
      trip_type       TEXT    NOT NULL DEFAULT 'one_way',
      passengers      INTEGER NOT NULL DEFAULT 1 CHECK (passengers >= 1),
      children        INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
      infants_in_lap  INTEGER NOT NULL DEFAULT 0 CHECK (infants_in_lap >= 0),
      target_price    REAL    NOT NULL CHECK (target_price > 0),
      interval_hours  INTEGER DEFAULT 12,
      only_direct     INTEGER NOT NULL DEFAULT 0,
      is_active       INTEGER NOT NULL DEFAULT 1,
      last_error      TEXT,
      last_searched_at TEXT,
      created_at      TEXT    NOT NULL,
      updated_at      TEXT    NOT NULL
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_monitored_routes_active ON monitored_routes(is_active);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_monitored_routes_user_id ON monitored_routes(user_id);`);

  // 5. Tabela de histórico de buscas de voos (flight_history)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS flight_history (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      searched_at         TEXT    NOT NULL,
      origin              TEXT    NOT NULL,
      destination         TEXT    NOT NULL,
      flight_date         TEXT    NOT NULL,
      return_date         TEXT,
      trip_type           TEXT    NOT NULL DEFAULT 'one_way',
      passengers          INTEGER NOT NULL DEFAULT 1,
      children            INTEGER NOT NULL DEFAULT 0,
      infants_in_lap      INTEGER NOT NULL DEFAULT 0,
      lowest_price        REAL    NOT NULL,
      currency            TEXT    NOT NULL DEFAULT 'BRL',
      route_id            INTEGER,
      airline             TEXT,
      flight_number       TEXT,
      departure_time      TEXT,
      arrival_time        TEXT,
      stops               INTEGER,
      duration_minutes    INTEGER,
      booking_link        TEXT,
      lowest_direct_price REAL,
      direct_airline      TEXT,
      lowest_stop_price   REAL,
      stop_airline        TEXT,
      stop_count          INTEGER
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_flight_history_route_id ON flight_history(route_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_flight_history_searched_at ON flight_history(searched_at);`);

  // 6. Tabela de preços brutos / leituras estatísticas (flight_prices)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS flight_prices (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      origin          TEXT    NOT NULL,
      destination     TEXT    NOT NULL,
      departure_date  TEXT    NOT NULL,
      price           REAL    NOT NULL CHECK (price > 0),
      recorded_at     TEXT    NOT NULL
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_flight_prices_lookup ON flight_prices(origin, destination, departure_date);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_flight_prices_recorded_at ON flight_prices(recorded_at);`);

  // 7. Tabela de configurações da aplicação (app_settings)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
  `);

  // 8. Tabela de Logs de Execução e Auditoria (app_logs)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp  TEXT NOT NULL,
      level      TEXT NOT NULL CHECK (level IN ('INFO', 'SUCCESS', 'WARN', 'ERROR')),
      category   TEXT NOT NULL,
      message    TEXT NOT NULL,
      details    TEXT,
      route_id   INTEGER
    );
  `);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_app_logs_category ON app_logs(category);`);

  // Inserir valores padrão de configurações caso não existam
  const now = new Date().toISOString();
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    args: ["schedule_hours", process.env.SCHEDULE_HOURS || "00:00,12:00", now],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    args: ["search_provider", "scraper", now],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    args: ["serpapi_api_key", process.env.SERPAPI_API_KEY || "", now],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    args: ["ntfy_topic", process.env.NTFY_TOPIC || "radar-passagens", now],
  });
  await db.execute({
    sql: `INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)`,
    args: ["auto_notify", "true", now],
  });
}

export async function ensureInitialized(): Promise<Client> {
  const db = getDatabase();
  if (!isInitialized) {
    try {
      await initSchema(db);
      isInitialized = true;
      global.__libsqlSchemaInitialized = true;
    } catch (err) {
      console.error("Erro ao inicializar schema do banco:", err);
    }
  }
  return db;
}

// ==========================================
// User & Authentication Helpers
// ==========================================

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) LIMIT 1",
    args: [email],
  });
  if (res.rows.length === 0) return null;
  return mapUserRow(res.rows[0]);
}

export async function findUserById(id: number): Promise<User | null> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return mapUserRow(res.rows[0]);
}

export async function createUser(data: { email: string; name?: string | null }): Promise<User> {
  const db = await ensureInitialized();
  const now = new Date().toISOString();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name ? data.name.trim() : null;

  const res = await db.execute({
    sql: "INSERT INTO users (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)",
    args: [cleanEmail, cleanName, now, now],
  });

  const id = Number(res.lastInsertRowid);
  return {
    id,
    email: cleanEmail,
    name: cleanName,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getOrCreateUser(email: string, name?: string | null): Promise<User> {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (name && name.trim() && !existing.name) {
      const db = await ensureInitialized();
      const now = new Date().toISOString();
      await db.execute({
        sql: "UPDATE users SET name = ?, updated_at = ? WHERE id = ?",
        args: [name.trim(), now, existing.id],
      });
      return { ...existing, name: name.trim(), updatedAt: now };
    }
    return existing;
  }
  return await createUser({ email, name });
}

export async function createLoginCode(data: {
  userId: number;
  code: string;
  ipAddress?: string | null;
  expiresInMinutes?: number;
}): Promise<LoginCode> {
  const db = await ensureInitialized();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresInMin = data.expiresInMinutes || 15;
  const expiresAt = new Date(now.getTime() + expiresInMin * 60 * 1000).toISOString();

  const res = await db.execute({
    sql: "INSERT INTO login_codes (user_id, code, expires_at, used_at, ip_address, created_at) VALUES (?, ?, ?, NULL, ?, ?)",
    args: [data.userId, data.code.trim(), expiresAt, data.ipAddress || null, createdAt],
  });

  return {
    id: Number(res.lastInsertRowid),
    userId: data.userId,
    code: data.code.trim(),
    expiresAt,
    usedAt: null,
    ipAddress: data.ipAddress || null,
    createdAt,
  };
}

export async function findValidLoginCode(userId: number, code: string): Promise<LoginCode | null> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `SELECT * FROM login_codes 
          WHERE user_id = ? AND code = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
          ORDER BY created_at DESC LIMIT 1`,
    args: [userId, code.trim()],
  });
  if (res.rows.length === 0) return null;
  return mapLoginCodeRow(res.rows[0]);
}

export async function markLoginCodeUsed(id: number): Promise<boolean> {
  const db = await ensureInitialized();
  const now = new Date().toISOString();
  const res = await db.execute({
    sql: "UPDATE login_codes SET used_at = ? WHERE id = ?",
    args: [now, id],
  });
  return res.rowsAffected > 0;
}

export async function countRecentLoginCodes(userId: number, minutes = 15): Promise<number> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `SELECT COUNT(*) as count FROM login_codes 
          WHERE user_id = ? AND datetime(created_at) >= datetime('now', ?)`,
    args: [userId, `-${minutes} minutes`],
  });
  return Number(res.rows[0]?.count || 0);
}

export async function countRecentLoginCodesByEmail(email: string, minutes = 15): Promise<number> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `SELECT COUNT(lc.id) as count 
          FROM login_codes lc
          JOIN users u ON lc.user_id = u.id
          WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) AND datetime(lc.created_at) >= datetime('now', ?)`,
    args: [email, `-${minutes} minutes`],
  });
  return Number(res.rows[0]?.count || 0);
}

export async function createSession(userId: number, sessionToken: string, durationDays = 60): Promise<UserSession> {
  const db = await ensureInitialized();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const res = await db.execute({
    sql: "INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
    args: [userId, sessionToken, expiresAt, createdAt, createdAt],
  });

  return {
    id: Number(res.lastInsertRowid),
    userId,
    sessionToken,
    expiresAt,
    createdAt,
    lastSeenAt: createdAt,
  };
}

export async function findSessionByToken(sessionToken: string): Promise<{ session: UserSession; user: User } | null> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `SELECT s.*, u.id as u_id, u.name as u_name, u.email as u_email, u.created_at as u_created_at, u.updated_at as u_updated_at
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE s.session_token = ? AND datetime(s.expires_at) > datetime('now')
          LIMIT 1`,
    args: [sessionToken],
  });

  if (res.rows.length === 0) return null;
  const row = res.rows[0] as any;

  const now = new Date().toISOString();
  await db.execute({
    sql: "UPDATE user_sessions SET last_seen_at = ? WHERE id = ?",
    args: [now, row.id],
  });

  return {
    session: {
      id: Number(row.id),
      userId: Number(row.user_id),
      sessionToken: String(row.session_token),
      expiresAt: String(row.expires_at),
      createdAt: String(row.created_at),
      lastSeenAt: now,
    },
    user: {
      id: Number(row.u_id),
      name: row.u_name ? String(row.u_name) : null,
      email: String(row.u_email),
      createdAt: String(row.u_created_at),
      updatedAt: String(row.u_updated_at),
    },
  };
}

export async function deleteSessionByToken(sessionToken: string): Promise<boolean> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: "DELETE FROM user_sessions WHERE session_token = ?",
    args: [sessionToken],
  });
  return res.rowsAffected > 0;
}

export async function deleteUserSessions(userId: number): Promise<boolean> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: "DELETE FROM user_sessions WHERE user_id = ?",
    args: [userId],
  });
  return res.rowsAffected > 0;
}

function mapUserRow(row: any): User {
  return {
    id: Number(row.id),
    name: row.name ? String(row.name) : null,
    email: String(row.email),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapLoginCodeRow(row: any): LoginCode {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    code: String(row.code),
    expiresAt: String(row.expires_at),
    usedAt: row.used_at ? String(row.used_at) : null,
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    createdAt: String(row.created_at),
  };
}

// ==========================================
// Monitored Routes (CRUD)
// ==========================================

export async function listRoutes(
  filterOrActiveOnly?: boolean | { userId?: number; activeOnly?: boolean },
  userIdParam?: number
): Promise<MonitoredRoute[]> {
  const db = await ensureInitialized();
  let activeOnly = false;
  let userId: number | undefined = undefined;

  if (typeof filterOrActiveOnly === "boolean") {
    activeOnly = filterOrActiveOnly;
    userId = userIdParam;
  } else if (filterOrActiveOnly && typeof filterOrActiveOnly === "object") {
    activeOnly = Boolean(filterOrActiveOnly.activeOnly);
    userId = filterOrActiveOnly.userId;
  }

  const historySubquery = `
    FROM flight_history 
    WHERE origin = r.origin 
      AND destination = r.destination 
      AND flight_date = r.flight_date
      AND COALESCE(trip_type, 'one_way') = COALESCE(r.trip_type, 'one_way')
      AND (
        (COALESCE(r.trip_type, 'one_way') = 'round_trip' AND return_date = r.return_date AND return_date IS NOT NULL AND return_date != '')
        OR
        (COALESCE(r.trip_type, 'one_way') = 'one_way' AND (return_date IS NULL OR return_date = ''))
      )
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (activeOnly) {
    conditions.push("r.is_active = 1");
  }
  if (userId !== undefined && userId !== null) {
    conditions.push("r.user_id = ?");
    params.push(userId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT r.*, u.name as user_name, u.email as user_email,
      (SELECT lowest_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_price,
      (SELECT MIN(lowest_price) ${historySubquery}) as lowest_historical_price,
      (SELECT searched_at ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_searched_at,
      (SELECT airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_airline,
      (SELECT flight_number ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_flight_number,
      (SELECT stops ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_stops,
      (SELECT booking_link ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_booking_link,
      (SELECT lowest_direct_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_direct_price,
      (SELECT direct_airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_direct_airline,
      (SELECT lowest_stop_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_price,
      (SELECT stop_airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_airline,
      (SELECT stop_count ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_count,
      (SELECT COUNT(*) ${historySubquery}) as total_searches
    FROM monitored_routes r
    LEFT JOIN users u ON r.user_id = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `;

  const res = await db.execute({ sql: query, args: params });
  return res.rows.map(mapRouteRow);
}

export async function findRouteById(id: number, userId?: number): Promise<MonitoredRoute | null> {
  const db = await ensureInitialized();
  const historySubquery = `
    FROM flight_history 
    WHERE origin = r.origin 
      AND destination = r.destination 
      AND flight_date = r.flight_date
      AND COALESCE(trip_type, 'one_way') = COALESCE(r.trip_type, 'one_way')
      AND (
        (COALESCE(r.trip_type, 'one_way') = 'round_trip' AND return_date = r.return_date AND return_date IS NOT NULL AND return_date != '')
        OR
        (COALESCE(r.trip_type, 'one_way') = 'one_way' AND (return_date IS NULL OR return_date = ''))
      )
  `;

  const conditions = ["r.id = ?"];
  const params: any[] = [id];

  if (userId !== undefined && userId !== null) {
    conditions.push("r.user_id = ?");
    params.push(userId);
  }

  const query = `
    SELECT r.*, u.name as user_name, u.email as user_email,
      (SELECT lowest_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_price,
      (SELECT MIN(lowest_price) ${historySubquery}) as lowest_historical_price,
      (SELECT searched_at ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_searched_at,
      (SELECT airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_airline,
      (SELECT flight_number ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_flight_number,
      (SELECT stops ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_stops,
      (SELECT booking_link ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as last_booking_link,
      (SELECT lowest_direct_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_direct_price,
      (SELECT direct_airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_direct_airline,
      (SELECT lowest_stop_price ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_price,
      (SELECT stop_airline ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_airline,
      (SELECT stop_count ${historySubquery} ORDER BY searched_at DESC, id DESC LIMIT 1) as latest_stop_count,
      (SELECT COUNT(*) ${historySubquery}) as total_searches
     FROM monitored_routes r 
     LEFT JOIN users u ON r.user_id = u.id
     WHERE ${conditions.join(" AND ")}
     LIMIT 1
  `;

  const res = await db.execute({ sql: query, args: params });
  if (res.rows.length === 0) return null;
  return mapRouteRow(res.rows[0]);
}

export async function createRoute(data: {
  userId: number;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers?: number;
  children?: number;
  infantsInLap?: number;
  targetPrice: number;
  intervalHours?: number;
  onlyDirect?: boolean;
}): Promise<number> {
  const db = await ensureInitialized();
  const now = new Date().toISOString();
  const returnDate = data.returnDate ? data.returnDate.trim() : null;
  const tripType = data.tripType || (returnDate ? "round_trip" : "one_way");

  const res = await db.execute({
    sql: `
      INSERT INTO monitored_routes (
        user_id, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, target_price, interval_hours, only_direct, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `,
    args: [
      data.userId,
      data.origin.trim().toUpperCase(),
      data.destination.trim().toUpperCase(),
      data.flightDate.trim(),
      returnDate,
      tripType,
      data.passengers || 1,
      data.children || 0,
      data.infantsInLap || 0,
      data.targetPrice,
      data.intervalHours || 12,
      data.onlyDirect ? 1 : 0,
      now,
      now,
    ],
  });

  return Number(res.lastInsertRowid);
}

export async function getUserRouteCount(userId: number): Promise<number> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: "SELECT COUNT(*) as count FROM monitored_routes WHERE user_id = ?",
    args: [userId],
  });
  return Number(res.rows[0]?.count || 0);
}

export async function updateRoute(
  id: number,
  data: Partial<{
    origin: string;
    destination: string;
    flightDate: string;
    returnDate: string | null;
    tripType: "one_way" | "round_trip";
    passengers: number;
    children: number;
    infantsInLap: number;
    targetPrice: number;
    intervalHours: number;
    onlyDirect: boolean;
    isActive: boolean;
  }>,
  userId?: number
): Promise<boolean> {
  const db = await ensureInitialized();
  const checkSql = userId !== undefined ? "SELECT * FROM monitored_routes WHERE id = ? AND user_id = ?" : "SELECT * FROM monitored_routes WHERE id = ?";
  const checkParams = userId !== undefined ? [id, userId] : [id];
  const checkRes = await db.execute({ sql: checkSql, args: checkParams });
  if (checkRes.rows.length === 0) return false;
  const currentRoute = checkRes.rows[0] as any;

  const fields: string[] = [];
  const values: any[] = [];

  const newOrigin = data.origin !== undefined ? data.origin.trim().toUpperCase() : String(currentRoute.origin);
  const newDest = data.destination !== undefined ? data.destination.trim().toUpperCase() : String(currentRoute.destination);
  const newDate = data.flightDate !== undefined ? data.flightDate.trim() : String(currentRoute.flight_date);
  const newReturnDate = data.returnDate !== undefined ? (data.returnDate ? data.returnDate.trim() : null) : (currentRoute.return_date ? String(currentRoute.return_date) : null);
  const newTripType = data.tripType !== undefined ? data.tripType : (newReturnDate ? "round_trip" : (String(currentRoute.trip_type) || "one_way"));

  if (data.origin !== undefined) {
    fields.push("origin = ?");
    values.push(newOrigin);
  }
  if (data.destination !== undefined) {
    fields.push("destination = ?");
    values.push(newDest);
  }
  if (data.flightDate !== undefined) {
    fields.push("flight_date = ?");
    values.push(newDate);
  }
  if (data.returnDate !== undefined) {
    fields.push("return_date = ?");
    values.push(newReturnDate);
  }
  if (data.tripType !== undefined) {
    fields.push("trip_type = ?");
    values.push(newTripType);
  }
  if (data.passengers !== undefined) {
    fields.push("passengers = ?");
    values.push(data.passengers);
  }
  if (data.children !== undefined) {
    fields.push("children = ?");
    values.push(data.children);
  }
  if (data.infantsInLap !== undefined) {
    fields.push("infants_in_lap = ?");
    values.push(data.infantsInLap);
  }
  if (data.targetPrice !== undefined) {
    fields.push("target_price = ?");
    values.push(data.targetPrice);
  }
  if (data.intervalHours !== undefined) {
    fields.push("interval_hours = ?");
    values.push(data.intervalHours);
  }
  if (data.onlyDirect !== undefined) {
    fields.push("only_direct = ?");
    values.push(data.onlyDirect ? 1 : 0);
  }
  if (data.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) return false;

  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);
  if (userId !== undefined) {
    values.push(userId);
  }

  const batchOps: { sql: string; args: any[] }[] = [];

  if (
    newOrigin !== currentRoute.origin ||
    newDest !== currentRoute.destination ||
    newDate !== currentRoute.flight_date ||
    newReturnDate !== currentRoute.return_date ||
    newTripType !== currentRoute.trip_type
  ) {
    batchOps.push({
      sql: `
        UPDATE flight_history 
        SET route_id = NULL 
        WHERE route_id = ? AND (
          origin != ? OR destination != ? OR flight_date != ? OR 
          ((return_date IS NULL AND ? IS NOT NULL) OR (return_date IS NOT NULL AND return_date != ?))
        )
      `,
      args: [id, newOrigin, newDest, newDate, newReturnDate, newReturnDate],
    });

    batchOps.push({
      sql: `
        UPDATE flight_history 
        SET route_id = ? 
        WHERE origin = ? AND destination = ? AND flight_date = ? 
          AND ((? IS NULL AND return_date IS NULL) OR return_date = ?)
          AND route_id IS NULL
      `,
      args: [id, newOrigin, newDest, newDate, newReturnDate, newReturnDate],
    });
  }

  const where = userId !== undefined ? "WHERE id = ? AND user_id = ?" : "WHERE id = ?";
  batchOps.push({
    sql: `UPDATE monitored_routes SET ${fields.join(", ")} ${where}`,
    args: values,
  });

  await db.batch(batchOps, "write");
  return true;
}

export async function deleteRoute(id: number, userId?: number): Promise<boolean> {
  const db = await ensureInitialized();
  const checkSql = userId !== undefined ? "SELECT id FROM monitored_routes WHERE id = ? AND user_id = ?" : "SELECT id FROM monitored_routes WHERE id = ?";
  const checkParams = userId !== undefined ? [id, userId] : [id];
  const checkRes = await db.execute({ sql: checkSql, args: checkParams });
  if (checkRes.rows.length === 0) return false;

  const deleteRouteSql = userId !== undefined 
    ? "DELETE FROM monitored_routes WHERE id = ? AND user_id = ?"
    : "DELETE FROM monitored_routes WHERE id = ?";
  const deleteRouteParams = userId !== undefined ? [id, userId] : [id];

  await db.batch(
    [
      { sql: "DELETE FROM flight_history WHERE route_id = ?", args: [id] },
      { sql: deleteRouteSql, args: deleteRouteParams },
    ],
    "write"
  );

  return true;
}

function mapRouteRow(row: any): MonitoredRoute {
  return {
    id: Number(row.id),
    userId: Number(row.user_id || 0),
    origin: String(row.origin),
    destination: String(row.destination),
    flightDate: String(row.flight_date),
    returnDate: row.return_date ? String(row.return_date) : null,
    tripType: (row.trip_type || (row.return_date ? "round_trip" : "one_way")) as "one_way" | "round_trip",
    passengers: Number(row.passengers ?? 1),
    children: Number(row.children ?? 0),
    infantsInLap: Number(row.infants_in_lap ?? 0),
    targetPrice: Number(row.target_price),
    intervalHours: Number(row.interval_hours ?? 12),
    onlyDirect: Boolean(row.only_direct),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    userName: row.user_name ? String(row.user_name) : null,
    userEmail: row.user_email ? String(row.user_email) : null,
    latestPrice: row.latest_price !== null && row.latest_price !== undefined ? Number(row.latest_price) : null,
    lowestHistoricalPrice: row.lowest_historical_price !== null && row.lowest_historical_price !== undefined ? Number(row.lowest_historical_price) : null,
    lastSearchedAt: row.last_searched_at ? String(row.last_searched_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    lastAirline: row.last_airline ? String(row.last_airline) : null,
    lastFlightNumber: row.last_flight_number ? String(row.last_flight_number) : null,
    lastStops: row.last_stops !== null && row.last_stops !== undefined ? Number(row.last_stops) : null,
    lastBookingLink: row.last_booking_link ? String(row.last_booking_link) : null,
    latestDirectPrice: row.latest_direct_price !== null && row.latest_direct_price !== undefined ? Number(row.latest_direct_price) : null,
    latestDirectAirline: row.latest_direct_airline ? String(row.latest_direct_airline) : null,
    latestStopPrice: row.latest_stop_price !== null && row.latest_stop_price !== undefined ? Number(row.latest_stop_price) : null,
    latestStopAirline: row.latest_stop_airline ? String(row.latest_stop_airline) : null,
    latestStopCount: row.latest_stop_count !== null && row.latest_stop_count !== undefined ? Number(row.latest_stop_count) : null,
    totalSearches: Number(row.total_searches ?? 0),
  };
}

export async function updateRouteScanStatus(routeId: number, lastSearchedAt: string, lastError: string | null): Promise<void> {
  const db = await ensureInitialized();
  await db.execute({
    sql: "UPDATE monitored_routes SET last_searched_at = ?, last_error = ?, updated_at = ? WHERE id = ?",
    args: [lastSearchedAt, lastError, new Date().toISOString(), routeId],
  });
}

// ==========================================
// Flight History (flight_history)
// ==========================================

export async function recordFlightHistory(data: {
  searchedAt?: string;
  origin: string;
  destination: string;
  flightDate: string;
  returnDate?: string | null;
  tripType?: "one_way" | "round_trip";
  passengers?: number;
  children?: number;
  infantsInLap?: number;
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
  lowestDirectPrice?: number | null;
  directAirline?: string | null;
  lowestStopPrice?: number | null;
  stopAirline?: string | null;
  stopCount?: number | null;
}): Promise<number> {
  const db = await ensureInitialized();
  const searchedAt = data.searchedAt || new Date().toISOString();
  const returnDate = data.returnDate ? data.returnDate.trim() : null;
  const tripType = data.tripType || (returnDate ? "round_trip" : "one_way");

  const res = await db.execute({
    sql: `
      INSERT INTO flight_history (
        searched_at, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, lowest_price, currency,
        route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link,
        lowest_direct_price, direct_airline, lowest_stop_price, stop_airline, stop_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      searchedAt,
      data.origin.trim().toUpperCase(),
      data.destination.trim().toUpperCase(),
      data.flightDate.trim(),
      returnDate,
      tripType,
      data.passengers || 1,
      data.children || 0,
      data.infantsInLap || 0,
      data.lowestPrice,
      data.currency || "BRL",
      data.routeId || null,
      data.airline || null,
      data.flightNumber || null,
      data.departureTime || null,
      data.arrivalTime || null,
      data.stops ?? null,
      data.durationMinutes ?? null,
      data.bookingLink || null,
      data.lowestDirectPrice ?? null,
      data.directAirline ?? null,
      data.lowestStopPrice ?? null,
      data.stopAirline ?? null,
      data.stopCount ?? null,
    ],
  });

  // Também grava na tabela estatística flight_prices
  await insertFlightPrice({
    origin: data.origin,
    destination: data.destination,
    departureDate: data.flightDate,
    price: data.lowestPrice,
    recordedAt: searchedAt,
  });

  return Number(res.lastInsertRowid);
}

/**
 * Insere registros de preços históricos retroativos em lote sem duplicar registros para a mesma rota e data
 */
export async function bulkInsertHistoricalFlightPrices(
  routeId: number,
  points: { date: string; price: number; currency?: string; source?: string }[]
): Promise<{ inserted: number; skipped: number }> {
  const db = await ensureInitialized();
  const route = await findRouteById(routeId);
  if (!route) {
    throw new Error(`Rota #${routeId} não encontrada para inserção de histórico.`);
  }

  let inserted = 0;
  let skipped = 0;
  const batchOps: { sql: string; args: any[] }[] = [];

  for (const pt of points) {
    const datePart = pt.date.slice(0, 10);
    const existing = await db.execute({
      sql: `SELECT id FROM flight_history WHERE route_id = ? AND substr(searched_at, 1, 10) = ? LIMIT 1`,
      args: [routeId, datePart],
    });

    if (existing.rows.length > 0) {
      skipped++;
      continue;
    }

    const searchedAt = `${datePart}T12:00:00.000Z`;
    const airlineName = pt.source || "Google Flights (Histórico)";

    batchOps.push({
      sql: `
        INSERT INTO flight_history (
          searched_at, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, lowest_price, currency,
          route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        searchedAt,
        route.origin,
        route.destination,
        route.flightDate,
        route.returnDate || null,
        route.tripType || "one_way",
        route.passengers || 1,
        route.children || 0,
        route.infantsInLap || 0,
        pt.price,
        pt.currency || "BRL",
        route.id,
        airlineName,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    });

    batchOps.push({
      sql: `INSERT INTO flight_prices (origin, destination, departure_date, price, recorded_at) VALUES (?, ?, ?, ?, ?)`,
      args: [route.origin, route.destination, route.flightDate, pt.price, searchedAt],
    });

    inserted++;
  }

  if (batchOps.length > 0) {
    await db.batch(batchOps, "write");
  }

  return { inserted, skipped };
}

export async function getHistoryByRoute(routeId: number, limit = 50, userId?: number): Promise<FlightHistoryEntry[]> {
  const db = await ensureInitialized();
  const userCheckSql = userId !== undefined ? " AND r.user_id = ?" : "";
  const args = userId !== undefined ? [routeId, userId, limit] : [routeId, limit];

  const res = await db.execute({
    sql: `
      SELECT h.* FROM flight_history h
      JOIN monitored_routes r ON r.id = ? ${userCheckSql}
      WHERE (h.route_id = r.id OR (
        h.origin = r.origin 
        AND h.destination = r.destination 
        AND h.flight_date = r.flight_date
        AND COALESCE(h.trip_type, 'one_way') = COALESCE(r.trip_type, 'one_way')
        AND (
          (COALESCE(r.trip_type, 'one_way') = 'round_trip' AND h.return_date = r.return_date AND h.return_date IS NOT NULL AND h.return_date != '')
          OR
          (COALESCE(r.trip_type, 'one_way') = 'one_way' AND (h.return_date IS NULL OR h.return_date = ''))
        )
      ))
      ORDER BY h.searched_at DESC, h.id DESC 
      LIMIT ?
    `,
    args,
  });
  return res.rows.map(mapHistoryRow);
}

export async function getHistoryByUser(userId: number, limit = 200): Promise<FlightHistoryEntry[]> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `
      SELECT DISTINCT h.* FROM flight_history h
      JOIN monitored_routes r ON (h.route_id = r.id OR (
        h.origin = r.origin 
        AND h.destination = r.destination 
        AND h.flight_date = r.flight_date
        AND COALESCE(h.trip_type, 'one_way') = COALESCE(r.trip_type, 'one_way')
        AND (
          (COALESCE(r.trip_type, 'one_way') = 'round_trip' AND h.return_date = r.return_date AND h.return_date IS NOT NULL AND h.return_date != '')
          OR
          (COALESCE(r.trip_type, 'one_way') = 'one_way' AND (h.return_date IS NULL OR h.return_date = ''))
        )
      ))
      WHERE r.user_id = ?
      ORDER BY h.searched_at DESC, h.id DESC
      LIMIT ?
    `,
    args: [userId, limit],
  });
  return res.rows.map(mapHistoryRow);
}

export async function getAllHistory(limit = 200): Promise<FlightHistoryEntry[]> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `SELECT * FROM flight_history ORDER BY searched_at DESC, id DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows.map(mapHistoryRow);
}

function mapHistoryRow(row: any): FlightHistoryEntry {
  return {
    id: Number(row.id),
    searchedAt: String(row.searched_at),
    origin: String(row.origin),
    destination: String(row.destination),
    flightDate: String(row.flight_date),
    returnDate: row.return_date ? String(row.return_date) : null,
    tripType: (row.trip_type || (row.return_date ? "round_trip" : "one_way")) as "one_way" | "round_trip",
    passengers: Number(row.passengers ?? 1),
    children: Number(row.children ?? 0),
    infantsInLap: Number(row.infants_in_lap ?? 0),
    lowestPrice: Number(row.lowest_price),
    currency: String(row.currency || "BRL"),
    routeId: row.route_id !== null && row.route_id !== undefined ? Number(row.route_id) : null,
    airline: row.airline ? String(row.airline) : null,
    flightNumber: row.flight_number ? String(row.flight_number) : null,
    departureTime: row.departure_time ? String(row.departure_time) : null,
    arrivalTime: row.arrival_time ? String(row.arrival_time) : null,
    stops: row.stops !== null && row.stops !== undefined ? Number(row.stops) : null,
    durationMinutes: row.duration_minutes !== null && row.duration_minutes !== undefined ? Number(row.duration_minutes) : null,
    bookingLink: row.booking_link ? String(row.booking_link) : null,
    lowestDirectPrice: row.lowest_direct_price !== null && row.lowest_direct_price !== undefined ? Number(row.lowest_direct_price) : null,
    directAirline: row.direct_airline ? String(row.direct_airline) : null,
    lowestStopPrice: row.lowest_stop_price !== null && row.lowest_stop_price !== undefined ? Number(row.lowest_stop_price) : null,
    stopAirline: row.stop_airline ? String(row.stop_airline) : null,
    stopCount: row.stop_count !== null && row.stop_count !== undefined ? Number(row.stop_count) : null,
  };
}

// ==========================================
// App Settings (app_settings)
// ==========================================

export async function getAppSettings(): Promise<AppSettings> {
  const db = await ensureInitialized();
  const res = await db.execute("SELECT key, value FROM app_settings");

  const map: Record<string, string> = {};
  for (const r of res.rows) {
    map[String(r.key)] = String(r.value);
  }

  return {
    scheduleHours: map["schedule_hours"] || "00:00,12:00",
    searchProvider: (map["search_provider"] as any) || "scraper",
    serpApiKey: map["serpapi_api_key"] || "",
    ntfyTopic: map["ntfy_topic"] || "radar-passagens",
    autoNotify: map["auto_notify"] !== "false",
  };
}

export async function saveAppSettings(newSettings: Partial<AppSettings>): Promise<boolean> {
  const db = await ensureInitialized();
  const now = new Date().toISOString();
  const batchOps: { sql: string; args: any[] }[] = [];

  const addSetting = (key: string, value: string) => {
    batchOps.push({
      sql: `INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, value, now],
    });
  };

  if (newSettings.scheduleHours !== undefined) {
    addSetting("schedule_hours", newSettings.scheduleHours);
  }
  if (newSettings.searchProvider !== undefined) {
    addSetting("search_provider", newSettings.searchProvider);
  }
  if (newSettings.serpApiKey !== undefined) {
    addSetting("serpapi_api_key", newSettings.serpApiKey);
  }
  if (newSettings.ntfyTopic !== undefined) {
    addSetting("ntfy_topic", newSettings.ntfyTopic);
  }
  if (newSettings.autoNotify !== undefined) {
    addSetting("auto_notify", newSettings.autoNotify ? "true" : "false");
  }

  if (batchOps.length > 0) {
    await db.batch(batchOps, "write");
  }

  return true;
}

// ==========================================
// Raw Prices & Statistics (flight_prices)
// ==========================================

export async function insertFlightPrice(data: {
  origin: string;
  destination: string;
  departureDate: string;
  price: number;
  recordedAt?: string;
}): Promise<number> {
  const db = await ensureInitialized();
  const departureDate = data.departureDate || (data as any).departure_date || "";
  const recordedAt = data.recordedAt || (data as any).recorded_at || new Date().toISOString();

  const res = await db.execute({
    sql: "INSERT INTO flight_prices (origin, destination, departure_date, price, recorded_at) VALUES (?, ?, ?, ?, ?)",
    args: [
      data.origin.trim().toUpperCase(),
      data.destination.trim().toUpperCase(),
      departureDate.trim(),
      data.price,
      recordedAt,
    ],
  });

  return Number(res.lastInsertRowid);
}

export async function getRecentPriceHistory(
  origin: string,
  destination: string,
  departureDate: string,
  days = 30
): Promise<FlightPriceRecord[]> {
  const db = await ensureInitialized();
  const res = await db.execute({
    sql: `
      SELECT 
        id, origin, destination, departure_date as departureDate, price, recorded_at as recordedAt
      FROM flight_prices 
      WHERE origin = ? 
        AND destination = ? 
        AND departure_date = ? 
        AND datetime(recorded_at) >= datetime('now', ?)
      ORDER BY recorded_at ASC
    `,
    args: [
      origin.trim().toUpperCase(),
      destination.trim().toUpperCase(),
      departureDate.trim(),
      `-${days} days`,
    ],
  });

  return res.rows.map((r) => ({
    id: Number(r.id),
    origin: String(r.origin),
    destination: String(r.destination),
    departureDate: String(r.departureDate),
    price: Number(r.price),
    recordedAt: String(r.recordedAt),
  }));
}

// ==========================================
// System Execution Logs (app_logs)
// ==========================================

export async function recordLog(data: {
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  routeId?: number | null;
  timestamp?: string;
}): Promise<number> {
  const db = await ensureInitialized();

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

  const res = await db.execute({
    sql: `INSERT INTO app_logs (timestamp, level, category, message, details, route_id) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      data.timestamp || new Date().toISOString(),
      data.level,
      data.category,
      data.message,
      detailsStr,
      data.routeId || null,
    ],
  });

  return Number(res.lastInsertRowid);
}

export async function getLogs(options: LogFilterOptions = {}): Promise<{ logs: AppLog[]; total: number }> {
  const db = await ensureInitialized();
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
  const countRes = await db.execute({
    sql: `SELECT COUNT(*) as total FROM app_logs ${whereClause}`,
    args: params,
  });
  const total = Number(countRes.rows[0]?.total || 0);

  // Query records
  const queryParams = [...params, limit, offset];
  const queryRes = await db.execute({
    sql: `
      SELECT id, timestamp, level, category, message, details, route_id as routeId
      FROM app_logs 
      ${whereClause} 
      ORDER BY timestamp DESC, id DESC 
      LIMIT ? OFFSET ?
    `,
    args: queryParams,
  });

  const logs: AppLog[] = queryRes.rows.map((r) => ({
    id: Number(r.id),
    timestamp: String(r.timestamp),
    level: String(r.level) as LogLevel,
    category: String(r.category) as LogCategory,
    message: String(r.message),
    details: r.details ? String(r.details) : null,
    routeId: r.routeId !== null && r.routeId !== undefined ? Number(r.routeId) : null,
  }));

  return { logs, total };
}

export async function getLogStats(): Promise<LogStats> {
  const db = await ensureInitialized();
  const res = await db.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN level = 'INFO' THEN 1 ELSE 0 END) as info,
      SUM(CASE WHEN level = 'SUCCESS' THEN 1 ELSE 0 END) as success,
      SUM(CASE WHEN level = 'WARN' THEN 1 ELSE 0 END) as warn,
      SUM(CASE WHEN level = 'ERROR' THEN 1 ELSE 0 END) as error
    FROM app_logs
  `);

  const row = res.rows[0] as any;
  return {
    total: Number(row?.total || 0),
    info: Number(row?.info || 0),
    success: Number(row?.success || 0),
    warn: Number(row?.warn || 0),
    error: Number(row?.error || 0),
  };
}

export async function clearLogs(days?: number): Promise<number> {
  const db = await ensureInitialized();
  if (days && days > 0) {
    const res = await db.execute({
      sql: `DELETE FROM app_logs WHERE datetime(timestamp) < datetime('now', ?)`,
      args: [`-${days} days`],
    });
    return res.rowsAffected;
  }

  const res = await db.execute("DELETE FROM app_logs");
  return res.rowsAffected;
}

export async function getOnlineUserStats(): Promise<OnlineUserStats> {
  const db = await ensureInitialized();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // Total de usuários cadastrados
  const totalUsersRes = await db.execute("SELECT COUNT(*) as count FROM users");
  const totalUsers = Number(totalUsersRes.rows[0]?.count || 0);

  // Sessões ativas nos últimos 5 minutos
  const activeSessionsRes = await db.execute({
    sql: `SELECT COUNT(*) as count FROM user_sessions WHERE last_seen_at >= ? AND datetime(expires_at) > datetime('now')`,
    args: [fiveMinutesAgo],
  });
  const activeSessionsCount = Number(activeSessionsRes.rows[0]?.count || 0);

  // Usuários únicos ativos nos últimos 5 minutos
  const onlineUsersRes = await db.execute({
    sql: `SELECT COUNT(DISTINCT user_id) as count FROM user_sessions WHERE last_seen_at >= ? AND datetime(expires_at) > datetime('now')`,
    args: [fiveMinutesAgo],
  });
  const onlineUsersCount = Number(onlineUsersRes.rows[0]?.count || 0);

  // Últimos usuários com atividade (máximo 10)
  const recentUsersRes = await db.execute({
    sql: `SELECT u.id, u.name, u.email, u.created_at, MAX(s.last_seen_at) as last_seen_at
          FROM user_sessions s
          JOIN users u ON s.user_id = u.id
          WHERE datetime(s.expires_at) > datetime('now')
          GROUP BY u.id, u.name, u.email, u.created_at
          ORDER BY last_seen_at DESC
          LIMIT 10`,
  });

  const nowMs = Date.now();
  const recentUsers: OnlineUserItem[] = recentUsersRes.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const lastSeenTime = new Date(String(r.last_seen_at)).getTime();
    const diffMs = Math.max(0, nowMs - lastSeenTime);
    const minutesAgo = Math.round(diffMs / 60000);

    return {
      id: Number(r.id),
      name: r.name ? String(r.name) : null,
      email: String(r.email),
      lastSeenAt: String(r.last_seen_at),
      createdAt: String(r.created_at),
      minutesAgo,
    };
  });

  return {
    onlineUsersCount,
    activeSessionsCount,
    totalUsers,
    recentUsers,
  };
}

// Backward-compatibility aliases
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
export const obterUsuariosOnlineDb = getOnlineUserStats;
