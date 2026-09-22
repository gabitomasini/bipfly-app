import { findRouteById, listRoutes, recordFlightHistory, getAppSettings, updateRouteScanStatus, findUserById } from "./db";
import { scrapeGoogleFlights } from "./scrapers/google-flights-scraper";
import { sendNtfyNotification } from "./notifier";
import { sendDealAlertEmail } from "./email";
import { FlightOption, MonitoredRoute, ScanResult } from "./types";
import { logger } from "./logger";

export async function scanRoute(routeId: number): Promise<ScanResult> {
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

  logger.info(
    "SCANNER",
    `Iniciando consulta para ${route.origin} → ${route.destination} em ${route.flightDate} (Meta: R$ ${route.targetPrice.toFixed(2)})`,
    { routeId: route.id, origin: route.origin, destination: route.destination, flightDate: route.flightDate },
    route.id
  );

  let options: FlightOption[] = [];
  const providerUsed = "Web Scraping Direto (Playwright)";
  let lastError: string | undefined = undefined;

  try {
    options = await scrapeGoogleFlights(
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
  } catch (err: any) {
    lastError = err.message;
    logger.error("SCRAPER", `Erro no Web Scraper para ${route.origin}→${route.destination}: ${err.message}`, { error: err.stack }, route.id);
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
  const directOptions = options.filter((o) => (o.stops ?? 0) === 0).sort((a, b) => a.price - b.price);
  const stopsOptions = options.filter((o) => (o.stops ?? 0) > 0).sort((a, b) => a.price - b.price);

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

  let notified = false;
  const settings = await getAppSettings();

  if (isBelowTarget) {
    // 1. Notificação Push NTFY (se configurado nas opções)
    if (settings.autoNotify && settings.ntfyTopic) {
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
      });
      if (ntfySent) {
        notified = true;
        logger.success(
          "NOTIFICATION",
          `🚨 Alerta de preço disparado para o tópico '${settings.ntfyTopic}': R$ ${lowestPrice.toFixed(2)} <= R$ ${route.targetPrice.toFixed(2)}`,
          { route: `${route.origin}->${route.destination}`, price: lowestPrice, targetPrice: route.targetPrice },
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
          });
          if (emailSent) {
            notified = true;
            logger.success(
              "NOTIFICATION",
              `🎯 E-mail de alerta de preço enviado para ${user.email} (Rota #${route.id}: R$ ${lowestPrice.toFixed(2)} <= Meta R$ ${route.targetPrice.toFixed(2)})`,
              { email: user.email, price: lowestPrice, targetPrice: route.targetPrice },
              route.id
            );
          }
        }
      } catch (err: any) {
        logger.error("NOTIFICATION", `Falha ao enviar e-mail de alerta de preço para rota #${route.id}: ${err.message}`);
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
  const activeRoutes = await listRoutes(true);
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
