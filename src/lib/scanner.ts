import { findRouteById, listRoutes, recordFlightHistory, getAppSettings, updateRouteScanStatus, findUserById, getHistoryByRoute, updateRouteLastNotified, updateRoute } from "./db";
import { scrapeGoogleFlights } from "./scrapers/google-flights-scraper";
import { fetchSerpApiFlights } from "./flight-tracker";
import { sendNtfyNotification } from "./notifier";
import { sendDealAlertEmail } from "./email";
import { FlightOption, MonitoredRoute, ScanResult } from "./types";
import { logger } from "./logger";
import { fetchMonthMatrixPrices } from "@/services/aviasalesDataService";
import { getGoogleFlightsUrl } from "./utils";
import { analyzeFlightPrice } from "./stats/flight-anomaly-detector";

// Cache de promessas de varredura ativas por routeId para deduplicação de chamadas concorrentes
declare global {
  // eslint-disable-next-line no-var
  var __inFlightScans: Map<number, Promise<ScanResult>> | undefined;
}

const inFlightScans: Map<number, Promise<ScanResult>> =
  global.__inFlightScans || new Map();
global.__inFlightScans = inFlightScans;

export function isRouteScanning(routeId: number): boolean {
  return inFlightScans.has(routeId);
}

export function scanRoute(routeId: number): Promise<ScanResult> {
  const existing = inFlightScans.get(routeId);
  if (existing) {
    logger.info("SCANNER", `Reutilizando varredura em andamento para a rota #${routeId}`);
    return existing;
  }

  const scanPromise = (async () => {
    try {
      return await executeScanRoute(routeId);
    } finally {
      inFlightScans.delete(routeId);
    }
  })();

  inFlightScans.set(routeId, scanPromise);
  return scanPromise;
}

async function executeScanRoute(routeId: number): Promise<ScanResult> {
  const route = await findRouteById(routeId);
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

  const todayStr = new Date().toISOString().split("T")[0];
  if (route.flightDate < todayStr) {
    logger.warn("SCANNER", `Rota #${route.id} com data no passado (${route.flightDate} < ${todayStr}). Busca ignorada e rota desativada.`);
    await updateRoute(route.id, { isActive: false });
    return {
      success: false,
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,
      flightDate: route.flightDate,
      lowestPrice: 0,
      currency: "BRL",
      targetPrice: route.targetPrice,
      isBelowTarget: false,
      isStatisticalDeal: false,
      anomalyAnalysis: {
        isDeal: false,
        dealLevel: "NORMAL",
        zScore: null,
        sampleSize: 0,
        mean: null,
        stdDev: null,
        discountPercent: null,
        message: "A data de partida deste voo já passou.",
      },
      notified: false,
      foundOptions: [],
      providerUsed: "none",
      searchedAt,
      error: "A data de partida deste voo já passou. A rota foi desativada automaticamente.",
    };
  }

  logger.info(
    "SCANNER",
    `Iniciando consulta para ${route.origin} → ${route.destination} em ${route.flightDate} (Meta: R$ ${route.targetPrice.toFixed(2)})`,
    { routeId: route.id, origin: route.origin, destination: route.destination, flightDate: route.flightDate },
    route.id
  );

  const settings = await getAppSettings().catch(() => null);
  const configuredProvider = settings?.searchProvider || "scraper";
  const serpApiKey = (settings?.serpApiKey || process.env.SERPAPI_API_KEY || "").trim();

  let options: FlightOption[] = [];
  let providerUsed = "Web Scraping Direto (Playwright)";
  let lastError: string | undefined = undefined;

  const runScraper = async () => {
    return await scrapeGoogleFlights(
      route.origin,
      route.destination,
      route.flightDate,
      route.passengers || 1,
      5,
      route.returnDate,
      route.tripType,
      route.children || 0,
      route.infantsInLap || 0
    );
  };

  const runSerpApi = async () => {
    return await fetchSerpApiFlights(
      route.origin,
      route.destination,
      route.flightDate,
      route.passengers || 1,
      serpApiKey,
      5,
      route.returnDate,
      route.tripType,
      route.children || 0,
      route.infantsInLap || 0
    );
  };

  if (configuredProvider === "serpapi") {
    if (serpApiKey) {
      try {
        options = await runSerpApi();
        providerUsed = "SerpApi Google Flights";
      } catch (err: any) {
        lastError = err.message;
        logger.warn("SCANNER", `Falha na busca SerpApi (${err.message}). Tentando fallback para Web Scraper...`, undefined, route.id);
        try {
          options = await runScraper();
          providerUsed = "Web Scraping Direto (Playwright) [Fallback]";
          lastError = undefined;
        } catch (sErr: any) {
          lastError = sErr.message;
        }
      }
    } else {
      logger.warn("SCANNER", "Provedor SerpApi selecionado, mas chave SERPAPI_API_KEY não configurada. Usando Web Scraper...", undefined, route.id);
      try {
        options = await runScraper();
        providerUsed = "Web Scraping Direto (Playwright)";
      } catch (sErr: any) {
        lastError = sErr.message;
      }
    }
  } else {
    // Provedor padrão: Web Scraping Direto (Playwright)
    try {
      options = await runScraper();
      providerUsed = "Web Scraping Direto (Playwright)";
    } catch (err: any) {
      lastError = err.message;
      logger.error("SCRAPER", `Erro no Web Scraper para ${route.origin}→${route.destination}: ${err.message}`, { error: err.stack }, route.id);

      // Fallback automático para SerpApi se chave estiver configurada
      if (serpApiKey) {
        logger.info("SCANNER", `Tentando recuperação automática via SerpApi para ${route.origin}→${route.destination}...`, undefined, route.id);
        try {
          options = await runSerpApi();
          providerUsed = "SerpApi Google Flights (Fallback)";
          lastError = undefined;
        } catch (apiErr: any) {
          logger.warn("SCANNER", `Fallback SerpApi também falhou: ${apiErr.message}`, undefined, route.id);
        }
      }
    }
  }

  if (options.length === 0) {
    const errorMsg = lastError
      ? lastError.replace(/^Falha no Web Scraper do Google Flights:\s*/i, "")
      : `Nenhum voo encontrado para ${route.origin} → ${route.destination} nesta data.`;
    logger.warn("SCANNER", `Nenhum voo obtido para ${route.origin}→${route.destination}: ${errorMsg}`, undefined, route.id);
    await updateRouteScanStatus(route.id, searchedAt, errorMsg);
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

  // Segrega voos diretos e com conexões
  const directOptions = options.filter((o) => o.stops === 0).sort((a, b) => a.price - b.price);
  const stopsOptions = options.filter((o) => typeof o.stops === "number" && o.stops > 0).sort((a, b) => a.price - b.price);

  const bestDirect = directOptions[0] || null;
  const bestWithStops = stopsOptions[0] || null;

  // Se a rota estiver configurada exclusivamente para "Apenas voos diretos"
  let primaryOption: FlightOption;
  if (route.onlyDirect) {
    if (!bestDirect) {
      const msg = "Nenhum voo direto encontrado para esta data/rota.";
      logger.info("SCANNER", `${route.origin}→${route.destination} [Apenas Diretos]: ${msg}`, undefined, route.id);
      if (bestWithStops) {
        await recordFlightHistory({
          origin: route.origin,
          destination: route.destination,
          flightDate: route.flightDate,
          returnDate: route.returnDate || null,
          tripType: route.tripType || (route.returnDate ? "round_trip" : "one_way"),
          passengers: route.passengers || 1,
          children: route.children || 0,
          infantsInLap: route.infantsInLap || 0,
          lowestPrice: bestWithStops.price,
          currency: bestWithStops.currency || "BRL",
          routeId: route.id,
          airline: bestWithStops.airline || null,
          flightNumber: bestWithStops.flightNumber || null,
          departureTime: bestWithStops.departureTime || null,
          arrivalTime: bestWithStops.arrivalTime || null,
          stops: bestWithStops.stops ?? 1,
          durationMinutes: bestWithStops.durationMinutes ?? null,
          bookingLink: bestWithStops.bookingLink || null,
          lowestDirectPrice: null,
          directAirline: null,
          lowestStopPrice: bestWithStops.price,
          stopAirline: bestWithStops.airline || null,
          stopCount: bestWithStops.stops ?? 1,
          searchedAt,
        });
      }
      return {
        success: true,
        routeId: route.id,
        origin: route.origin,
        destination: route.destination,
        flightDate: route.flightDate,
        returnDate: route.returnDate || null,
        tripType: route.tripType || (route.returnDate ? "round_trip" : "one_way"),
        targetPrice: route.targetPrice,
        isBelowTarget: false,
        notified: false,
        foundOptions: options,
        providerUsed,
        searchedAt,
      };
    }
    primaryOption = bestDirect;
  } else {
    // Por default: o menor preço geral encontrado
    primaryOption = options[0];
  }

  const lowestPrice = primaryOption.price;
  const isBelowTarget = lowestPrice <= route.targetPrice;

  // Registra no banco SQLite com dados segregados
  await recordFlightHistory({
    origin: route.origin,
    destination: route.destination,
    flightDate: route.flightDate,
    returnDate: route.returnDate || null,
    tripType: route.tripType || (route.returnDate ? "round_trip" : "one_way"),
    passengers: route.passengers || 1,
    children: route.children || 0,
    infantsInLap: route.infantsInLap || 0,
    lowestPrice,
    currency: primaryOption.currency || "BRL",
    routeId: route.id,
    airline: primaryOption.airline || null,
    flightNumber: primaryOption.flightNumber || null,
    departureTime: primaryOption.departureTime || null,
    arrivalTime: primaryOption.arrivalTime || null,
    stops: primaryOption.stops ?? null,
    durationMinutes: primaryOption.durationMinutes ?? null,
    bookingLink: primaryOption.bookingLink || null,
    lowestDirectPrice: bestDirect ? bestDirect.price : null,
    directAirline: bestDirect ? bestDirect.airline || null : null,
    lowestStopPrice: bestWithStops ? bestWithStops.price : null,
    stopAirline: bestWithStops ? bestWithStops.airline || null : null,
    stopCount: bestWithStops ? (bestWithStops.stops ?? 1) : null,
    searchedAt,
  });

  await updateRouteScanStatus(route.id, searchedAt, null);

  logger.success(
    "SCANNER",
    `Tarifa coletada: ${route.origin} → ${route.destination} por R$ ${lowestPrice.toFixed(2)} (${primaryOption.airline || "Companhia"}${primaryOption.stops === 0 ? " - Direto" : ` - ${primaryOption.stops} parada(s)`}) via ${providerUsed}.`,
    {
      lowestPrice,
      airline: primaryOption.airline,
      stops: primaryOption.stops,
      durationMinutes: primaryOption.durationMinutes,
      targetPrice: route.targetPrice,
      isBelowTarget,
      onlyDirect: Boolean(route.onlyDirect),
      lowestDirectPrice: bestDirect?.price,
      lowestStopPrice: bestWithStops?.price,
    },
    route.id
  );

  // Avaliação estatística de anomalia tarifária com correção de Bessel (N - 1)
  const history = await getHistoryByRoute(route.id, 60);
  const anomalyAnalysis = analyzeFlightPrice(
    route.origin,
    route.destination,
    route.flightDate,
    lowestPrice,
    history
  );
  const isStatisticalDeal = anomalyAnalysis.isDeal;

  if (isStatisticalDeal) {
    logger.info(
      "SCANNER",
      `📊 Anomalia Estatística [${anomalyAnalysis.dealLevel}] detectada para #${route.id} (${route.origin}→${route.destination}): Z-Score ${anomalyAnalysis.zScore}, Desconto ~${anomalyAnalysis.discountPercent}% em relação à média R$ ${anomalyAnalysis.mean?.toFixed(2)}`,
      {
        zScore: anomalyAnalysis.zScore,
        mean: anomalyAnalysis.mean,
        stdDev: anomalyAnalysis.stdDev,
        dealLevel: anomalyAnalysis.dealLevel,
        sampleSize: anomalyAnalysis.sampleSize,
      },
      route.id
    );
  }

  let notified = false;

  // Verificação de datas flexíveis se a rota possuir tolerância configurada
  let recommendedAlternative: {
    departureDate: string;
    returnDate?: string | null;
    price: number;
    savingsPercent: number;
    bookingLink?: string;
  } | undefined = undefined;

  if (route.flexibilityDays && route.flexibilityDays > 0) {
    try {
      const month = route.flightDate.slice(0, 7);
      const calendarPrices = await fetchMonthMatrixPrices({
        origin: route.origin,
        destination: route.destination,
        month,
        currency: primaryOption.currency || "BRL",
      });

      const baseDep = route.flightDate;
      let bestAltPrice = Infinity;
      let bestAltItem: (typeof calendarPrices)[0] | null = null;

      for (const item of calendarPrices) {
        if (!item.departureDate || item.departureDate === baseDep) continue;
        const diffDays = Math.abs(
          (new Date(item.departureDate).getTime() - new Date(baseDep).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays <= route.flexibilityDays && item.price < lowestPrice) {
          if (item.price < bestAltPrice) {
            bestAltPrice = item.price;
            bestAltItem = item;
          }
        }
      }

      if (bestAltItem && bestAltPrice < lowestPrice) {
        const savingsPercent = Math.round(((lowestPrice - bestAltPrice) / lowestPrice) * 100);
        if (savingsPercent >= 5) {
          recommendedAlternative = {
            departureDate: bestAltItem.departureDate,
            returnDate: bestAltItem.returnDate || null,
            price: bestAltPrice,
            savingsPercent,
            bookingLink: getGoogleFlightsUrl(
              route.origin,
              route.destination,
              bestAltItem.departureDate,
              route.passengers || 1,
              bestAltItem.returnDate,
              route.tripType
            ),
          };
          logger.info(
            "SCANNER",
            `💡 Data flexível vantajosa detectada para #${route.id}: ${bestAltItem.departureDate} por R$ ${bestAltPrice.toFixed(2)} (-${savingsPercent}%)`,
            undefined,
            route.id
          );
        }
      }
    } catch (err: any) {
      logger.warn("SCANNER", `Aviso ao consultar datas flexíveis para #${route.id}: ${err.message}`, undefined, route.id);
    }
  }

  const shouldNotify = isBelowTarget || isStatisticalDeal || Boolean(recommendedAlternative && recommendedAlternative.price <= route.targetPrice);

  if (shouldNotify) {
    // Debounce / Cooldown de Notificações:
    // Evita spam de alertas em toda rodada do agendador.
    // Só envia novo alerta se:
    // 1. Nunca foi notificado antes, OU
    // 2. Passaram pelo menos 24 horas desde a última notificação, OU
    // 3. O preço atual caiu pelo menos 3% em relação ao último preço notificado.
    let allowNotification = true;
    if (route.lastNotifiedAt && route.lastNotifiedPrice) {
      const lastNotifiedTime = new Date(route.lastNotifiedAt).getTime();
      const hoursSinceLastNotification = (Date.now() - lastNotifiedTime) / (1000 * 60 * 60);
      const priceDropPercent = ((route.lastNotifiedPrice - lowestPrice) / route.lastNotifiedPrice) * 100;

      if (hoursSinceLastNotification < 24 && priceDropPercent < 3) {
        allowNotification = false;
        logger.info(
          "NOTIFICATION",
          `⏳ Alerta suprimido por cooldown para #${route.id} (${route.origin}→${route.destination}): R$ ${lowestPrice.toFixed(2)} já notificado há ${hoursSinceLastNotification.toFixed(1)}h (queda de ${priceDropPercent.toFixed(1)}% < 3%).`,
          { lastNotifiedAt: route.lastNotifiedAt, lastNotifiedPrice: route.lastNotifiedPrice, currentPrice: lowestPrice },
          route.id
        );
      }
    }

    if (allowNotification) {
      // 1. Notificação Push NTFY (se configurado nas opções)
      if (settings?.autoNotify && settings?.ntfyTopic) {
        const ntfySent = await sendNtfyNotification({
          topic: settings.ntfyTopic,
          origin: route.origin,
          destination: route.destination,
          flightDate: route.flightDate,
          price: lowestPrice,
          targetPrice: route.targetPrice,
          currency: primaryOption.currency || "BRL",
          passengers: route.passengers || 1,
          children: route.children || 0,
          infantsInLap: route.infantsInLap || 0,
          airline: primaryOption.airline,
          flightNumber: primaryOption.flightNumber,
          departureTime: primaryOption.departureTime,
          arrivalTime: primaryOption.arrivalTime,
          stops: primaryOption.stops,
          bookingLink: primaryOption.bookingLink,
          anomalyAnalysis,
          recommendedAlternative,
        });
        if (ntfySent) {
          notified = true;
          const triggerReason = isStatisticalDeal
            ? `Anomalia Estatística (${anomalyAnalysis.dealLevel}, Z: ${anomalyAnalysis.zScore})`
            : `Meta atingida: R$ ${lowestPrice.toFixed(2)} <= R$ ${route.targetPrice.toFixed(2)}`;
          logger.success(
            "NOTIFICATION",
            `🚨 Alerta disparado para o tópico '${settings.ntfyTopic}' [${triggerReason}]`,
            { route: `${route.origin}->${route.destination}`, price: lowestPrice, targetPrice: route.targetPrice, zScore: anomalyAnalysis.zScore },
            route.id
          );
        }
      }

      // 2. Disparo de E-mail de Alerta para o usuário proprietário da rota
      if (route.userId) {
        try {
          const user = await findUserById(route.userId);
          if (user && user.email) {
            const emailSent = await sendDealAlertEmail({
              email: user.email,
              name: user.name,
              origin: route.origin,
              destination: route.destination,
              flightDate: route.flightDate,
              returnDate: route.returnDate || null,
              price: lowestPrice,
              targetPrice: route.targetPrice,
              currency: primaryOption.currency || "BRL",
              airline: primaryOption.airline,
              flightNumber: primaryOption.flightNumber,
              departureTime: primaryOption.departureTime,
              arrivalTime: primaryOption.arrivalTime,
              stops: primaryOption.stops,
              durationMinutes: primaryOption.durationMinutes,
              bookingLink: primaryOption.bookingLink,
              passengers: route.passengers || 1,
              children: route.children || 0,
              infantsInLap: route.infantsInLap || 0,
              anomalyAnalysis,
              recommendedAlternative,
            });
            if (emailSent) {
              notified = true;
              logger.success(
                "NOTIFICATION",
                `🎯 E-mail de alerta enviado para ${user.email} (Rota #${route.id}: R$ ${lowestPrice.toFixed(2)} | Meta R$ ${route.targetPrice.toFixed(2)}${isStatisticalDeal ? ` | ${anomalyAnalysis.dealLevel} Z=${anomalyAnalysis.zScore}` : ""})`,
                { email: user.email, price: lowestPrice, targetPrice: route.targetPrice, dealLevel: anomalyAnalysis.dealLevel },
                route.id
              );
            }
          }
        } catch (err: any) {
          logger.error("NOTIFICATION", `Falha ao enviar e-mail de alerta de preço para rota #${route.id}: ${err.message}`);
        }
      }

      if (notified) {
        await updateRouteLastNotified(route.id, lowestPrice);
      }
    }
  }

  return {
    success: true,
    routeId: route.id,
    origin: route.origin,
    destination: route.destination,
    flightDate: route.flightDate,
    lowestPrice,
    currency: primaryOption.currency || "BRL",
    targetPrice: route.targetPrice,
    isBelowTarget,
    isStatisticalDeal,
    anomalyAnalysis,
    notified,
    foundOptions: options,
    providerUsed,
    searchedAt,
  };
}

export async function scanAllActiveRoutes(options?: { userId?: number }): Promise<{
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
  const activeRoutes = await listRoutes({ activeOnly: true, userId: options?.userId });
  logger.info("SCANNER", `Iniciando ciclo de varredura para ${activeRoutes.length} rota(s) ativa(s)...`);
  const results: ScanResult[] = [];
  let successes = 0;
  let alertsTriggered = 0;
  const today = new Date().toISOString().split("T")[0];

  for (const route of activeRoutes) {
    if (route.flightDate < today) {
      logger.info("SCANNER", `Rota #${route.id} expirada (${route.flightDate} < ${today}). Desativando automaticamente.`);
      await updateRoute(route.id, { isActive: false });
      continue;
    }

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
