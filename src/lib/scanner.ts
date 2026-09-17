import { findRouteById, listRoutes, recordFlightHistory, getAppSettings } from "./db";
import { fetchSerpApiFlights } from "./flight-tracker";
import { scrapeGoogleFlights } from "./scrapers/google-flights-scraper";
import { sendNtfyNotification } from "./notifier";
import { FlightOption, MonitoredRoute, ScanResult } from "./types";
import { logger } from "./logger";

export async function scanRoute(routeId: number): Promise<ScanResult> {
  const route = findRouteById(routeId);
  const searchedAt = new Date().toISOString();

  if (!route) {
    logger.warn("SCANNER", `Rota #${routeId} não encontrada para execução.`);
    return {
      success: false,
      routeId,
      origin: "",
      destination: "",
      flightDate: "",
      targetPrice: 0,
      isBelowTarget: false,
      notified: false,
      foundOptions: [],
      error: `Rota #${routeId} não encontrada.`,
      searchedAt,
    };
  }

  logger.info(
    "SCANNER",
    `Iniciando consulta para ${route.origin} → ${route.destination} em ${route.flightDate} (Meta: R$ ${route.targetPrice.toFixed(2)})`,
    { routeId: route.id, origin: route.origin, destination: route.destination, flightDate: route.flightDate },
    route.id
  );

  const settings = getAppSettings();
  const apiKey = settings.serpApiKey || process.env.SERPAPI_API_KEY || "";
  const provider = settings.searchProvider || "auto";

  let options: FlightOption[] = [];
  let providerUsed = "Google Flights API (SerpApi)";
  let lastError: string | undefined = undefined;

  // 1. Estratégia de Busca conforme Provedor Selecionado
  if (provider === "scraper") {
    providerUsed = "Web Scraping Direto (Playwright)";
    try {
      options = await scrapeGoogleFlights(
        route.origin,
        route.destination,
        route.flightDate,
        route.passengers || 1,
        5
      );
    } catch (err: any) {
      lastError = err.message;
      logger.error("SCRAPER", `Erro no Web Scraper para ${route.origin}→${route.destination}: ${err.message}`, { error: err.stack }, route.id);
    }
  } else if (provider === "serpapi") {
    providerUsed = "Google Flights API (SerpApi)";
    try {
      options = await fetchSerpApiFlights(
        route.origin,
        route.destination,
        route.flightDate,
        route.passengers || 1,
        apiKey,
        5
      );
    } catch (err: any) {
      lastError = err.message;
      logger.error("API", `Erro na SerpApi para ${route.origin}→${route.destination}: ${err.message}`, { error: err.stack }, route.id);
    }
  } else {
    // Modo "auto"
    try {
      options = await scrapeGoogleFlights(
        route.origin,
        route.destination,
        route.flightDate,
        route.passengers || 1,
        5
      );
      providerUsed = "Web Scraping Direto (Playwright)";
    } catch (scraperErr: any) {
      logger.warn(
        "SCANNER",
        `Web Scraper falhou para ${route.origin}→${route.destination}. Acionando fallback para SerpApi API...`,
        { scraperError: scraperErr.message },
        route.id
      );
      try {
        options = await fetchSerpApiFlights(
          route.origin,
          route.destination,
          route.flightDate,
          route.passengers || 1,
          apiKey,
          5
        );
        providerUsed = "Google Flights API (Fallback SerpApi)";
      } catch (apiErr: any) {
        lastError = `Scraper: ${scraperErr.message} | API: ${apiErr.message}`;
        logger.error(
          "SCANNER",
          `Falha em ambos provedores para ${route.origin}→${route.destination}: ${lastError}`,
          undefined,
          route.id
        );
      }
    }
  }

  if (options.length === 0) {
    const errorMsg = lastError || "Nenhum voo encontrado para esta rota na data selecionada.";
    logger.warn("SCANNER", `Nenhum voo obtido para ${route.origin}→${route.destination}: ${errorMsg}`, undefined, route.id);
    return {
      success: false,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      flightDate: route.flightDate,
      targetPrice: route.targetPrice,
      isBelowTarget: false,
      notified: false,
      foundOptions: [],
      providerUsed,
      error: errorMsg,
      searchedAt,
    };
  }

  const bestOption = options[0];
  const lowestPrice = bestOption.price;
  const isBelowTarget = lowestPrice <= route.targetPrice;

  // Registra no banco SQLite
  recordFlightHistory({
    origin: route.origin,
    destination: route.destination,
    flightDate: route.flightDate,
    lowestPrice,
    currency: bestOption.currency || "BRL",
    routeId: route.id,
    airline: bestOption.airline || null,
    flightNumber: bestOption.flightNumber || null,
    departureTime: bestOption.departureTime || null,
    arrivalTime: bestOption.arrivalTime || null,
    stops: bestOption.stops ?? null,
    durationMinutes: bestOption.durationMinutes ?? null,
    bookingLink: bestOption.bookingLink || null,
    searchedAt,
  });

  logger.success(
    "SCANNER",
    `Tarifa coletada: ${route.origin} → ${route.destination} por R$ ${lowestPrice.toFixed(2)} (${bestOption.airline || "Companhia"}) via ${providerUsed}.`,
    {
      lowestPrice,
      airline: bestOption.airline,
      stops: bestOption.stops,
      durationMinutes: bestOption.durationMinutes,
      targetPrice: route.targetPrice,
      isBelowTarget,
    },
    route.id
  );

  let notified = false;
  if (isBelowTarget && settings.autoNotify && settings.ntfyTopic) {
    notified = await sendNtfyNotification({
      topic: settings.ntfyTopic,
      origin: route.origin,
      destination: route.destination,
      flightDate: route.flightDate,
      price: lowestPrice,
      targetPrice: route.targetPrice,
      currency: bestOption.currency || "BRL",
      airline: bestOption.airline,
      flightNumber: bestOption.flightNumber,
      departureTime: bestOption.departureTime,
      arrivalTime: bestOption.arrivalTime,
      stops: bestOption.stops,
      bookingLink: bestOption.bookingLink,
    });
    if (notified) {
      logger.success(
        "NOTIFICATION",
        `🚨 Alerta de preço disparado para o tópico '${settings.ntfyTopic}': R$ ${lowestPrice.toFixed(2)} <= R$ ${route.targetPrice.toFixed(2)}`,
        { route: `${route.origin}->${route.destination}`, price: lowestPrice, targetPrice: route.targetPrice },
        route.id
      );
    }
  }

  return {
    success: true,
    routeId: route.id,
    origin: route.origin,
    destination: route.destination,
    flightDate: route.flightDate,
    lowestPrice,
    currency: bestOption.currency || "BRL",
    targetPrice: route.targetPrice,
    isBelowTarget,
    notified,
    foundOptions: options,
    providerUsed,
    searchedAt,
  };
}

export async function scanAllActiveRoutes(): Promise<{
  totalRoutes: number;
  successes: number;
  alertsTriggered: number;
  results: ScanResult[];
  // Backwards compatibility fields for old callers
  totalRotas?: number;
  sucessos?: number;
  alertasDisparados?: number;
  resultados?: ScanResult[];
}> {
  const activeRoutes = listRoutes(true);
  logger.info("SCANNER", `Iniciando ciclo de varredura para ${activeRoutes.length} rota(s) ativa(s)...`);
  const results: ScanResult[] = [];
  let successes = 0;
  let alertsTriggered = 0;

  for (const route of activeRoutes) {
    const res = await scanRoute(route.id);
    results.push(res);
    if (res.success) successes++;
    if (res.notified) alertsTriggered++;

    if (activeRoutes.length > 1) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  logger.info(
    "SCANNER",
    `Ciclo concluído: ${successes}/${activeRoutes.length} rota(s) verificadas com sucesso.`,
    { total: activeRoutes.length, successes, alertsTriggered }
  );

  return {
    totalRoutes: activeRoutes.length,
    successes,
    alertsTriggered,
    results,
    // Aliases
    totalRotas: activeRoutes.length,
    sucessos: successes,
    alertasDisparados: alertsTriggered,
    resultados: results,
  };
}

// Backward-compatibility aliases
export const executarBuscaParaRota = scanRoute;
export const executarBuscaParaTodasRotasAtivas = scanAllActiveRoutes;
