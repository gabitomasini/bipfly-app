import { chromium } from "playwright";
import { FlightOption } from "../types";
import { parseBrazilianPrice } from "../flight-tracker";
import { logger } from "../logger";

export class ScraperError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScraperError";
  }
}

export async function scrapeGoogleFlights(
  origin: string,
  destination: string,
  flightDate: string,
  passengers = 1,
  topN = 5
): Promise<FlightOption[]> {
  const normOrigin = origin.trim().toUpperCase();
  const normDestination = destination.trim().toUpperCase();

  // URL direta de voos no Google Flights em BRL e idioma pt-BR
  const searchUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${normDestination}%20from%20${normOrigin}%20on%20${flightDate}%20oneway&curr=BRL&hl=pt-BR`;

  logger.info(
    "SCRAPER",
    `🌐 [Requisição Playwright] Abrindo Google Flights: ${normOrigin} → ${normDestination} (${flightDate})`,
    {
      type: "HTTP_PAGE_NAVIGATION",
      url: searchUrl,
      origin: normOrigin,
      destination: normDestination,
      flightDate,
      passengers,
    }
  );

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1280,800",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Bloqueia imagens e mídias pesadas
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "media"].includes(type)) {
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
          const cards = document.querySelectorAll("li.pIav2d, div.pIav2d");
          return cards.length > 0;
        },
        { timeout: 12000 }
      );
    } catch {}

    await page.waitForTimeout(1500);

    // Extrai dos cartões de voo oficiais
    const rawOptions = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll("li.pIav2d, div.pIav2d"));
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
          "Air Europa", "Tap Air Portugal", "TAP", "ITA Airways", "ITA", "LATAM", "GOL", "Azul",
          "Air France", "KLM", "Iberia", "British Airways", "American Airlines",
          "Delta", "United", "Lufthansa", "Emirates", "Qatar Airways", "Copa Airlines",
          "Avianca", "Turkish Airlines", "Swiss", "Aerolineas Argentinas"
        ];
        let airlineName = "Companhia Aérea";
        for (const a of knownAirlines) {
          if (new RegExp(a, "i").test(ariaCombined) || new RegExp(a, "i").test(fullText)) {
            airlineName = a;
            break;
          }
        }

        list.push({
          priceText,
          airline: airlineName,
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
        const unitPrice = parseBrazilianPrice(raw.priceText);
        if (unitPrice <= 100) continue; // Filtra valores espúrios

        parsedResults.push({
          origin: normOrigin,
          destination: normDestination,
          flightDate,
          price: unitPrice,
          currency: "BRL",
          airline: raw.airline,
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
        "Nenhum voo pôde ser extraído da página de voos reais do Google Flights."
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
    logger.error("SCRAPER", `Falha no Scraper para ${normOrigin}→${normDestination}: ${err.message}`, { error: err.stack });
    throw new ScraperError(`Falha no Web Scraper do Google Flights: ${err.message}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Raspa a série histórica de preços (últimos 30-60 dias) disponibilizada pelo Google Flights
 */
export async function scrapeGoogleFlightsPriceHistory(
  origin: string,
  destination: string,
  flightDate: string
): Promise<{ date: string; timestampMs: number; price: number; currency: string }[]> {
  const normOrigin = origin.trim().toUpperCase();
  const normDestination = destination.trim().toUpperCase();
  const searchUrl = `https://www.google.com/travel/flights?q=Flights%20to%20${normDestination}%20from%20${normOrigin}%20on%20${flightDate}%20oneway&curr=BRL&hl=pt-BR`;

  logger.info(
    "SCRAPER",
    `📈 [Histórico Retroativo] Consultando série temporal no Google Flights para ${normOrigin} → ${normDestination} (${flightDate})`,
    { url: searchUrl, origin: normOrigin, destination: normDestination, flightDate }
  );

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--window-size=1280,800",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    });

    const page = await context.newPage();

    // Bloqueia mídias pesadas
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
            points.push({
              date: d.toISOString().split("T")[0],
              timestampMs: ts,
              price: Number(price),
              currency: "BRL",
            });
          }
        }
      } catch {}
    }

    // Deduplica por data e ordena cronologicamente
    const uniqueMap = new Map<string, { date: string; timestampMs: number; price: number; currency: string }>();
    for (const p of points) {
      uniqueMap.set(p.date, p);
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
}

export const buscarVoosScraper = scrapeGoogleFlights;
export const buscarHistoricoPrecosScraper = scrapeGoogleFlightsPriceHistory;

