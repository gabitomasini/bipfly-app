"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { SupportedLocale, TranslationDictionary } from "./dictionaries/types";
import { en } from "./dictionaries/en";
import { pt } from "./dictionaries/pt";
import {
  formatCurrencyLocale,
  formatCurrencyDual,
  formatUsdEstimate,
  formatDateLocale,
  formatDateTimeLocale,
  formatRelativeTimeLocale,
} from "./formatters";

const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  en,
  pt,
};

const STORAGE_KEY = "radar_passagens_locale";

interface LanguageContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  toggleLocale: () => void;
  t: TranslationDictionary;
  formatCurrency: (amount: number | null | undefined, currency?: string) => string;
  formatCurrencyDual: (amount: number | null | undefined, currency?: string) => string;
  formatUsdEstimate: (amountInBrl: number | null | undefined, prefix?: string) => string;
  formatDate: (dateStr: string | Date | null | undefined) => string;
  formatDateTime: (dateStr: string | Date | null | undefined) => string;
  formatRelativeTime: (dateStr: string | Date | null | undefined) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to American English
  const [locale, setLocaleState] = useState<SupportedLocale>("en");

  // Sync with localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale;
      if (saved === "en" || saved === "pt") {
        setLocaleState(saved);
      }
    } catch {}
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale === "pt" ? "pt-BR" : "en";
    } catch {}
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "pt" : "en");
  }, [locale, setLocale]);

  const dictionary = dictionaries[locale] || en;

  const formatCurrency = useCallback(
    (amount: number | null | undefined, currency: string = "BRL") =>
      formatCurrencyLocale(amount, currency, locale),
    [locale]
  );

  const formatCurrencyDualCb = useCallback(
    (amount: number | null | undefined, currency: string = "BRL") =>
      formatCurrencyDual(amount, currency, locale),
    [locale]
  );

  const formatUsdEstimateCb = useCallback(
    (amountInBrl: number | null | undefined, prefix: string = "est. ") =>
      formatUsdEstimate(amountInBrl, prefix),
    []
  );

  const formatDate = useCallback(
    (dateStr: string | Date | null | undefined) =>
      formatDateLocale(dateStr, locale),
    [locale]
  );

  const formatDateTime = useCallback(
    (dateStr: string | Date | null | undefined) =>
      formatDateTimeLocale(dateStr, locale),
    [locale]
  );

  const formatRelativeTime = useCallback(
    (dateStr: string | Date | null | undefined) =>
      formatRelativeTimeLocale(dateStr, locale),
    [locale]
  );

  return (
    <LanguageContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        t: dictionary,
        formatCurrency,
        formatCurrencyDual: formatCurrencyDualCb,
        formatUsdEstimate: formatUsdEstimateCb,
        formatDate,
        formatDateTime,
        formatRelativeTime,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider (e.g. static/test)
    return {
      locale: "en",
      setLocale: () => {},
      toggleLocale: () => {},
      t: en,
      formatCurrency: (amount, currency = "BRL") =>
        formatCurrencyLocale(amount, currency, "en"),
      formatCurrencyDual: (amount, currency = "BRL") =>
        formatCurrencyDual(amount, currency, "en"),
      formatUsdEstimate: (amountInBrl, prefix = "est. ") =>
        formatUsdEstimate(amountInBrl, prefix),
      formatDate: (dateStr) => formatDateLocale(dateStr, "en"),
      formatDateTime: (dateStr) => formatDateTimeLocale(dateStr, "en"),
      formatRelativeTime: (dateStr) => formatRelativeTimeLocale(dateStr, "en"),
    };
  }
  return context;
}
