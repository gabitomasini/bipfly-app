import assert from "assert";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { isUserAdmin } from "../src/lib/auth";
import { User } from "../src/lib/types";

console.log("Verificando regras de permissão de administrador...");

const adminUser: User = {
  id: 1,
  email: "gabriela_tomasini@hotmail.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const regularUser: User = {
  id: 2,
  email: "user@example.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert.strictEqual(isUserAdmin(null), false, "Anônimo nunca é admin");
assert.strictEqual(isUserAdmin(adminUser), true, "E-mail em ADMIN_EMAILS deve ser reconhecido como admin");
assert.strictEqual(isUserAdmin(regularUser), false, "Usuário comum não deve ter privilégios de admin");

console.log("✓ Verificações de permissão de admin passaram com sucesso!");
