import { FlightOption } from "./types";
import { getGoogleFlightsUrl } from "./utils";
import { logger } from "./logger";

export class FlightTrackerError extends Error {
  public recoverable: boolean;
  constructor(message: string, recoverable = false) {
    super(message);
    this.name = "FlightTrackerError";
    this.recoverable = recoverable;
  }
}

export function parseBrazilianPrice(value: any): number {
  if (typeof value === "number") return value;
  if (!value) throw new Error("Preço vazio");

  let str = String(value).trim();
  str = str.replace(/R\$|\$|€/g, "").trim();

  // Caso 1: Tem vírgula e ponto (ex: 1.899,90 ou 1,899.90)
  if (str.includes(",") && str.includes(".")) {
    const lastComma = str.lastIndexOf(",");
    const lastDot = str.lastIndexOf(".");
    if (lastComma > lastDot) {
      // Formato brasileiro: 1.899,90
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // Formato americano: 1,899.90
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // Ex: 1899,90 -> 1899.90
    str = str.replace(",", ".");
  } else if (str.includes(".")) {
    // Ex: "2.136" (milhar brasileiro) vs "2136.50" (decimal)
    const parts = str.split(".");
    if (parts.length > 2) {
      // Múltiplos pontos: 1.234.567
      str = str.replace(/\./g, "");
    } else if (parts.length === 2 && parts[1].length === 3) {
      // Ponto seguido de 3 dígitos (milhar): 2.136 -> 2136
      str = str.replace(".", "");
    }
  }

  // Remove caracteres residuais
  str = str.replace(/[^\d.-]/g, "");
  const num = parseFloat(str);
  if (isNaN(num)) throw new Error(`Não foi possível converter '${value}' em preço.`);
  return num;
}

export async function fetchSerpApiFlights(
  origin: string,
  destination: string,
  flightDate: string,
  adults = 1,
  apiKey: string,
  topN = 5,
  returnDate?: string | null,
  tripType?: "one_way" | "round_trip",
  children = 0,
  infantsInLap = 0
): Promise<FlightOption[]> {
  const normOrigin = origin.trim().toUpperCase();
  const normDestination = destination.trim().toUpperCase();
  const isRoundTrip = tripType === "round_trip" || (Boolean(returnDate) && tripType !== "one_way");

  if (!apiKey || !apiKey.trim()) {
    throw new FlightTrackerError(
      "Chave da SerpApi (SERPAPI_API_KEY) não configurada. Cadastre-se em https://serpapi.com/ para obter sua chave gratuita.",
      false
    );
  }

  const url = new URL("https://serpapi.com/search");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("type", isRoundTrip && returnDate ? "1" : "2"); // 1 = Round trip, 2 = One way
  url.searchParams.set("departure_id", normOrigin);
  url.searchParams.set("arrival_id", normDestination);
  url.searchParams.set("outbound_date", flightDate);
  if (isRoundTrip && returnDate) {
    url.searchParams.set("return_date", returnDate);
  }
  url.searchParams.set("adults", String(adults || 1));
  if (children > 0) {
    url.searchParams.set("children", String(children));
  }
  if (infantsInLap > 0) {
    url.searchParams.set("infants_on_lap", String(infantsInLap));
  }
  url.searchParams.set("currency", "BRL");
  url.searchParams.set("hl", "pt");
  url.searchParams.set("gl", "br");
  url.searchParams.set("api_key", apiKey.trim());

  logger.info(
    "API",
    `🌐 [Requisição SerpApi] Consultando Google Flights API (${isRoundTrip ? "Ida e Volta" : "Somente Ida"}) para ${normOrigin} → ${normDestination} (${flightDate}${returnDate ? ` até ${returnDate}` : ""})`,
    {
      type: "HTTP_API_FETCH",
      engine: "google_flights",
      origin: normOrigin,
      destination: normDestination,
      flightDate,
      returnDate: returnDate || null,
      tripType: isRoundTrip ? "round_trip" : "one_way",
      adults,
      children,
      infantsInLap,
    }
  );

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timeout);
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new FlightTrackerError("Tempo limite esgotado ao consultar o Google Flights.", true);
    }
    throw new FlightTrackerError(`Falha de conexão com a API de voos: ${err.message}`, true);
  }

  if (response.status === 429) {
    throw new FlightTrackerError(
      "Limite de requisições ou cota mensal da SerpApi esgotada (HTTP 429).",
      true
    );
  }

  const data = await response.json().catch(() => null);
  if (!data) {
    throw new FlightTrackerError("Resposta inválida da API de voos.", true);
  }

  if (data.error) {
    const msg = String(data.error);
    if (msg.toLowerCase().includes("invalid api key") || response.status === 401) {
      throw new FlightTrackerError(`Chave SerpApi inválida: ${msg}`, false);
    }
    if (msg.toLowerCase().includes("out of searches") || msg.toLowerCase().includes("ran out")) {
      throw new FlightTrackerError(
        "Cota gratuita mensal da SerpApi esgotada (250 buscas/mês).",
        true
      );
    }
    throw new FlightTrackerError(`Erro retornado pelo Google Flights: ${msg}`, response.status >= 500);
  }

  const bestFlights = Array.isArray(data.best_flights) ? data.best_flights : [];
  const otherFlights = Array.isArray(data.other_flights) ? data.other_flights : [];
  const allFlights = [...bestFlights, ...otherFlights];

  const results: FlightOption[] = [];

  for (const item of allFlights) {
    let price: number;
    try {
      price = parseBrazilianPrice(item.price);
    } catch {
      continue;
    }

    const flights = Array.isArray(item.flights) ? item.flights : [];
    if (flights.length === 0) continue;

    const firstLeg = flights[0] || {};
    const lastLeg = flights[flights.length - 1] || {};

    let legOrigin = firstLeg.departure_airport?.id?.toUpperCase() || normOrigin;
    let legDestination = lastLeg.arrival_airport?.id?.toUpperCase() || normDestination;

    // Filtro STRICT para evitar que aeroportos próximos (nearby) distorçam a pesquisa
    if (legOrigin !== normOrigin || legDestination !== normDestination) {
      continue;
    }

    const airline =
      firstLeg.airline ||
      firstLeg.operating_carrier ||
      item.airline ||
      "Companhia Aérea";

    let flightNum = "";
    if (firstLeg.flight_number) {
      flightNum = String(firstLeg.flight_number).trim();
      const code = firstLeg.airline_code || "";
      if (code && !flightNum.startsWith(code)) {
        flightNum = `${code} ${flightNum}`;
      }
    }

    let departureTime = "";
    if (firstLeg.departure_airport?.time) {
      const ts = Number(firstLeg.departure_airport.time);
      if (!isNaN(ts) && ts > 0) {
        const d = new Date(ts * 1000);
        departureTime = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
    }

    let arrivalTime = "";
    if (lastLeg.arrival_airport?.time) {
      const ts = Number(lastLeg.arrival_airport.time);
      if (!isNaN(ts) && ts > 0) {
        const d = new Date(ts * 1000);
        arrivalTime = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      }
    }

    const totalDuration = item.total_duration || firstLeg.duration || null;
    const stops = Math.max(0, flights.length - 1);

    const unitPrice = price;
    const flightSearchUrl = getGoogleFlightsUrl(
      legOrigin,
      legDestination,
      flightDate,
      adults,
      returnDate,
      isRoundTrip ? "round_trip" : "one_way",
      children,
      infantsInLap
    );

    results.push({
      origin: legOrigin,
      destination: legDestination,
      flightDate,
      returnDate: isRoundTrip && returnDate ? returnDate : null,
      tripType: isRoundTrip ? "round_trip" : "one_way",
      passengers: adults,
      children,
      infantsInLap,
      price: unitPrice,
      currency: "BRL",
      airline,
      flightNumber: flightNum || undefined,
      departureTime: departureTime || undefined,
      arrivalTime: arrivalTime || undefined,
      durationMinutes: totalDuration ? Number(totalDuration) : undefined,
      stops,
      bookingLink: flightSearchUrl,
    });
  }

  // Remove duplicatas e ordena por menor preço
  const seen = new Set<string>();
  const uniqueResults: FlightOption[] = [];

  for (const r of results) {
    const key = `${r.price}-${r.airline}-${r.departureTime}-${r.stops}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueResults.push(r);
    }
  }

  uniqueResults.sort((a, b) => a.price - b.price);
  const finalTop = uniqueResults.slice(0, topN);

  logger.success(
    "API",
    `📦 [Retorno JSON SerpApi] ${finalTop.length} opções obtidas para ${normOrigin} → ${normDestination} (Menor: R$ ${finalTop[0]?.price.toFixed(2) || "0.00"})`,
    {
      totalFound: uniqueResults.length,
      bestOption: finalTop[0],
      allOptions: finalTop,
    }
  );

  return finalTop;
}

export const buscarVoosSerpApi = fetchSerpApiFlights;
