"use client";

import { useTranslation } from "@/lib/i18n/context";
import { Globe } from "lucide-react";
import Tooltip from "./Tooltip";

interface LanguageSwitcherProps {
  variant?: "pill" | "select" | "compact";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "pill",
  className = "",
}: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();

  if (variant === "compact") {
    return (
      <Tooltip
        content={locale === "en" ? "Switch to Portuguese (BR)" : "Mudar para Inglês (US)"}
        position="bottom"
      >
        <button
          type="button"
          onClick={() => setLocale(locale === "en" ? "pt" : "en")}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs ${className}`}
          aria-label="Change language"
        >
          <Globe className="w-3.5 h-3.5 text-slate-400" />
          <span className="uppercase text-[11px] font-extrabold tracking-wider text-sky-700">
            {locale}
          </span>
        </button>
      </Tooltip>
    );
  }

  return (
    <div
      className={`flex items-center p-0.5 bg-slate-100/90 rounded-xl border border-slate-200/80 text-[11px] font-bold ${className}`}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer select-none flex items-center gap-1 ${
          locale === "en"
            ? "bg-white text-sky-700 shadow-2xs font-extrabold ring-1 ring-slate-900/5"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="English (US)"
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>

      <button
        type="button"
        onClick={() => setLocale("pt")}
        className={`px-2 py-1 rounded-lg transition-all cursor-pointer select-none flex items-center gap-1 ${
          locale === "pt"
            ? "bg-white text-emerald-700 shadow-2xs font-extrabold ring-1 ring-slate-900/5"
            : "text-slate-500 hover:text-slate-900"
        }`}
        title="Português (BR)"
      >
        <span>🇧🇷</span>
        <span>PT</span>
      </button>
    </div>
  );
}
