import { chromium, Browser } from "playwright";
import { FlightOption } from "../types";
import { parseBrazilianPrice } from "../flight-tracker";
import { getGoogleFlightsUrl } from "../utils";
import { logger } from "../logger";

export class ScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperError";
  }
}

// ── Flags otimizadas para ambientes com pouca memória (Railway, containers) ──
const OPTIMIZED_CHROME_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-software-rasterizer",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-domain-reliability",
  "--disable-sync",
  "--disable-translate",
  "--disable-features=site-per-process,TranslateUI",
  "--single-process",
  "--no-zygote",
  "--no-first-run",
  "--mute-audio",
  "--hide-scrollbars",
  "--disable-blink-features=AutomationControlled",
  "--window-size=1024,600",
  "--js-flags=--max-old-space-size=256",
];

const BROWSER_LAUNCH_TIMEOUT = 30_000; // 30s ao invés de 180s default
const MAX_LAUNCH_RETRIES = 2;

// ── Mutex para garantir que apenas um Chromium roda por vez ──
let browserLock: Promise<void> = Promise.resolve();

async function withBrowserLock<T>(fn: () => Promise<T>): Promise<T> {
  let releaseLock: () => void;
  const previousLock = browserLock;
  browserLock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  await previousLock;
  try {
    return await fn();
  } finally {
    releaseLock!();
  }
}

/**
 * Lança o Chromium com retry e cleanup entre tentativas.
 */
async function launchBrowserWithRetry(): Promise<Browser> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_LAUNCH_RETRIES; attempt++) {
    try {
      logger.info("SCRAPER", `🚀 Lançando Chromium (tentativa ${attempt}/${MAX_LAUNCH_RETRIES})...`);
      const browser = await chromium.launch({
        headless: true,
        args: OPTIMIZED_CHROME_ARGS,
        timeout: BROWSER_LAUNCH_TIMEOUT,
      });
      logger.info("SCRAPER", `✅ Chromium pronto (tentativa ${attempt}).`);
      return browser;
    } catch (err: any) {
      lastError = err;
      logger.warn(
        "SCRAPER",
        `⚠️ Falha ao lançar Chromium (tentativa ${attempt}/${MAX_LAUNCH_RETRIES}): ${err.message}`
      );

      // Aguarda um pouco para liberar recursos antes de tentar novamente
      if (attempt < MAX_LAUNCH_RETRIES) {
        // Força garbage collection se disponível
        if (global.gc) {
          try { global.gc(); } catch {}
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  throw new ScraperError(
    `Chromium não pôde ser iniciado após ${MAX_LAUNCH_RETRIES} tentativas. ` +
    `O servidor pode estar sem memória/CPU suficiente. Último erro: ${lastError?.message || "desconhecido"}`
  );
}

export async function scrapeGoogleFlights(
  origin: string,
  destination: string,
  flightDate: string,
  passengers = 1,
  topN = 5,
  returnDate?: string | null,
  tripType?: "one_way" | "round_trip",
  children = 0,
  infantsInLap = 0
): Promise<FlightOption[]> {
  const normOrigin = origin.trim().toUpperCase();
  const normDestination = destination.trim().toUpperCase();
  const isRoundTrip = tripType === "round_trip" || (Boolean(returnDate) && tripType !== "one_way");

  // URL direta de voos no Google Flights em BRL e idioma pt-BR (one-way ou ida e volta)
  const searchUrl = getGoogleFlightsUrl(
    normOrigin,
    normDestination,
    flightDate,
    passengers,
    returnDate,
    tripType,
    children,
    infantsInLap
  );

  logger.info(
    "SCRAPER",
    `🌐 [Requisição Playwright] Abrindo Google Flights (${isRoundTrip ? "Ida e Volta" : "Somente Ida"}): ${normOrigin} → ${normDestination} (${flightDate}${returnDate ? ` até ${returnDate}` : ""})`,
    {
      type: "HTTP_PAGE_NAVIGATION",
      url: searchUrl,
      origin: normOrigin,
      destination: normDestination,
      flightDate,
      returnDate: returnDate || null,
      tripType: isRoundTrip ? "round_trip" : "one_way",
      passengers,
      children,
      infantsInLap,
    }
  );

  return withBrowserLock(async () => {
  const startTime = Date.now();
  let browser;
  try {
    browser = await launchBrowserWithRetry();

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1024, height: 600 },
    });

    const page = await context.newPage();

    // Bloqueia imagens, mídias e fontes pesadas para economizar memória
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font"].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Aceita popup de cookies se presente
    try {
      const consentBtn = page.locator('button:has-text("Aceitar tudo"), button:has-text("Aceito"), button:has-text("Concordo"), button:has-text("I agree")');
      if (await consentBtn.first().isVisible({ timeout: 2000 })) {
        await consentBtn.first().click();
      }
    } catch {}

    // Aguarda que os cartões de voos reais renderizem
    try {
      await page.waitForFunction(
        () => {
          const cards = document.querySelectorAll("li.pIav2d, div.pIav2d, ul.Rk10dc > li");
          return cards.length > 0;
        },
        { timeout: 12000 }
      );
    } catch {}

    await page.waitForTimeout(1000);

    // 1. Tenta ordenar a busca por Menor Preço diretamente no menu de classificação do Google Flights
    try {
      const sortBtn = page.locator(
        'button[aria-label*="Mudar a ordem de classificação"], button:has-text("Ordenados pelos principais voos"), button[aria-label*="Change sort order"]'
      ).first();
      if (await sortBtn.isVisible({ timeout: 1500 })) {
        await sortBtn.click();
        await page.waitForTimeout(500);
        const priceSortOption = page.locator(
          '[role="menuitemradio"]:has-text("Preço"), [role="menuitem"]:has-text("Preço"), [role="menuitemradio"]:has-text("Price"), [role="menuitem"]:has-text("Price")'
        ).first();
        if (await priceSortOption.isVisible({ timeout: 1500 })) {
          await priceSortOption.click();
          await page.waitForTimeout(1500);
        }
      }
    } catch {}

    // 2. Clica em "Mostrar mais voos" para expandir todas as ofertas mais baratas (incluindo escalas longas)
    try {
      for (let i = 0; i < 3; i++) {
        const moreBtn = page.locator(
          'button[aria-label*="Mostrar mais voos"], button:has-text("Mostrar mais voos"), button[aria-label*="Show more"], button:has-text("Show more flights"), button[aria-label*="Outros voos"]'
        ).first();
        if (await moreBtn.isVisible({ timeout: 1200 })) {
          await moreBtn.click().catch(() => {});
          await page.waitForTimeout(800);
        } else {
          break;
        }
      }
    } catch {}

    // 3. Expande os detalhes dos cartões no DOM para carregar números de voo (ex: LA 3550, G3 1500, AD 4193)
    try {
      await page.evaluate(() => {
        const btns = Array.from(
          document.querySelectorAll(
            "li.pIav2d button[aria-label*='Detalhes do voo'], li.pIav2d button[aria-label*='Flight details'], div.pIav2d button[aria-label*='Detalhes do voo'], div.pIav2d button[aria-label*='Flight details']"
          )
        );
        for (let i = 0; i < Math.min(15, btns.length); i++) {
          (btns[i] as HTMLButtonElement).click();
        }
      });
      await page.waitForTimeout(500);
    } catch {}

    // Extrai dos cartões de voo oficiais
    const rawOptions = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("li.pIav2d, div.pIav2d, ul.Rk10dc > li"));
      const list: any[] = [];

      for (const card of cards) {
        // Coleta todos os aria-labels dos elementos filhos
        const childArias = Array.from(card.querySelectorAll("[aria-label]"))
          .map((el) => el.getAttribute("aria-label") || "")
          .filter(Boolean);
        const cardAria = card.getAttribute("aria-label") || "";
        const allArias = [cardAria, ...childArias];
        const ariaCombined = allArias.join(" ");

        // Limpa texto substituindo NBSP por espaço comum
        const fullText = (card.textContent || "")
          .replace(/[\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        // 1. Extração do Preço
        let priceText = "";
        
        // Tenta achar em aria-label com "Reais brasileiros" ou "A partir de"
        for (const aria of allArias) {
          const matchAria = aria.match(/(?:A partir de|por)?\s*([\d\.\,]+)\s*Reais/i);
          if (matchAria && matchAria[1]) {
            priceText = matchAria[1];
            break;
          }
        }

        // Se não achou nos arias, busca no fullText
        if (!priceText) {
          const matchText = fullText.match(/R\$\s*([\d\.\,]+)/i);
          if (matchText && matchText[1]) {
            priceText = matchText[1];
          }
        }

        if (!priceText) continue;

        // 2. Horários
        let departure: string | undefined;
        let arrival: string | undefined;
        const depEl = card.querySelector("[aria-label*='Horário de partida']");
        const arrEl = card.querySelector("[aria-label*='Horário de chegada']");
        if (depEl) {
          const depMatch = (depEl.getAttribute("aria-label") || depEl.textContent || "").match(/(\d{1,2}:\d{2})/);
          if (depMatch) departure = depMatch[1];
        }
        if (arrEl) {
          const arrMatch = (arrEl.getAttribute("aria-label") || arrEl.textContent || "").match(/(\d{1,2}:\d{2})/);
          if (arrMatch) arrival = arrMatch[1];
        }

        if (!departure || !arrival) {
          const timeMatch = fullText.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
          if (timeMatch) {
            departure = timeMatch[1];
            arrival = timeMatch[2];
          }
        }

        // 3. Duração
        let durMinutes = 0;
        const durMatch = (ariaCombined + " " + fullText).match(/Duração total:\s*(\d+)\s*h(?:\s*(\d+)\s*min)?/i) ||
                         (fullText).match(/(\d+)\s*h(?:\s*(\d+)\s*min)?/);
        if (durMatch) {
          durMinutes = parseInt(durMatch[1], 10) * 60 + (parseInt(durMatch[2], 10) || 0);
        }

        // 4. Escalas
        let stops = 0;
        if (/sem escalas/i.test(ariaCombined) || /voo direto/i.test(ariaCombined) || /sem escalas/i.test(fullText)) {
          stops = 0;
        } else if (/1 parada/i.test(ariaCombined) || /1 escala/i.test(ariaCombined) || /1 parada/i.test(fullText)) {
          stops = 1;
        } else if (/2 paradas/i.test(ariaCombined) || /2 escalas/i.test(ariaCombined) || /2 paradas/i.test(fullText)) {
          stops = 2;
        } else if (/3 paradas/i.test(ariaCombined) || /3 escalas/i.test(ariaCombined) || /3 paradas/i.test(fullText)) {
          stops = 3;
        }

        // 5. Companhia Aérea
        const knownAirlines = [
          "British Airways", "Virgin Atlantic", "Norse Atlantic Airways", "Norse Atlantic", "Norse",
          "JetBlue", "Delta", "American Airlines", "United", "Air France", "KLM", "Iberia",
          "Air Europa", "TAP Air Portugal", "TAP", "ITA Airways", "ITA", "LATAM", "GOL", "Azul",
          "Lufthansa", "Emirates", "Qatar Airways", "Copa Airlines", "Avianca", "Turkish Airlines",
          "Swiss", "Aer Lingus", "Icelandair", "SAS", "Scandinavian Airlines", "Air Canada",
          "Aerolineas Argentinas", "Etihad", "Singapore Airlines", "Qantas", "Finnair", "Austrian",
          "WestJet", "French Bee", "Level", "Condor", "PLAY", "Air Transat", "Brussels Airlines"
        ];
        
        let airlineName = "";

        // 1. Tenta extrair do primeiro span limpo de companhia
        const firstSpan = card.querySelector(".sSHqwe span:first-child, .TQqCae");
        if (firstSpan && firstSpan.textContent) {
          const txt = firstSpan.textContent.trim();
          if (txt && !/^\d/.test(txt) && !/parada|escala|h|min|R\$|\$|voo direto|sem escalas/i.test(txt)) {
            airlineName = txt;
          }
        }

        // 2. Tenta extrair de tags <img> com alt da companhia aérea
        if (!airlineName) {
          const imgEls = card.querySelectorAll("img[alt]");
          for (const img of Array.from(imgEls)) {
            const alt = (img.getAttribute("alt") || "").trim();
            if (alt && !/logo|icon|imagem|flight|voo|airline|companhia/i.test(alt) && alt.length >= 2) {
              airlineName = alt;
              break;
            }
          }
        }

        // 3. Tenta extrair de seletores de classe de texto do Google Flights
        if (!airlineName) {
          const airlineEl = card.querySelector(".sSHqwe span, .sSHqwe, .TQqCae, [data-airline]");
          if (airlineEl && airlineEl.textContent) {
            const txt = airlineEl.textContent.trim();
            if (txt && !/^\d/.test(txt) && !/parada|escala|h|min|R\$|\$|voo direto|sem escalas/i.test(txt)) {
              airlineName = txt;
            }
          }
        }

        // 4. Tenta encontrar correspondência com a lista global de companhias
        if (!airlineName) {
          for (const a of knownAirlines) {
            if (new RegExp(`\\b${a}\\b`, "i").test(ariaCombined) || new RegExp(`\\b${a}\\b`, "i").test(fullText)) {
              airlineName = a;
              break;
            }
          }
        }

        // 5. Extração via regex em aria-label (ex: "Voo da British Airways às 07:41...")
        if (!airlineName) {
          const ariaMatch = ariaCombined.match(/(?:Voo da|Voo operado por|Operado por|Flight by|Operated by)\s+([A-Za-zÀ-ÿ0-9\s]+?)(?:,|\.|\s+às|\s+at|\s+com)/i);
          if (ariaMatch && ariaMatch[1]) {
            airlineName = ariaMatch[1].trim();
          }
        }

        if (airlineName) {
          airlineName = airlineName.replace(/Operado por.*/i, "").replace(/Operated by.*/i, "").trim();
        }

        // 6. Número do Voo (ex: "LA 3124", "G3 1500", "AD 4050", "BA 246", "TP 72", "AA 904")
        let flightNum: string | undefined;

        // Procura primeiro com prefixo de IATA conhecido
        const fullCombo = `${ariaCombined} ${fullText}`;
        const iataMatch = fullCombo.match(/\b(LA|JJ|G3|AD|TP|AF|KL|IB|BA|AA|DL|UA|LH|QR|EK|CM|AV|AR|UX|KQ|ET|AC|WS|LX|AZ|TK|W6|FR|U2|VY)\s*(\d{2,4})(?!\d)/i);
        if (iataMatch) {
          flightNum = `${iataMatch[1].toUpperCase()} ${iataMatch[2]}`;
        }

        if (!flightNum) {
          for (const aria of allArias) {
            const m = aria.match(/(?:Voo|Flight|Voo nº|Flight #)\s*([A-Z0-9]{2}\s*\d{2,4})/i);
            if (m) {
              flightNum = m[1].toUpperCase();
              break;
            }
          }
        }

        if (!flightNum) {
          const genericMatch = fullCombo.match(/\b([A-Z][A-Z0-9]|[A-Z0-9][A-Z])\s*(\d{2,4})(?!\d)/);
          if (genericMatch && !/^(R\$|H\d|MIN|EM|DE|DA|DO|AO|ID|NO|BR|SP|RJ|PR|SC|RS|MG|BA|DF|CE|PE)/i.test(genericMatch[0])) {
            flightNum = `${genericMatch[1].toUpperCase()} ${genericMatch[2]}`;
          }
        }

        list.push({
          priceText,
          airline: airlineName || "Companhia Aérea",
          flightNumber: flightNum || null,
          departure,
          arrival,
          durMinutes,
          stops,
        });
      }

      return list;
    });

    const parsedResults: FlightOption[] = [];

    for (const raw of rawOptions) {
      try {
        const rawExtractedPrice = parseBrazilianPrice(raw.priceText);
        if (rawExtractedPrice <= 50) continue; // Filtra valores espúrios

        // O Google Flights exibe a tarifa individual por passageiro nos cartões de voo
        const unitPrice = rawExtractedPrice;

        parsedResults.push({
          origin: normOrigin,
          destination: normDestination,
          flightDate,
          returnDate: isRoundTrip && returnDate ? returnDate : null,
          tripType: isRoundTrip ? "round_trip" : "one_way",
          passengers: passengers || 1,
          children: children || 0,
          infantsInLap: infantsInLap || 0,
          price: unitPrice,
          currency: "BRL",
          airline: raw.airline,
          flightNumber: raw.flightNumber,
          departureTime: raw.departure,
          arrivalTime: raw.arrival,
          stops: raw.stops,
          durationMinutes: raw.durMinutes > 0 ? raw.durMinutes : undefined,
          provider: "Web Scraping (Playwright)",
          bookingLink: searchUrl,
        });
      } catch {}
    }

    // Remove duplicatas
    const seen = new Set<string>();
    const uniqueOptions: FlightOption[] = [];

    for (const r of parsedResults) {
      const key = `${r.price}-${r.airline}-${r.departureTime || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueOptions.push(r);
      }
    }

    uniqueOptions.sort((a, b) => a.price - b.price);

    if (uniqueOptions.length === 0) {
      throw new ScraperError(
        `Nenhum voo encontrado para ${normOrigin} → ${normDestination} nesta data.`
      );
    }

    const finalTop = uniqueOptions.slice(0, topN);

    logger.success(
      "SCRAPER",
      `📦 [Retorno JSON Scraper] ${finalTop.length} opções obtidas para ${normOrigin} → ${normDestination} (Menor: R$ ${finalTop[0].price.toFixed(2)})`,
      {
        totalFound: uniqueOptions.length,
        bestOption: finalTop[0],
        allOptions: finalTop,
      }
    );

    return finalTop;
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.error("SCRAPER", `Falha no Scraper para ${normOrigin}→${normDestination} (${elapsed}s): ${err.message}`, { error: err.stack });
    if (err instanceof ScraperError) {
      throw err;
    }
    throw new ScraperError(err.message || "Erro ao consultar voos no Google Flights.");
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
  }); // withBrowserLock
}

/**
 * Raspa a série histórica de preços (últimos 30-60 dias) disponibilizada pelo Google Flights
 */
export async function scrapeGoogleFlightsPriceHistory(
  origin: string,
  destination: string,
  flightDate: string,
  returnDate?: string | null,
  tripType?: "one_way" | "round_trip",
  passengers = 1,
  children = 0,
  infantsInLap = 0,
  days = 60
): Promise<{ date: string; timestampMs: number; price: number; currency: string }[]> {
  const normOrigin = origin.trim().toUpperCase();
  const normDestination = destination.trim().toUpperCase();
  const isRoundTrip = tripType === "round_trip" || (Boolean(returnDate) && tripType !== "one_way");
  const totalPax = (passengers || 1) + (children || 0) + (infantsInLap || 0);
  const paxParam = totalPax > 1 ? `&passengers=${totalPax}` : "";

  const searchUrl = isRoundTrip && returnDate
    ? `https://www.google.com/travel/flights?q=Flights%20to%20${normDestination}%20from%20${normOrigin}%20on%20${flightDate}%20through%20${returnDate}&curr=BRL&hl=pt-BR${paxParam}`
    : `https://www.google.com/travel/flights?q=Flights%20to%20${normDestination}%20from%20${normOrigin}%20on%20${flightDate}%20oneway&curr=BRL&hl=pt-BR${paxParam}`;

  logger.info(
    "SCRAPER",
    `📈 [Histórico Retroativo ${days}d] Consultando série temporal no Google Flights (${isRoundTrip ? "Ida e Volta" : "Somente Ida"}) para ${normOrigin} → ${normDestination} (${flightDate}${returnDate ? ` até ${returnDate}` : ""})`,
    { url: searchUrl, origin: normOrigin, destination: normDestination, flightDate, returnDate: returnDate || null, tripType: isRoundTrip ? "round_trip" : "one_way", totalPax, days }
  );

  return withBrowserLock(async () => {
  let browser;
  try {
    browser = await launchBrowserWithRetry();

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1024, height: 600 },
    });

    const page = await context.newPage();

    // Bloqueia mídias e fontes pesadas
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media", "font"].includes(type)) {
        return route.abort();
      }
      route.continue();
    });

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Aceita popup de cookies se presente
    try {
      const consentBtn = page.locator('button:has-text("Aceitar tudo"), button:has-text("Aceito"), button:has-text("Concordo"), button:has-text("I agree")');
      if (await consentBtn.first().isVisible({ timeout: 2000 })) {
        await consentBtn.first().click();
      }
    } catch {}

    // Aguarda carregamento dos dados
    await page.waitForTimeout(2500);

    // 1. Estratégia Principal: Extração dos Scripts AF_initDataCallback
    const scriptsContent = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      return scripts
        .map((s) => s.textContent || "")
        .filter((t) => t.includes("AF_initDataCallback") || t.includes("ds:1"))
        .join("\n");
    });

    const points: { date: string; timestampMs: number; price: number; currency: string }[] = [];
    const pattern = /\[\[(\[\d{12,14},\s*\d+\](?:,\s*\[\d{12,14},\s*\d+\])+)\]\]/g;
    const matches = [...scriptsContent.matchAll(pattern)];

    for (const match of matches) {
      try {
        const arrayJson = `[${match[1]}]`;
        const rawPoints: [number, number][] = JSON.parse(arrayJson);
          for (const [ts, price] of rawPoints) {
            const d = new Date(ts);
            if (!isNaN(d.getTime()) && price >= 50 && price <= 300000) {
              const unitPrice = Number(price);
              points.push({
                date: d.toISOString().split("T")[0],
                timestampMs: ts,
                price: unitPrice,
                currency: "BRL",
              });
            }
          }
      } catch {}
    }

    // Deduplica por data e ordena cronologicamente
    const uniqueMap = new Map<string, { date: string; timestampMs: number; price: number; currency: string }>();
    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

    for (const p of points) {
      if (p.timestampMs >= cutoffTimestamp || days >= 120) {
        uniqueMap.set(p.date, p);
      }
    }

    const sortedPoints = Array.from(uniqueMap.values()).sort((a, b) => a.timestampMs - b.timestampMs);

    if (sortedPoints.length > 0) {
      logger.success(
        "SCRAPER",
        `📊 [Histórico Coletado] ${sortedPoints.length} dias de preços retroativos obtidos para ${normOrigin} → ${normDestination} (${sortedPoints[0].date} a ${sortedPoints[sortedPoints.length - 1].date})`,
        {
          totalDays: sortedPoints.length,
          startDate: sortedPoints[0].date,
          endDate: sortedPoints[sortedPoints.length - 1].date,
          lowestPrice: Math.min(...sortedPoints.map((p) => p.price)),
          highestPrice: Math.max(...sortedPoints.map((p) => p.price)),
        }
      );
      return sortedPoints;
    }

    logger.warn(
      "SCRAPER",
      `Nenhum histórico de preços pré-calculado disponível no Google Flights para ${normOrigin} → ${normDestination}.`
    );
    return [];
  } catch (err: any) {
    logger.error("SCRAPER", `Erro ao extrair histórico de preços para ${normOrigin}→${normDestination}: ${err.message}`);
    throw new ScraperError(`Falha na extração de histórico de preços: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
  }); // withBrowserLock
}

export const buscarVoosScraper = scrapeGoogleFlights;
export const buscarHistoricoPrecosScraper = scrapeGoogleFlightsPriceHistory;

