import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatCurrencyLocale,
  formatCurrencyDual,
  formatUsdEstimate,
  BRL_TO_USD_RATE,
  formatDateLocale,
  formatDateTimeLocale,
  formatRelativeTimeLocale,
} from "./i18n/formatters";
import { SupportedLocale } from "./i18n/dictionaries/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export {
  formatCurrencyLocale,
  formatCurrencyDual,
  formatUsdEstimate,
  BRL_TO_USD_RATE,
  formatDateLocale,
  formatDateTimeLocale,
  formatRelativeTimeLocale,
};

export function formatCurrency(
  value?: number | null,
  currency: string = "BRL",
  locale: SupportedLocale = "en"
): string {
  return formatCurrencyLocale(value, currency, locale);
}

export function formatDateBR(dateStr?: string | null): string {
  return formatDateLocale(dateStr, "pt");
}

export function formatDateTimeBR(dateStr?: string | null): string {
  return formatDateTimeLocale(dateStr, "pt");
}

export function formatDuration(minutes?: number | null): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

import { getAirportByIata } from "./airports-data";

export function getAirportName(iata: string): string {
  const code = (iata || "").toUpperCase().trim();
  const airport = getAirportByIata(code);
  if (airport) {
    if (airport.isMetropolitan) {
      return `${airport.city} (${airport.name})`;
    }
    return airport.city !== airport.name ? `${airport.city} (${airport.name})` : airport.name;
  }
  return code;
}

export function getAirportCity(iata: string): string {
  const code = (iata || "").toUpperCase().trim();
  const airport = getAirportByIata(code);
  if (airport) {
    return airport.city;
  }
  return code;
}

export function getGoogleFlightsUrl(
  origin: string,
  destination: string,
  flightDate: string,
  passengers: number = 1,
  returnDate?: string | null,
  tripType?: "one_way" | "round_trip",
  children: number = 0,
  infantsInLap: number = 0
): string {
  const normOrigin = (origin || "").trim().toUpperCase();
  const normDestination = (destination || "").trim().toUpperCase();
  const totalPax = (passengers || 1) + (children || 0) + (infantsInLap || 0);
  const paxParam = totalPax > 1 ? `&passengers=${totalPax}` : "";
  const isRoundTrip = tripType === "round_trip" || (Boolean(returnDate) && tripType !== "one_way");

  if (isRoundTrip && returnDate) {
    return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(
      normDestination
    )}%20from%20${encodeURIComponent(normOrigin)}%20on%20${encodeURIComponent(
      flightDate
    )}%20through%20${encodeURIComponent(returnDate)}&curr=BRL&hl=pt-BR${paxParam}`;
  }

  return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(
    normDestination
  )}%20from%20${encodeURIComponent(normOrigin)}%20on%20${encodeURIComponent(
    flightDate
  )}%20oneway&curr=BRL&hl=pt-BR${paxParam}`;
}

export function formatRelativeTime(dateStr?: string | null, locale: SupportedLocale = "en"): string {
  return formatRelativeTimeLocale(dateStr, locale);
}
