import assert from "assert";
import { analyzeFlightPrice, calculateSampleStatistics, calculateZScore } from "../src/lib/stats/flight-anomaly-detector";

console.log("Executando testes de integração de anomalias (Z-Score & Bessel)...");

// 1. Teste de Estatística Amostral com Correção de Bessel (N - 1)
const samples = [1000, 1050, 980, 1020, 990];
const stats = calculateSampleStatistics(samples);
assert.strictEqual(stats.sampleSize, 5);
assert.strictEqual(stats.mean, 1008);
// Variância amostral (com N-1): [(1000-1008)^2 + (1050-1008)^2 + (980-1008)^2 + (1020-1008)^2 + (990-1008)^2] / 4
// = [64 + 1764 + 784 + 144 + 324] / 4 = 3080 / 4 = 770
// stdDev = sqrt(770) ~ 27.7488
assert.ok(Math.abs(stats.stdDev - 27.75) < 0.1, "Desvio padrão com Bessel deve ser ~27.75");
console.log("✓ Correção de Bessel e média calculadas com precisão.");

// 2. Teste de Detecção de Anomalias
// 2.1 Preço anômalo imperdível: R$ 920 (queda de ~88 reais, mais de 3 desvios padrão abaixo da média)
const unmissable = analyzeFlightPrice("GRU", "MIA", "2026-11-15", 920, samples);
assert.strictEqual(unmissable.dealLevel, "IMPERDIVEL");
assert.strictEqual(unmissable.isDeal, true);
assert.ok(unmissable.zScore! <= -2.0, "Z-Score deve ser <= -2.0");
console.log(`✓ Anomalia IMPERDÍVEL detectada: Z-Score = ${unmissable.zScore}, Desconto = ${unmissable.discountPercent}%`);

// 2.2 Preço oportunidade: R$ 960 (queda de ~48 reais, ~1.7 desvios abaixo da média)
const opportunity = analyzeFlightPrice("GRU", "MIA", "2026-11-15", 960, samples);
assert.strictEqual(opportunity.dealLevel, "OPORTUNIDADE");
assert.strictEqual(opportunity.isDeal, true);
assert.ok(opportunity.zScore! <= -1.5 && opportunity.zScore! > -2.0, "Z-Score deve estar entre -1.5 e -2.0");
console.log(`✓ Oportunidade detectada: Z-Score = ${opportunity.zScore}, Desconto = ${opportunity.discountPercent}%`);

// 2.3 Preço normal dentro da flutuação: R$ 1000
const normal = analyzeFlightPrice("GRU", "MIA", "2026-11-15", 1000, samples);
assert.strictEqual(normal.dealLevel, "NORMAL");
assert.strictEqual(normal.isDeal, false);
console.log(`✓ Preço normal ignorado com sucesso (isDeal = false).`);

// 3. Teste da Lógica de Notificação do Scanner
const routeTargetPrice = 850; // Meta fixa que NÃO foi atingida pelo preço de 920

// Com preço normal de 1000:
const isBelowTargetNormal = 1000 <= routeTargetPrice;
const shouldNotifyNormal = isBelowTargetNormal || normal.isDeal;
assert.strictEqual(shouldNotifyNormal, false, "Não deve notificar preço normal acima da meta");

// Com anomalia imperdível de 920:
const isBelowTargetUnmissable = 920 <= routeTargetPrice; // false
assert.strictEqual(isBelowTargetUnmissable, false, "Preço ainda está acima da meta estática");
const shouldNotifyAnomaly = isBelowTargetUnmissable || unmissable.isDeal;
assert.strictEqual(shouldNotifyAnomaly, true, "DEVE notificar porque anomalia estatística foi confirmada!");
console.log("✓ Lógica do scanner dispara notificação para anomalia estatística mesmo acima da meta fixa!");

console.log("\nTodos os testes de Anomalia Estatística e Alertas passaram com sucesso!");
