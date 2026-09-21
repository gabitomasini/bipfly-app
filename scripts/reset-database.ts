import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import dotenv from "dotenv";

// Carrega variáveis de ambiente (.env.local ou .env)
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else {
  dotenv.config();
}

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH = process.env.TURSO_AUTH_TOKEN;

async function reset() {
  const isCloud = !!(TURSO_URL && TURSO_URL.startsWith("libsql://"));
  const target = isCloud ? `Turso Cloud (${TURSO_URL})` : "SQLite Local (file:radar_passagens.db)";

  console.log(`⚠️  Iniciando limpeza total do banco de dados em: ${target}`);

  const client = createClient({
    url: TURSO_URL || "file:radar_passagens.db",
    authToken: TURSO_AUTH,
  });

  const tables = [
    "flight_history",
    "flight_prices",
    "monitored_routes",
    "user_sessions",
    "login_codes",
    "app_logs",
    "users",
  ];

  console.log("🧹 Apagando registros das tabelas...");

  for (const table of tables) {
    try {
      await client.execute(`DELETE FROM ${table};`);
      console.log(`  ✅ Tabela '${table}' zerada com sucesso.`);
    } catch (err: any) {
      console.log(`  ⚠️ Aviso ao limpar '${table}': ${err.message}`);
    }
  }

  // Reseta configurações para o padrão se desejar
  try {
    await client.execute(`
      INSERT OR REPLACE INTO app_settings (key, value, updated_at)
      VALUES 
        ('schedule_hours', '12', datetime('now')),
        ('search_provider', 'playwright', datetime('now')),
        ('auto_notify', 'true', datetime('now'))
    `);
    console.log("  ✅ Configurações padrão (app_settings) restauradas.");
  } catch (err: any) {
    console.log(`  ⚠️ Aviso ao resetar app_settings: ${err.message}`);
  }

  client.close();
  console.log("\n🎉 Banco de dados zerado com sucesso! Você pode recomeçar do zero.");
}

reset().catch((err) => {
  console.error("❌ Erro ao resetar banco:", err);
  process.exit(1);
});
