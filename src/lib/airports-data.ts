import rawAirports from "./airports.json";

export interface AirportInfo {
  iata: string;
  city: string;
  cityEn?: string;
  name: string;
  country: string;
  countryEn?: string;
  flag: string;
  isMetropolitan?: boolean;
  lat?: number;
  lon?: number;
}

export const AIRPORTS: AirportInfo[] = rawAirports as AirportInfo[];

// Fast O(1) map for IATA lookup
const AIRPORT_IATA_MAP = new Map<string, AirportInfo>();
for (const airport of AIRPORTS) {
  AIRPORT_IATA_MAP.set(airport.iata.toUpperCase(), airport);
}

export function getAirportByIata(iata?: string | null): AirportInfo | undefined {
  if (!iata) return undefined;
  return AIRPORT_IATA_MAP.get(iata.trim().toUpperCase());
}

/**
 * Remove acentos e caracteres especiais para busca normalizada
 */
function normalizeText(text?: string | null): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface IndexedAirport extends AirportInfo {
  normIata: string;
  normCity: string;
  normCityEn: string;
  normName: string;
  normCountry: string;
  normCountryEn: string;
}

// Pre-computado uma única vez para performance de microssegundos no autocomplete
const INDEXED_AIRPORTS: IndexedAirport[] = AIRPORTS.map((a) => ({
  ...a,
  normIata: a.iata.toLowerCase(),
  normCity: normalizeText(a.city),
  normCityEn: normalizeText(a.cityEn),
  normName: normalizeText(a.name),
  normCountry: normalizeText(a.country),
  normCountryEn: normalizeText(a.countryEn),
}));

// Atalhos rápidos comuns de digitação
const QUICK_SHORTCUTS: Record<string, string[]> = {
  sp: ["SAO", "GRU", "CGH", "VCP"],
  rj: ["RIO", "GIG", "SDU"],
  bh: ["BHZ", "CNF", "PLU"],
  bsb: ["BSB"],
  ny: ["NYC", "JFK", "EWR", "LGA"],
  nyc: ["NYC", "JFK", "EWR", "LGA"],
  lon: ["LON", "LHR", "LGW", "STN"],
  par: ["PAR", "CDG", "ORY"],
  rom: ["ROM", "FCO", "CIA"],
  mil: ["MIL", "MXP", "LIN", "BGY"],
  tyo: ["TYO", "HND", "NRT"],
  bue: ["BUE", "EZE", "AEP"],
  mia: ["MIA", "FLL"],
  mco: ["MCO"],
  orlando: ["MCO"],
};

/**
 * Busca preditiva instantânea de aeroportos globais (+7.900 aeroportos)
 * Suporta IATA, Cidade (PT/EN), Nome do Aeroporto e País.
 */
export function searchAirports(query: string, limit = 12): AirportInfo[] {
  if (!query || !query.trim()) {
    // Retorna os principais de padrão (Metropolitanos e grandes hubs)
    return AIRPORTS.slice(0, limit);
  }

  const cleanQuery = normalizeText(query);

  // 1. Atalhos rápidos de digitação (ex: "sp", "rj", "bh", "ny")
  if (QUICK_SHORTCUTS[cleanQuery]) {
    const matched = QUICK_SHORTCUTS[cleanQuery]
      .map((iata) => AIRPORT_IATA_MAP.get(iata))
      .filter((a): a is AirportInfo => Boolean(a));
    if (matched.length > 0) return matched.slice(0, limit);
  }

  // 2. Prioriza match exato de código IATA
  const exactIata = AIRPORT_IATA_MAP.get(cleanQuery.toUpperCase());
  if (exactIata) {
    const others = INDEXED_AIRPORTS.filter(
      (a) =>
        a.iata !== exactIata.iata &&
        (a.normCity.startsWith(cleanQuery) || a.normCityEn.startsWith(cleanQuery))
    );
    return [exactIata, ...others].slice(0, limit);
  }

  // 3. Busca em múltiplas dimensões com pontuação de relevância
  const directMatches: { airport: AirportInfo; score: number }[] = [];

  for (let i = 0; i < INDEXED_AIRPORTS.length; i++) {
    const a = INDEXED_AIRPORTS[i];
    let score = 0;

    if (a.normIata.startsWith(cleanQuery)) {
      score += 100;
    } else if (a.normCity.startsWith(cleanQuery) || a.normCityEn.startsWith(cleanQuery)) {
      score += 80;
    } else if (a.normCity.includes(cleanQuery) || a.normCityEn.includes(cleanQuery)) {
      score += 50;
    } else if (a.normName.includes(cleanQuery)) {
      score += 30;
    } else if (a.normCountry.includes(cleanQuery) || a.normCountryEn.includes(cleanQuery)) {
      score += 20;
    }

    if (score > 0) {
      if (a.isMetropolitan) score += 25;
      if (a.country === "Brasil") score += 10;
      directMatches.push({ airport: a, score });
    }
  }

  // Ordena por maior pontuação
  directMatches.sort((a, b) => b.score - a.score);

  return directMatches.slice(0, limit).map((m) => m.airport);
}
