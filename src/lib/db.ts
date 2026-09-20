import Database from "better-sqlite3";
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
} from "./types";

const DB_NAME = "radar_passagens.db";
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), DB_NAME);

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

  // 2. Tabela de Usuários (users)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT,
      email       TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // 3. Tabela de Códigos OTP de Autenticação (login_codes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code        TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      used_at     TEXT,
      ip_address  TEXT,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_codes_lookup ON login_codes(user_id, code);
    CREATE INDEX IF NOT EXISTS idx_login_codes_user ON login_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_codes_created ON login_codes(created_at);
  `);

  // 4. Tabela de Sessões Persistentes (user_sessions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token  TEXT NOT NULL UNIQUE,
      expires_at     TEXT NOT NULL,
      created_at     TEXT NOT NULL,
      last_seen_at   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
  `);

  // 5. Tabela de rotas monitoradas (monitored_routes)
  db.exec(`
    CREATE TABLE IF NOT EXISTS monitored_routes (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
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
    CREATE INDEX IF NOT EXISTS idx_monitored_routes_active ON monitored_routes(is_active);
  `);

  try {
    db.exec("ALTER TABLE monitored_routes ADD COLUMN last_error TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE monitored_routes ADD COLUMN last_searched_at TEXT;");
  } catch {}

  // 6. Tabela de histórico de buscas de voos (flight_history)
  db.exec(`
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

  // Migrações incrementais de colunas (idempotentes)
  try {
    const routeCols = db.prepare("PRAGMA table_info(monitored_routes)").all() as { name: string }[];
    const routeColNames = new Set(routeCols.map((c) => c.name));
    if (!routeColNames.has("user_id")) {
      db.exec(`
        DELETE FROM flight_history WHERE route_id IS NOT NULL;
        DELETE FROM monitored_routes;
        ALTER TABLE monitored_routes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_monitored_routes_user_id ON monitored_routes(user_id);
      `);
    }
    if (!routeColNames.has("only_direct")) {
      db.exec("ALTER TABLE monitored_routes ADD COLUMN only_direct INTEGER NOT NULL DEFAULT 0;");
    }
    if (!routeColNames.has("trip_type")) {
      db.exec("ALTER TABLE monitored_routes ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'one_way';");
    }
    if (!routeColNames.has("return_date")) {
      db.exec("ALTER TABLE monitored_routes ADD COLUMN return_date TEXT;");
    }
    if (!routeColNames.has("children")) {
      db.exec("ALTER TABLE monitored_routes ADD COLUMN children INTEGER NOT NULL DEFAULT 0;");
    }
    if (!routeColNames.has("infants_in_lap")) {
      db.exec("ALTER TABLE monitored_routes ADD COLUMN infants_in_lap INTEGER NOT NULL DEFAULT 0;");
    }
  } catch (err) {
    console.error("Erro ao verificar colunas em monitored_routes:", err);
  }

  try {
    const historyCols = db.prepare("PRAGMA table_info(flight_history)").all() as { name: string }[];
    const historyColNames = new Set(historyCols.map((c) => c.name));
    if (!historyColNames.has("lowest_direct_price")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN lowest_direct_price REAL;");
    }
    if (!historyColNames.has("direct_airline")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN direct_airline TEXT;");
    }
    if (!historyColNames.has("lowest_stop_price")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN lowest_stop_price REAL;");
    }
    if (!historyColNames.has("stop_airline")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN stop_airline TEXT;");
    }
    if (!historyColNames.has("stop_count")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN stop_count INTEGER;");
    }
    if (!historyColNames.has("trip_type")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN trip_type TEXT NOT NULL DEFAULT 'one_way';");
    }
    if (!historyColNames.has("return_date")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN return_date TEXT;");
    }
    if (!historyColNames.has("passengers")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN passengers INTEGER NOT NULL DEFAULT 1;");
    }
    if (!historyColNames.has("children")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN children INTEGER NOT NULL DEFAULT 0;");
    }
    if (!historyColNames.has("infants_in_lap")) {
      db.exec("ALTER TABLE flight_history ADD COLUMN infants_in_lap INTEGER NOT NULL DEFAULT 0;");
    }
  } catch (err) {
    console.error("Erro ao verificar colunas em flight_history:", err);
  }

  // Limpa associações de histórico onde origin, destination ou flight_date não batem mais com a rota (ex: rota renomeada)
  try {
    db.exec(`
      UPDATE flight_history 
      SET route_id = NULL 
      WHERE route_id IS NOT NULL 
      AND id IN (
        SELECT h.id FROM flight_history h 
        JOIN monitored_routes r ON h.route_id = r.id 
        WHERE h.origin != r.origin OR h.destination != r.destination OR h.flight_date != r.flight_date
      );
    `);
  } catch (err) {
    console.error("Erro ao limpar route_ids descasados em flight_history:", err);
  }
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
// User & Authentication Helpers
// ==========================================

export function findUserByEmail(email: string): User | null {
  const db = getDatabase();
  const row = db
    .prepare("SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?))")
    .get(email) as any;
  if (!row) return null;
  return mapUserRow(row);
}

export function findUserById(id: number): User | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as any;
  if (!row) return null;
  return mapUserRow(row);
}

export function createUser(data: { email: string; name?: string | null }): User {
  const db = getDatabase();
  const now = new Date().toISOString();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name ? data.name.trim() : null;

  const stmt = db.prepare(`
    INSERT INTO users (email, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const info = stmt.run(cleanEmail, cleanName, now, now);
  const id = Number(info.lastInsertRowid);
  return {
    id,
    email: cleanEmail,
    name: cleanName,
    createdAt: now,
    updatedAt: now,
  };
}

export function getOrCreateUser(email: string, name?: string | null): User {
  const existing = findUserByEmail(email);
  if (existing) {
    if (name && name.trim() && !existing.name) {
      const db = getDatabase();
      const now = new Date().toISOString();
      db.prepare("UPDATE users SET name = ?, updated_at = ? WHERE id = ?").run(name.trim(), now, existing.id);
      return { ...existing, name: name.trim(), updatedAt: now };
    }
    return existing;
  }
  return createUser({ email, name });
}

export function createLoginCode(data: {
  userId: number;
  code: string;
  ipAddress?: string | null;
  expiresInMinutes?: number;
}): LoginCode {
  const db = getDatabase();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresInMin = data.expiresInMinutes || 15;
  const expiresAt = new Date(now.getTime() + expiresInMin * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO login_codes (user_id, code, expires_at, used_at, ip_address, created_at)
    VALUES (?, ?, ?, NULL, ?, ?)
  `);

  const info = stmt.run(data.userId, data.code.trim(), expiresAt, data.ipAddress || null, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    userId: data.userId,
    code: data.code.trim(),
    expiresAt,
    usedAt: null,
    ipAddress: data.ipAddress || null,
    createdAt,
  };
}

export function findValidLoginCode(userId: number, code: string): LoginCode | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT * FROM login_codes 
      WHERE user_id = ? AND code = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(userId, code.trim()) as any;
  if (!row) return null;
  return mapLoginCodeRow(row);
}

export function markLoginCodeUsed(id: number): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();
  const res = db.prepare("UPDATE login_codes SET used_at = ? WHERE id = ?").run(now, id);
  return res.changes > 0;
}

export function countRecentLoginCodes(userId: number, minutes = 15): number {
  const db = getDatabase();
  const res = db
    .prepare(`
      SELECT COUNT(*) as count FROM login_codes 
      WHERE user_id = ? AND datetime(created_at) >= datetime('now', ?)
    `)
    .get(userId, `-${minutes} minutes`) as any;
  return res ? res.count : 0;
}

export function countRecentLoginCodesByEmail(email: string, minutes = 15): number {
  const db = getDatabase();
  const res = db
    .prepare(`
      SELECT COUNT(lc.id) as count 
      FROM login_codes lc
      JOIN users u ON lc.user_id = u.id
      WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(?)) AND datetime(lc.created_at) >= datetime('now', ?)
    `)
    .get(email, `-${minutes} minutes`) as any;
  return res ? res.count : 0;
}

export function createSession(userId: number, sessionToken: string, durationDays = 60): UserSession {
  const db = getDatabase();
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO user_sessions (user_id, session_token, expires_at, created_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const info = stmt.run(userId, sessionToken, expiresAt, createdAt, createdAt);
  return {
    id: Number(info.lastInsertRowid),
    userId,
    sessionToken,
    expiresAt,
    createdAt,
    lastSeenAt: createdAt,
  };
}

export function findSessionByToken(sessionToken: string): { session: UserSession; user: User } | null {
  const db = getDatabase();
  const row = db
    .prepare(`
      SELECT s.*, u.id as u_id, u.name as u_name, u.email as u_email, u.created_at as u_created_at, u.updated_at as u_updated_at
      FROM user_sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.session_token = ? AND datetime(s.expires_at) > datetime('now')
    `)
    .get(sessionToken) as any;

  if (!row) return null;

  // Atualiza timestamp de last_seen
  const now = new Date().toISOString();
  db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE id = ?").run(now, row.id);

  return {
    session: {
      id: row.id,
      userId: row.user_id,
      sessionToken: row.session_token,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      lastSeenAt: now,
    },
    user: {
      id: row.u_id,
      name: row.u_name ?? null,
      email: row.u_email,
      createdAt: row.u_created_at,
      updatedAt: row.u_updated_at,
    },
  };
}

export function deleteSessionByToken(sessionToken: string): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM user_sessions WHERE session_token = ?").run(sessionToken);
  return res.changes > 0;
}

export function deleteUserSessions(userId: number): boolean {
  const db = getDatabase();
  const res = db.prepare("DELETE FROM user_sessions WHERE user_id = ?").run(userId);
  return res.changes > 0;
}

function mapUserRow(row: any): User {
  return {
    id: row.id,
    name: row.name ?? null,
    email: row.email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapLoginCodeRow(row: any): LoginCode {
  return {
    id: row.id,
    userId: row.user_id,
    code: row.code,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? null,
    ipAddress: row.ip_address ?? null,
    createdAt: row.created_at,
  };
}

// ==========================================
// Monitored Routes (CRUD)
// ==========================================

export function listRoutes(
  filterOrActiveOnly?: boolean | { userId?: number; activeOnly?: boolean },
  userIdParam?: number
): MonitoredRoute[] {
  const db = getDatabase();
  let activeOnly = false;
  let userId: number | undefined = undefined;

  if (typeof filterOrActiveOnly === "boolean") {
    activeOnly = filterOrActiveOnly;
    userId = userIdParam;
  } else if (filterOrActiveOnly && typeof filterOrActiveOnly === "object") {
    activeOnly = Boolean(filterOrActiveOnly.activeOnly);
    userId = filterOrActiveOnly.userId;
  }

  // Subconsulta estrita para correspondência de histórico de cotações:
  // Exige exatamente mesma origem, mesmo destino, mesma data de ida, mesmo tipo de viagem (one_way vs round_trip) e mesma data de retorno.
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

  const rows = db.prepare(query).all(...params) as any[];
  return rows.map(mapRouteRow);
}

export function findRouteById(id: number, userId?: number): MonitoredRoute | null {
  const db = getDatabase();
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

  const row = db
    .prepare(
      `SELECT r.*, u.name as user_name, u.email as user_email,
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
       WHERE ${conditions.join(" AND ")}`
    )
    .get(...params) as any;

  if (!row) return null;
  return mapRouteRow(row);
}

export function createRoute(data: {
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
}): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const returnDate = data.returnDate ? data.returnDate.trim() : null;
  const tripType = data.tripType || (returnDate ? "round_trip" : "one_way");

  const stmt = db.prepare(`
    INSERT INTO monitored_routes (
      user_id, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, target_price, interval_hours, only_direct, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const info = stmt.run(
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
): boolean {
  const db = getDatabase();
  const checkSql = userId !== undefined ? "SELECT * FROM monitored_routes WHERE id = ? AND user_id = ?" : "SELECT * FROM monitored_routes WHERE id = ?";
  const checkParams = userId !== undefined ? [id, userId] : [id];
  const currentRoute = db.prepare(checkSql).get(...checkParams) as any;
  if (!currentRoute) return false;

  const fields: string[] = [];
  const values: any[] = [];

  const newOrigin = data.origin !== undefined ? data.origin.trim().toUpperCase() : currentRoute.origin;
  const newDest = data.destination !== undefined ? data.destination.trim().toUpperCase() : currentRoute.destination;
  const newDate = data.flightDate !== undefined ? data.flightDate.trim() : currentRoute.flight_date;
  const newReturnDate = data.returnDate !== undefined ? (data.returnDate ? data.returnDate.trim() : null) : currentRoute.return_date;
  const newTripType = data.tripType !== undefined ? data.tripType : (newReturnDate ? "round_trip" : (currentRoute.trip_type || "one_way"));

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

  const tx = db.transaction(() => {
    // Se mudou parâmetros do voo, desvincula o histórico anterior da rota
    if (
      newOrigin !== currentRoute.origin ||
      newDest !== currentRoute.destination ||
      newDate !== currentRoute.flight_date ||
      newReturnDate !== currentRoute.return_date ||
      newTripType !== currentRoute.trip_type
    ) {
      db.prepare(`
        UPDATE flight_history 
        SET route_id = NULL 
        WHERE route_id = ? AND (
          origin != ? OR destination != ? OR flight_date != ? OR 
          ((return_date IS NULL AND ? IS NOT NULL) OR (return_date IS NOT NULL AND return_date != ?))
        )
      `).run(id, newOrigin, newDest, newDate, newReturnDate, newReturnDate);

      // Reatribui histórico existente que corresponda aos novos parâmetros, se houver
      db.prepare(`
        UPDATE flight_history 
        SET route_id = ? 
        WHERE origin = ? AND destination = ? AND flight_date = ? 
          AND ((? IS NULL AND return_date IS NULL) OR return_date = ?)
          AND route_id IS NULL
      `).run(id, newOrigin, newDest, newDate, newReturnDate, newReturnDate);
    }

    const where = userId !== undefined ? "WHERE id = ? AND user_id = ?" : "WHERE id = ?";
    const stmt = db.prepare(`UPDATE monitored_routes SET ${fields.join(", ")} ${where}`);
    const info = stmt.run(...values);
    return info.changes > 0;
  });

  return tx();
}

export function deleteRoute(id: number, userId?: number): boolean {
  const db = getDatabase();
  const checkSql = userId !== undefined ? "SELECT id FROM monitored_routes WHERE id = ? AND user_id = ?" : "SELECT id FROM monitored_routes WHERE id = ?";
  const checkParams = userId !== undefined ? [id, userId] : [id];
  const existing = db.prepare(checkSql).get(...checkParams);
  if (!existing) return false;

  const deleteHistory = db.prepare("DELETE FROM flight_history WHERE route_id = ?");
  const deleteRouteStmt = userId !== undefined 
    ? db.prepare("DELETE FROM monitored_routes WHERE id = ? AND user_id = ?")
    : db.prepare("DELETE FROM monitored_routes WHERE id = ?");

  const tx = db.transaction(() => {
    deleteHistory.run(id);
    const info = userId !== undefined ? deleteRouteStmt.run(id, userId) : deleteRouteStmt.run(id);
    return info.changes > 0;
  });

  return tx();
}

function mapRouteRow(row: any): MonitoredRoute {
  return {
    id: row.id,
    userId: row.user_id,
    origin: row.origin,
    destination: row.destination,
    flightDate: row.flight_date,
    returnDate: row.return_date ?? null,
    tripType: (row.trip_type || (row.return_date ? "round_trip" : "one_way")) as "one_way" | "round_trip",
    passengers: row.passengers ?? 1,
    children: row.children ?? 0,
    infantsInLap: row.infants_in_lap ?? 0,
    targetPrice: row.target_price,
    intervalHours: row.interval_hours,
    onlyDirect: Boolean(row.only_direct),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name ?? null,
    userEmail: row.user_email ?? null,
    latestPrice: row.latest_price ?? null,
    lowestHistoricalPrice: row.lowest_historical_price ?? null,
    lastSearchedAt: row.last_searched_at ?? null,
    lastError: row.last_error ?? null,
    lastAirline: row.last_airline ?? null,
    lastFlightNumber: row.last_flight_number ?? null,
    lastStops: row.last_stops ?? null,
    lastBookingLink: row.last_booking_link ?? null,
    latestDirectPrice: row.latest_direct_price ?? null,
    latestDirectAirline: row.latest_direct_airline ?? null,
    latestStopPrice: row.latest_stop_price ?? null,
    latestStopAirline: row.latest_stop_airline ?? null,
    latestStopCount: row.latest_stop_count ?? null,
    totalSearches: row.total_searches ?? 0,
  };
}

export function updateRouteScanStatus(routeId: number, lastSearchedAt: string, lastError: string | null): void {
  const db = getDatabase();
  db.prepare("UPDATE monitored_routes SET last_searched_at = ?, last_error = ?, updated_at = ? WHERE id = ?").run(
    lastSearchedAt,
    lastError,
    new Date().toISOString(),
    routeId
  );
}

// ==========================================
// Flight History (flight_history)
// ==========================================

export function recordFlightHistory(data: {
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
}): number {
  const db = getDatabase();
  const searchedAt = data.searchedAt || new Date().toISOString();
  const returnDate = data.returnDate ? data.returnDate.trim() : null;
  const tripType = data.tripType || (returnDate ? "round_trip" : "one_way");

  const stmt = db.prepare(`
    INSERT INTO flight_history (
      searched_at, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, lowest_price, currency,
      route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link,
      lowest_direct_price, direct_airline, lowest_stop_price, stop_airline, stop_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
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
    data.stopCount ?? null
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
      searched_at, origin, destination, flight_date, return_date, trip_type, passengers, children, infants_in_lap, lowest_price, currency,
      route_id, airline, flight_number, departure_time, arrival_time, stops, duration_minutes, booking_link
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    SELECT h.* FROM flight_history h
    JOIN monitored_routes r ON r.id = ?
    WHERE h.origin = r.origin 
      AND h.destination = r.destination 
      AND h.flight_date = r.flight_date
      AND COALESCE(h.trip_type, 'one_way') = COALESCE(r.trip_type, 'one_way')
      AND (
        (COALESCE(r.trip_type, 'one_way') = 'round_trip' AND h.return_date = r.return_date AND h.return_date IS NOT NULL AND h.return_date != '')
        OR
        (COALESCE(r.trip_type, 'one_way') = 'one_way' AND (h.return_date IS NULL OR h.return_date = ''))
      )
    ORDER BY h.searched_at DESC, h.id DESC 
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
    returnDate: row.return_date ?? null,
    tripType: (row.trip_type || (row.return_date ? "round_trip" : "one_way")) as "one_way" | "round_trip",
    passengers: row.passengers ?? 1,
    children: row.children ?? 0,
    infantsInLap: row.infants_in_lap ?? 0,
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
    lowestDirectPrice: row.lowest_direct_price ?? null,
    directAirline: row.direct_airline ?? null,
    lowestStopPrice: row.lowest_stop_price ?? null,
    stopAirline: row.stop_airline ?? null,
    stopCount: row.stop_count ?? null,
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
