import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value?: number | null, currency = "BRL"): string {
  if (value === undefined || value === null || isNaN(value)) return "R$ --";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency,
  }).format(value);
}

export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return "--/--/----";
  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeBR(dateStr?: string | null): string {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
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
  SAO: "São Paulo (Todos - GRU/CGH/VCP)",
  GRU: "São Paulo (Guarulhos)",
  CGH: "São Paulo (Congonhas)",
  VCP: "Campinas (Viracopos)",
  RIO: "Rio de Janeiro (Todos - GIG/SDU)",
  GIG: "Rio de Janeiro (Galeão)",
  SDU: "Rio de Janeiro (Santos Dumont)",
  BHZ: "Belo Horizonte (Todos)",
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
  NYC: "Nova York (Todos - JFK/EWR/LGA)",
  JFK: "Nova York (JFK)",
  EWR: "Nova York (Newark)",
  LGA: "Nova York (LaGuardia)",
  LIS: "Lisboa",
  OPO: "Porto",
  MAD: "Madrid",
  BCN: "Barcelona",
  PAR: "Paris (Todos - CDG/ORY)",
  CDG: "Paris (Charles de Gaulle)",
  ORY: "Paris (Orly)",
  ROM: "Roma (Todos - FCO/CIA)",
  FCO: "Roma (Fiumicino)",
  MIL: "Milão (Todos - MXP/LIN/BGY)",
  MXP: "Milão (Malpensa)",
  LON: "Londres (Todos - LHR/LGW/STN)",
  LHR: "Londres (Heathrow)",
  LGW: "Londres (Gatwick)",
  AMS: "Amsterdã",
  FRA: "Frankfurt",
  BUE: "Buenos Aires (Todos - EZE/AEP)",
  EZE: "Buenos Aires (Ezeiza)",
  AEP: "Buenos Aires (Aeroparque)",
  SCL: "Santiago",
  TYO: "Tóquio (Todos - HND/NRT)",
  HND: "Tóquio (Haneda)",
  NRT: "Tóquio (Narita)",
};

export function getAirportName(iata: string): string {
  const code = (iata || "").toUpperCase().trim();
  return AIRPORT_NAMES[code] || code;
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
  )}%20oneway&curr=BRL&hl=pt-BR${paxParam}`;
}
