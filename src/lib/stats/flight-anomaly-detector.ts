import { DealLevel, FlightPriceRecord, PriceAnalysisResult } from "../types";

/**
 * Módulo de Análise Estatística e Detecção de Anomalias de Preços (Promoções)
 * Funções puras e seguras para execução tanto no Servidor quanto no Cliente (Browser).
 */

export interface CalculateStatsInput {
  prices: number[];
  currentPrice: number;
}

export interface StatsCalculation {
  sampleSize: number;
  mean: number;
  stdDev: number;
  zScore: number;
  discountPercent: number;
}

/**
 * Calcula a média amostral e desvio padrão amostral com correção de Bessel (N - 1)
 */
export function calculateSampleStatistics(prices: number[]): {
  sampleSize: number;
  mean: number;
  stdDev: number;
} {
  const n = prices.length;
  if (n === 0) {
    return { sampleSize: 0, mean: 0, stdDev: 0 };
  }

  const sum = prices.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  if (n === 1) {
    return { sampleSize: 1, mean, stdDev: 0 };
  }

  const varianceSum = prices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
  const sampleVariance = varianceSum / (n - 1);
  const stdDev = Math.sqrt(sampleVariance);

  return {
    sampleSize: n,
    mean,
    stdDev,
  };
}

/**
 * Calcula o Z-Score de uma nova cotação em relação a uma média e desvio padrão
 */
export function calculateZScore(currentPrice: number, mean: number, stdDev: number): number {
  if (stdDev === 0) {
    if (currentPrice < mean) return -999; // Preço caiu abaixo de um histórico constante
    if (currentPrice > mean) return 999;
    return 0;
  }
  return (currentPrice - mean) / stdDev;
}

/**
 * Arredonda um número para 2 casas decimais
 */
export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Analisa o preço atual de uma rota contra os registros históricos.
 * 
 * Thresholds:
 * - zScore <= -2.0 -> IMPERDIVEL (isDeal = true)
 * - zScore <= -1.5 -> OPORTUNIDADE (isDeal = true)
 * - outros         -> NORMAL (isDeal = false)
 */
export function analyzeFlightPrice(
  origin: string,
  destination: string,
  departureDate: string,
  currentPrice: number,
  historyPrices: (FlightPriceRecord | { lowestPrice?: number; menor_preco?: number; price?: number } | number)[] = []
): PriceAnalysisResult {
  const MIN_SAMPLE_SIZE = 5;

  const prices: number[] = historyPrices.map((item) => {
    if (typeof item === "number") return item;
    if ("lowestPrice" in item && typeof item.lowestPrice === "number") return item.lowestPrice;
    if ("price" in item && typeof item.price === "number") return item.price;
    if ("menor_preco" in item && typeof item.menor_preco === "number") return item.menor_preco;
    return 0;
  }).filter((p) => p > 0);

  const sampleSize = prices.length;

  // Se houver menos de 5 registros, amostra insuficiente para inferência estatística
  if (sampleSize < MIN_SAMPLE_SIZE) {
    return {
      sampleSize,
      mean: sampleSize > 0 ? round2(prices.reduce((a, b) => a + b, 0) / sampleSize) : null,
      stdDev: null,
      zScore: null,
      dealLevel: "NORMAL",
      isDeal: false,
      discountPercent: null,
      message: `Amostra insuficiente (${sampleSize}/${MIN_SAMPLE_SIZE} registros nos últimos 30 dias). Status padrão NORMAL.`,
    };
  }

  const { mean, stdDev } = calculateSampleStatistics(prices);
  const rawZScore = calculateZScore(currentPrice, mean, stdDev);
  const discountPercent = mean > 0 ? ((mean - currentPrice) / mean) * 100 : 0;

  let dealLevel: DealLevel = "NORMAL";
  let isDeal = false;

  if (rawZScore <= -2.0) {
    dealLevel = "IMPERDIVEL";
    isDeal = true;
  } else if (rawZScore <= -1.5) {
    dealLevel = "OPORTUNIDADE";
    isDeal = true;
  }

  const roundedMean = round2(mean);
  const roundedStdDev = round2(stdDev);
  const roundedZScore = round2(rawZScore);
  const roundedDiscount = round2(discountPercent);

  let message = `Preço atual R$ ${currentPrice.toFixed(2)} está dentro da faixa de flutuação normal (Média: R$ ${roundedMean.toFixed(2)}).`;

  if (dealLevel === "IMPERDIVEL") {
    message = `🔥 Anomalia de Preço IMPERDÍVEL! Z-Score de ${roundedZScore} (${Math.abs(roundedZScore)} desvios abaixo da média). Desconto estimado de ${roundedDiscount}%.`;
  } else if (dealLevel === "OPORTUNIDADE") {
    message = `✨ OPORTUNIDADE detectada! Z-Score de ${roundedZScore} (${Math.abs(roundedZScore)} desvios abaixo da média). Desconto estimado de ${roundedDiscount}%.`;
  }

  return {
    sampleSize,
    mean: roundedMean,
    stdDev: roundedStdDev,
    zScore: roundedZScore,
    dealLevel,
    isDeal,
    discountPercent: roundedDiscount,
    message,
  };
}
