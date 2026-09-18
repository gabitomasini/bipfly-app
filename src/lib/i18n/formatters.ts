import { SupportedLocale } from "./dictionaries/types";

/**
 * Approximate BRL to USD exchange rate for estimated conversions (~5.55 BRL per USD)
 */
export const BRL_TO_USD_RATE = 0.18;
export const USD_TO_BRL_RATE = 1 / BRL_TO_USD_RATE;

/**
 * Calculates the estimated USD value from BRL amount
 */
export function convertBrlToUsd(amountInBrl: number): number {
  return amountInBrl * BRL_TO_USD_RATE;
}

/**
 * Calculates the estimated BRL value from USD amount
 */
export function convertUsdToBrl(amountInUsd: number): number {
  return amountInUsd * USD_TO_BRL_RATE;
}

/**
 * Formats estimated USD conversion (e.g. "~$441 USD" or "est. $441 USD")
 */
export function formatUsdEstimate(
  amountInBrl: number | null | undefined,
  prefix: string = "est. "
): string {
  if (amountInBrl === null || amountInBrl === undefined || isNaN(amountInBrl) || amountInBrl <= 0) {
    return "";
  }
  const usdAmount = convertBrlToUsd(amountInBrl);
  const formattedUsd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(usdAmount);

  return `${prefix}${formattedUsd} USD`;
}

/**
 * Formata um valor numérico para moeda de acordo com a moeda e o idioma
 */
export function formatCurrencyLocale(
  amount: number | null | undefined,
  currency: string = "BRL",
  locale: SupportedLocale = "en"
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return locale === "pt" ? "R$ —" : "R$ —";
  }

  const intlLocale = locale === "pt" ? "pt-BR" : "en-US";
  const currencyCode = currency.toUpperCase();

  try {
    return new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currencyCode === "USD" ? "$" : "R$";
    return `${symbol} ${amount.toFixed(2)}`;
  }
}

/**
 * Formata com valor em Real e conversão estimada em Dólar quando o idioma for Inglês
 * Ex: em PT -> "R$ 2.450,00"
 *     em EN -> "R$ 2,450.00 (~$441 USD)"
 */
export function formatCurrencyDual(
  amount: number | null | undefined,
  currency: string = "BRL",
  locale: SupportedLocale = "en"
): string {
  const base = formatCurrencyLocale(amount, currency, locale);
  if (locale === "en" && amount && amount > 0 && currency.toUpperCase() === "BRL") {
    const usd = formatUsdEstimate(amount, "~");
    return `${base} (${usd})`;
  }
  return base;
}

/**
 * Formata data no estilo da localidade (ex: "Oct 24, 2026" para en vs "24/10/2026" para pt)
 */
export function formatDateLocale(
  dateStr: string | Date | null | undefined,
  locale: SupportedLocale = "en"
): string {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`) : dateStr;
    if (isNaN(date.getTime())) return String(dateStr);

    if (locale === "pt") {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Formata data e hora completos (ex: "Oct 24, 2026, 3:30 PM" para en vs "24/10/2026 15:30" para pt)
 */
export function formatDateTimeLocale(
  dateStr: string | Date | null | undefined,
  locale: SupportedLocale = "en"
): string {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return String(dateStr);

    if (locale === "pt") {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr);
  }
}

/**
 * Formata tempo relativo (ex: "2 mins ago", "just now" para en vs "há 2 min", "agora mesmo" para pt)
 */
export function formatRelativeTimeLocale(
  dateStr: string | Date | null | undefined,
  locale: SupportedLocale = "en"
): string {
  if (!dateStr) return "—";
  try {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (locale === "pt") {
      if (diffSecs < 60) return "agora mesmo";
      if (diffMins < 60) return `há ${diffMins} min`;
      if (diffHours < 24) return `há ${diffHours}h`;
      if (diffDays === 1) return "ontem";
      if (diffDays < 7) return `há ${diffDays} dias`;
      return formatDateLocale(date, "pt");
    }

    // en-US
    if (diffSecs < 60) return "just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return formatDateLocale(date, "en");
  } catch {
    return String(dateStr);
  }
}
