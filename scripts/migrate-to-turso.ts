import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Carrega variáveis do .env.local
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH = process.env.TURSO_AUTH_TOKEN;
const LOCAL_DB_PATH = path.resolve(process.cwd(), "radar_passagens.db");

if (!TURSO_URL) {
  console.error("❌ Erro: TURSO_DATABASE_URL não configurada no arquivo .env.local");
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DB_PATH)) {
  console.error(`❌ Erro: Banco local '${LOCAL_DB_PATH}' não encontrado.`);
  process.exit(1);
}

async function migrate() {
  console.log("🚀 Iniciando migração de radar_passagens.db para Turso Cloud...");
  console.log(`📍 Origem (SQLite Local): ${LOCAL_DB_PATH}`);
  console.log(`🌐 Destino (Turso URL): ${TURSO_URL}`);

  const localDb = new Database(LOCAL_DB_PATH, { readonly: true });
  const turso = createClient({
    url: TURSO_URL!,
    authToken: TURSO_AUTH,
  });

  // 1. Garante que as tabelas existem no Turso
  console.log("\n📦 1. Verificando/Criando schemas no Turso Cloud...");
  
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS login_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS monitored_routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      flight_date TEXT NOT NULL,
      return_date TEXT,
      trip_type TEXT DEFAULT 'one_way',
      passengers INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      infants_in_lap INTEGER DEFAULT 0,
      target_price REAL NOT NULL,
      interval_hours INTEGER DEFAULT 12,
      only_direct INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS flight_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_id INTEGER NOT NULL REFERENCES monitored_routes(id) ON DELETE CASCADE,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'BRL',
      airline TEXT,
      flight_number TEXT,
      departure_time TEXT,
      arrival_time TEXT,
      duration_minutes INTEGER,
      stops INTEGER DEFAULT 0,
      booking_link TEXT,
      search_success INTEGER DEFAULT 1,
      error_message TEXT,
      stops_category TEXT DEFAULT 'all',
      is_direct INTEGER DEFAULT 0
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS flight_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      price REAL NOT NULL,
      recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      source TEXT NOT NULL DEFAULT 'google_flights_history',
      raw_data TEXT
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS app_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      route_id INTEGER
    );
  `);

  // Tabelas para migrar
  const tables = [
    "users",
    "login_codes",
    "user_sessions",
    "monitored_routes",
    "flight_history",
    "flight_prices",
    "app_settings",
    "app_logs",
  ];

  console.log("\n🔄 2. Transferindo registros...");

  for (const table of tables) {
    const rows: any[] = localDb.prepare(`SELECT * FROM ${table}`).all();
    if (rows.length === 0) {
      console.log(`  ⚪ ${table}: 0 registros encontrados no SQLite local.`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const colNames = columns.join(", ");
    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT OR REPLACE INTO ${table} (${colNames}) VALUES (${placeholders})`;

    // Agrupa em lotes de 50 para envio via transaction batch
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const statements = chunk.map((row) => ({
        sql: insertSql,
        args: columns.map((col) => row[col]),
      }));

      await turso.batch(statements, "write");
      insertedCount += chunk.length;
    }

    console.log(`  ✅ ${table}: ${insertedCount}/${rows.length} registros migrados com sucesso para o Turso Cloud.`);
  }

  // Verificação pós-migração
  console.log("\n🔍 3. Validando contagens no Turso Cloud...");
  for (const table of tables) {
    const result = await turso.execute(`SELECT COUNT(*) as count FROM ${table}`);
    const count = result.rows[0]?.count ?? 0;
    console.log(`  📊 ${table}: ${count} registros confirmados no Turso.`);
  }

  localDb.close();
  turso.close();

  console.log("\n🎉 Migração concluída com sucesso!");
}

migrate().catch((err) => {
  console.error("❌ Falha crítica durante a migração:", err);
  process.exit(1);
});
