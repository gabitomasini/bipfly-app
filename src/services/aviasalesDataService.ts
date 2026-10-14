/**
 * Serviço de integração com a API de Dados Históricos e Calendário de Tarifas da Travelpayouts / Aviasales.
 * Fornece consultas em cache (Next.js ISR 3600s) para matriz de preços, calendário e tendências.
 */

export interface AviasalesPriceItem {
  price: number;
  airline?: string;
  flight_number?: number | string;
  departure_at?: string;
  return_at?: string;
  expires_at?: string;
  transfers?: number;
}

export interface AviasalesMatrixResponse {
  success: boolean;
  data: AviasalesPriceItem[];
  currency: string;
}

export interface CalendarPricePoint {
  departureDate: string; // YYYY-MM-DD
  returnDate?: string | null; // YYYY-MM-DD
  price: number;
  airline?: string;
  flightNumber?: string;
  stops?: number;
}

const DEFAULT_MARKER = "780599";
const API_BASE_URL = "https://api.travelpayouts.com";

/**
 * Adiciona o marcador de afiliado (marker) a URLs de parceiros e deep links da Aviasales/Travelpayouts
 */
export function attachAffiliateMarker(url: string, customMarker?: string): string {
  const marker = customMarker || process.env.TRAVELPAYOUTS_MARKER || DEFAULT_MARKER;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("marker", marker);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}marker=${marker}`;
  }
}

/**
 * Consulta a matriz de preços do mês via Travelpayouts Data API
 * Endpoint: /v2/prices/month-matrix
 */
export async function fetchMonthMatrixPrices(params: {
  origin: string;
  destination: string;
  month: string; // YYYY-MM
  currency?: string;
}): Promise<CalendarPricePoint[]> {
  const { origin, destination, month, currency = "BRL" } = params;
  const token = process.env.TRAVELPAYOUTS_API_TOKEN;

  if (!token) {
    return [];
  }

  try {
    const url = new URL(`${API_BASE_URL}/v2/prices/month-matrix`);
    url.searchParams.set("currency", currency.toLowerCase());
    url.searchParams.set("origin", origin.toUpperCase());
    url.searchParams.set("destination", destination.toUpperCase());
    url.searchParams.set("month", month);
    url.searchParams.set("show_to_affiliates", "true");

    const res = await fetch(url.toString(), {
      headers: {
        "x-access-token": token,
        Accept: "application/json",
      },
      next: { revalidate: 3600 }, // Cache Next.js por 1 hora
    });

    if (!res.ok) {
      console.warn(`[AVIASALES] Erro ${res.status} ao consultar month-matrix para ${origin}->${destination}`);
      return [];
    }

    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) {
      return [];
    }

    return json.data.map((item: any) => ({
      departureDate: item.depart_date || (item.departure_at ? item.departure_at.slice(0, 10) : ""),
      returnDate: item.return_date || (item.return_at ? item.return_at.slice(0, 10) : null),
      price: Number(item.value || item.price),
      airline: item.gate || item.airline || undefined,
      flightNumber: item.flight_number ? String(item.flight_number) : undefined,
      stops: typeof item.transfers === "number" ? item.transfers : undefined,
    })).filter((item: CalendarPricePoint) => Boolean(item.departureDate && !isNaN(item.price)));
  } catch (err: any) {
    console.warn(`[AVIASALES] Falha na requisição month-matrix: ${err.message}`);
    return [];
  }
}

/**
 * Consulta tarifas baratas no endpoint /v1/prices/cheap
 */
export async function fetchCheapPrices(params: {
  origin: string;
  destination: string;
  departureDate?: string; // YYYY-MM ou YYYY-MM-DD
  currency?: string;
}): Promise<CalendarPricePoint[]> {
  const { origin, destination, departureDate, currency = "BRL" } = params;
  const token = process.env.TRAVELPAYOUTS_API_TOKEN;

  if (!token) {
    return [];
  }

  try {
    const url = new URL(`${API_BASE_URL}/v1/prices/cheap`);
    url.searchParams.set("currency", currency.toLowerCase());
    url.searchParams.set("origin", origin.toUpperCase());
    url.searchParams.set("destination", destination.toUpperCase());
    if (departureDate) {
      url.searchParams.set("depart_date", departureDate);
    }

    const res = await fetch(url.toString(), {
      headers: {
        "x-access-token": token,
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    if (!json.success || !json.data || !json.data[destination.toUpperCase()]) {
      return [];
    }

    const destData = json.data[destination.toUpperCase()];
    const results: CalendarPricePoint[] = [];

    for (const key of Object.keys(destData)) {
      const item = destData[key];
      if (item && item.price) {
        results.push({
          departureDate: item.departure_at ? item.departure_at.slice(0, 10) : "",
          returnDate: item.return_at ? item.return_at.slice(0, 10) : null,
          price: Number(item.price),
          airline: item.airline || undefined,
          flightNumber: item.flight_number ? String(item.flight_number) : undefined,
          stops: typeof item.transfers === "number" ? item.transfers : undefined,
        });
      }
    }

    return results;
  } catch (err: any) {
    console.warn(`[AVIASALES] Falha na requisição cheap prices: ${err.message}`);
    return [];
  }
}
