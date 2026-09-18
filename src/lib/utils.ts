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

export const AIRPORT_NAMES: Record<string, string> = {
  SAO: "São Paulo (All - GRU/CGH/VCP)",
  GRU: "São Paulo (Guarulhos)",
  CGH: "São Paulo (Congonhas)",
  VCP: "Campinas (Viracopos)",
  RIO: "Rio de Janeiro (All - GIG/SDU)",
  GIG: "Rio de Janeiro (Galeão)",
  SDU: "Rio de Janeiro (Santos Dumont)",
  BHZ: "Belo Horizonte (All)",
  CNF: "Belo Horizonte (Confins)",
  BSB: "Brasília",
  SSA: "Salvador",
  REC: "Recife",
  FOR: "Fortaleza",
  POA: "Porto Alegre",
  CWB: "Curitiba",
  FLN: "Florianópolis",
  MAO: "Manaus",
  BEL: "Belém",
  MIA: "Miami",
  MCO: "Orlando",
  NYC: "New York (All - JFK/EWR/LGA)",
  JFK: "New York (JFK)",
  EWR: "New York (Newark)",
  LGA: "New York (LaGuardia)",
  LIS: "Lisbon",
  OPO: "Porto",
  MAD: "Madrid",
  BCN: "Barcelona",
  PAR: "Paris (All - CDG/ORY)",
  CDG: "Paris (Charles de Gaulle)",
  ORY: "Paris (Orly)",
  ROM: "Rome (All - FCO/CIA)",
  FCO: "Rome (Fiumicino)",
  MIL: "Milan (All - MXP/LIN/BGY)",
  MXP: "Milan (Malpensa)",
  LON: "London (All - LHR/LGW/STN)",
  LHR: "London (Heathrow)",
  LGW: "London (Gatwick)",
  AMS: "Amsterdam",
  FRA: "Frankfurt",
  BUE: "Buenos Aires (All - EZE/AEP)",
  EZE: "Buenos Aires (Ezeiza)",
  AEP: "Buenos Aires (Aeroparque)",
  SCL: "Santiago",
  TYO: "Tokyo (All - HND/NRT)",
  HND: "Tokyo (Haneda)",
  NRT: "Tokyo (Narita)",
};

export function getAirportName(iata: string): string {
  const code = (iata || "").toUpperCase().trim();
  return AIRPORT_NAMES[code] || code;
}

export function getAirportCity(iata: string): string {
  const full = getAirportName(iata);
  const city = full.split("(")[0].trim();
  return city || (iata || "").toUpperCase().trim();
}

export function getGoogleFlightsUrl(
  origin: string,
  destination: string,
  flightDate: string,
  passengers: number = 1
): string {
  const normOrigin = (origin || "").trim().toUpperCase();
  const normDestination = (destination || "").trim().toUpperCase();
  const paxParam = passengers > 1 ? `&passengers=${passengers}` : "";
  return `https://www.google.com/travel/flights?q=Flights%20to%20${encodeURIComponent(
    normDestination
  )}%20from%20${encodeURIComponent(normOrigin)}%20on%20${encodeURIComponent(
    flightDate
  )}%20oneway&curr=BRL&hl=en${paxParam}`;
}

export function formatRelativeTime(dateStr?: string | null, locale: SupportedLocale = "en"): string {
  return formatRelativeTimeLocale(dateStr, locale);
}
