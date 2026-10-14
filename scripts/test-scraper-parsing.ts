import assert from "assert";

// 1. Teste de Parsing de Escalas
function parseStops(ariaCombined: string, fullText: string): number | null {
  let stops: number | null = null;
  const stopText = `${ariaCombined} ${fullText}`;

  if (/\b(?:sem escalas|voo direto|direto|nonstop|non-stop|direct)\b/i.test(stopText)) {
    stops = 0;
  } else {
    const stopNumMatch = stopText.match(/\b(\d+)\s*(?:parada|escala|stop)s?\b/i);
    if (stopNumMatch) {
      stops = parseInt(stopNumMatch[1], 10);
    }
  }
  return stops;
}

// 2. Teste de Parsing de Duração (sem pegar tempo de conexão/escala)
function parseDuration(ariaCombined: string, fullText: string): number {
  let durMinutes = 0;

  // Busca explícita por 'Duração total' ou 'Total duration'
  const explicitMatch = (ariaCombined + " " + fullText).match(
    /(?:Duração total|Total duration|Duração|Duration):\s*(\d+)\s*(?:h|hr|horas?)\s*(?:(\d+)\s*(?:m|min|minutos?))?/i
  );
  if (explicitMatch) {
    durMinutes = parseInt(explicitMatch[1], 10) * 60 + (parseInt(explicitMatch[2], 10) || 0);
  }

  // Fallback: remove textos de conexões/escalas para não pegar tempo de escala por engano
  if (!durMinutes) {
    const textWithoutLayovers = (ariaCombined + " " + fullText)
      .replace(/(?:escala|parada|conexão|layover|stop)\s*(?:de|em|in)?\s*\d+\s*(?:h|hr|horas?)\s*(?:\d+\s*(?:m|min|minutos?))?/gi, "")
      .replace(/\d+\s*(?:h|hr|horas?)\s*(?:\d+\s*(?:m|min|minutos?))?\s*(?:de\s+)?(?:escala|parada|conexão|layover|stop)/gi, "");

    const durMatch = textWithoutLayovers.match(/(\d+)\s*(?:h|hr|horas?)\s*(?:(\d+)\s*(?:m|min|minutos?))?/i);
    if (durMatch) {
      durMinutes = parseInt(durMatch[1], 10) * 60 + (parseInt(durMatch[2], 10) || 0);
    }
  }

  return durMinutes;
}

// 3. Teste de Segregação Pré-Truncamento
function preserveAndSliceOptions(
  uniqueOptions: { price: number; stops: number | null; airline: string }[],
  topN: number
) {
  if (topN && topN > 0 && uniqueOptions.length > topN) {
    const directs = uniqueOptions.filter((o) => o.stops === 0);
    const withStops = uniqueOptions.filter((o) => typeof o.stops === "number" && o.stops > 0);
    const unverified = uniqueOptions.filter((o) => o.stops === null || o.stops === undefined);

    const generalSlice = uniqueOptions.slice(0, topN);
    const directSlice = directs.slice(0, topN);
    const stopsSlice = withStops.slice(0, topN);

    const combined = [...generalSlice, ...directSlice, ...stopsSlice, ...unverified];
    const seenKeys = new Set<string>();
    const finalTop = [];
    for (const opt of combined) {
      const k = `${opt.price}-${opt.airline}-${opt.stops ?? "u"}`;
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        finalTop.push(opt);
      }
    }
    finalTop.sort((a, b) => a.price - b.price);
    return finalTop;
  }
  return uniqueOptions;
}

console.log("Executando testes de parsing e robustez do scraper...");

// Testes de Escalas
assert.strictEqual(parseStops("Voo sem escalas da LATAM", "12:00 - 14:00"), 0, "Deveria ser direto");
assert.strictEqual(parseStops("Nonstop flight United", "12:00 - 14:00"), 0, "Deveria ser direto (EN)");
assert.strictEqual(parseStops("Voo direto Azul", "12:00 - 14:00"), 0, "Deveria ser direto");
assert.strictEqual(parseStops("1 parada em BSB", "1 parada 4 h 20 min"), 1, "Deveria ser 1 parada");
assert.strictEqual(parseStops("2 paradas em GRU e MIA", "2 paradas"), 2, "Deveria ser 2 paradas");
assert.strictEqual(parseStops("1 stop in MIA", "1 stop"), 1, "Deveria ser 1 stop (EN)");
assert.strictEqual(parseStops("Informação indisponível", "Voo executivo"), null, "Texto ambíguo NÃO pode cair em 0");
console.log("✓ Testes de escalas passaram com sucesso!");

// Testes de Duração
assert.strictEqual(
  parseDuration("Duração total: 11 h 45 min", "escala de 3 h em GRU"),
  705,
  "Deveria pegar duração total de 11h45 e ignorar escala de 3h"
);
assert.strictEqual(
  parseDuration("Total duration: 9 h 20 min", "layover of 2 h in MIA"),
  560,
  "Deveria pegar total duration em inglês e ignorar layover"
);
assert.strictEqual(
  parseDuration("", "conexão de 4 h 15 min em BSB. Tempo de voo 8 h 30 min"),
  510,
  "Deveria ignorar conexão e capturar 8h30"
);
console.log("✓ Testes de duração passaram com sucesso!");

// Testes de Segregação Pré-Truncamento
const mockOptions = [
  { price: 400, stops: 1, airline: "GOL" },
  { price: 420, stops: 2, airline: "Azul" },
  { price: 450, stops: 1, airline: "LATAM" },
  { price: 480, stops: 1, airline: "Avianca" },
  { price: 500, stops: 2, airline: "Copa" },
  { price: 650, stops: 0, airline: "LATAM (Direto)" },
  { price: 700, stops: 0, airline: "GOL (Direto)" },
];

const resultTop = preserveAndSliceOptions(mockOptions, 5);
const directsFound = resultTop.filter((o) => o.stops === 0);
assert.strictEqual(directsFound.length > 0, true, "Voos diretos devem ser preservados mesmo sendo mais caros que top 5");
assert.strictEqual(directsFound[0].price, 650, "O voo direto mais barato R$ 650 deve estar presente");
console.log("✓ Testes de segregação de opções passaram com sucesso!");

console.log("\nTodos os testes unitários do Scraper foram validados com êxito!");
