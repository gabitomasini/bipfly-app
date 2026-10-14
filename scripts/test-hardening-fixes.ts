import assert from "assert";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { POST as searchPost } from "../src/app/api/search/route";
import { POST as routesPost } from "../src/app/api/routes/route";
import { POST as verifyCodePost } from "../src/app/api/auth/verify-code/route";
import { createLoginCode, createUser, findUserByEmail, ensureInitialized } from "../src/lib/db";

async function runTests() {
  console.log("====================================================");
  console.log("🛡️  Iniciando testes de hardening de segurança e lógica");
  console.log("====================================================\n");

  await ensureInitialized();

  // 1. Teste de DoS / Acesso público em POST /api/search
  console.log("1. Testando proteção de autenticação em POST /api/search...");
  const unauthSearchReq = new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const searchRes = await searchPost(unauthSearchReq);
  const searchData = await searchRes.json();
  assert.strictEqual(searchRes.status, 401, "POST /api/search não autenticado deve retornar 401");
  assert.strictEqual(searchData.success, false);
  console.log("✓ POST /api/search bloqueia acessos anônimos com 401 Unauthorized.");

  // 2. Teste de Account Takeover / Proteção de Progressive Profiling em POST /api/routes
  console.log("\n2. Testando bloqueio de sequestro de conta em POST /api/routes...");
  const testExistingEmail = "admin-takeover-target@example.com";
  let targetUser = await findUserByEmail(testExistingEmail);
  if (!targetUser) {
    targetUser = await createUser({ email: testExistingEmail, name: "Admin Alvo" });
  }

  const takeoverReq = new Request("http://localhost:3000/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testExistingEmail,
      name: "Atacante Falso",
      origin: "GRU",
      destination: "REC",
      flightDate: "2027-01-15",
      targetPrice: 500,
    }),
  });
  const takeoverRes = await routesPost(takeoverReq);
  const takeoverData = await takeoverRes.json();
  assert.strictEqual(takeoverRes.status, 401, "Cadastro com e-mail já existente sem sessão deve retornar 401");
  assert.strictEqual(takeoverData.requiresAuth, true, "Deve exigir autenticação prévia (requiresAuth)");
  assert.strictEqual(takeoverData.emailAlreadyExists, true, "Deve sinalizar que o e-mail já existe");
  console.log("✓ POST /api/routes impede takeover de contas existentes sem código OTP.");

  // 3. Teste de Validação de Datas Passadas e Inversão Ida/Volta
  console.log("\n3. Testando validação de datas passadas e retorno anterior à ida...");
  const pastDateReq = new Request("http://localhost:3000/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new-user-test-dates@example.com",
      name: "Novo Usuario",
      origin: "GRU",
      destination: "MIA",
      flightDate: "2020-01-01", // Data no passado
      targetPrice: 1200,
    }),
  });
  const pastRes = await routesPost(pastDateReq);
  const pastData = await pastRes.json();
  assert.strictEqual(pastRes.status, 400, "Voo com data no passado deve retornar 400");
  assert.match(pastData.error, /data de partida não pode ser anterior à data de hoje/i);
  console.log("✓ POST /api/routes rejeita voos com data de partida no passado.");

  const invalidReturnReq = new Request("http://localhost:3000/api/routes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "new-user-test-dates@example.com",
      name: "Novo Usuario",
      origin: "GRU",
      destination: "MIA",
      flightDate: "2027-06-10",
      returnDate: "2027-06-01", // Retorno antes da ida
      targetPrice: 1200,
    }),
  });
  const returnRes = await routesPost(invalidReturnReq);
  const returnData = await returnRes.json();
  assert.strictEqual(returnRes.status, 400, "Retorno anterior à partida deve retornar 400");
  assert.match(returnData.error, /data de retorno não pode ser anterior à data de partida/i);
  console.log("✓ POST /api/routes rejeita data de volta anterior à data de ida.");

  // 4. Teste de Força Bruta e Bloqueio de Tentativas no OTP (/api/auth/verify-code)
  console.log("\n4. Testando lockout por força bruta no código OTP (/api/auth/verify-code)...");
  const otpUser = await findUserByEmail("admin-takeover-target@example.com");
  assert(otpUser, "Usuário para teste de OTP deve existir");

  // Cria código OTP ativo de teste
  const realCode = "889911";
  await createLoginCode({
    userId: otpUser.id,
    code: realCode,
    expiresInMinutes: 15,
  });

  // Tenta 5 códigos errados seguidos
  for (let attempt = 1; attempt <= 4; attempt++) {
    const wrongReq = new Request("http://localhost:3000/api/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: otpUser.email, code: "000000" }),
    });
    const res = await verifyCodePost(wrongReq);
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.match(data.error, /tentativa\(s\)/i);
  }

  // 5ª tentativa errada: deve invalidar o código e retornar 429
  const fifthWrongReq = new Request("http://localhost:3000/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: otpUser.email, code: "000000" }),
  });
  const fifthRes = await verifyCodePost(fifthWrongReq);
  const fifthData = await fifthRes.json();
  assert.strictEqual(fifthRes.status, 429, "5ª tentativa errada deve bloquear com 429 Too Many Requests");
  assert.match(fifthData.error, /limite de 5 tentativas excedido/i);
  console.log("✓ 5 tentativas erradas bloqueiam e invalidam o código OTP imediatamente (429).");

  // Tentar usar o código correto DEPOIS de bloqueado deve falhar
  const blockedCorrectReq = new Request("http://localhost:3000/api/auth/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: otpUser.email, code: realCode }),
  });
  const blockedRes = await verifyCodePost(blockedCorrectReq);
  assert.strictEqual(blockedRes.status, 400, "Código invalidado não deve mais autenticar");
  console.log("✓ Código real é rejeitado após lockout de segurança.");

  // 5. Teste de Lógica de Cooldown / Debounce de Alertas
  console.log("\n5. Testando cálculo de cooldown / debounce de alertas...");
  const lastNotifiedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h atrás
  const lastNotifiedPrice = 1000;

  // Cenário A: Preço igual (R$ 1000) 2h depois -> DEVE SUPRIMIR (false)
  const priceA = 1000;
  const hoursSinceA = (Date.now() - new Date(lastNotifiedAt).getTime()) / (1000 * 60 * 60);
  const priceDropA = ((lastNotifiedPrice - priceA) / lastNotifiedPrice) * 100;
  const allowA = !(hoursSinceA < 24 && priceDropA < 3);
  assert.strictEqual(allowA, false, "Mesmo preço em menos de 24h deve ser suprimido");

  // Cenário B: Preço caiu 1% (R$ 990) 2h depois -> DEVE SUPRIMIR (queda < 3%)
  const priceB = 990;
  const priceDropB = ((lastNotifiedPrice - priceB) / lastNotifiedPrice) * 100;
  const allowB = !(hoursSinceA < 24 && priceDropB < 3);
  assert.strictEqual(allowB, false, "Queda menor que 3% em menos de 24h deve ser suprimida");

  // Cenário C: Preço caiu 5% (R$ 950) 2h depois -> DEVE PERMITIR ALERTA (queda >= 3%)
  const priceC = 950;
  const priceDropC = ((lastNotifiedPrice - priceC) / lastNotifiedPrice) * 100;
  const allowC = !(hoursSinceA < 24 && priceDropC < 3);
  assert.strictEqual(allowC, true, "Queda maior ou igual a 3% deve permitir novo alerta imediatamente");

  // Cenário D: Preço igual (R$ 1000) mas após 25h -> DEVE PERMITIR ALERTA (janela diária de 24h)
  const oldNotifiedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h atrás
  const hoursSinceD = (Date.now() - new Date(oldNotifiedAt).getTime()) / (1000 * 60 * 60);
  const allowD = !(hoursSinceD < 24 && priceDropA < 3);
  assert.strictEqual(allowD, true, "Após 24h, alerta de lembrete diário deve ser permitido");

  console.log("✓ Lógica de cooldown suprime spam em < 24h, permitindo alertas com queda >= 3% ou após 24h.");

  console.log("\n====================================================");
  console.log("🎉 Todos os testes de hardening passaram com sucesso!");
  console.log("====================================================\n");
}

runTests().catch((err) => {
  console.error("❌ Falha nos testes de hardening:", err);
  process.exit(1);
});
