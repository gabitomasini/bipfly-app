"use client";

import { useState, useRef, useEffect } from "react";
import { History, ChevronDown, Sparkles, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface ImportHistoryDropdownProps {
  onImport: (days: number) => void;
  isLoading?: boolean;
  variant?: "primary" | "subtle";
  align?: "left" | "right";
  buttonText?: string;
  disabled?: boolean;
}

export default function ImportHistoryDropdown({
  onImport,
  isLoading = false,
  variant = "primary",
  align = "right",
  buttonText,
  disabled = false,
}: ImportHistoryDropdownProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (days: number) => {
    setIsOpen(false);
    onImport(days);
  };

  const options = [
    {
      days: 30,
      label: t.history.import30d,
      sublabel: locale === "en" ? "Fastest • Last 1 month" : "Mais rápido • Último 1 mês",
      badge: "30d",
    },
    {
      days: 60,
      label: t.history.import60d,
      sublabel: locale === "en" ? "Recommended • Last 2 months" : "Recomendado • Últimos 2 meses",
      badge: "60d",
      recommended: true,
    },
    {
      days: 120,
      label: t.history.import120d,
      sublabel: locale === "en" ? "Deep history • Last 4 months" : "Histórico amplo • Últimos 4 meses",
      badge: "120d",
    },
  ];

  const buttonLabel = buttonText || (isLoading ? t.history.importing : t.history.importHistory);

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Botão Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={disabled || isLoading}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 select-none ${
          variant === "primary"
            ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            : "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 shadow-2xs"
        }`}
      >
        <History className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        <span>{buttonLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-75 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div
          className={`absolute mt-1.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fadeIn ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-3.5 py-2 border-b border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {t.history.importDesc}
            </span>
          </div>

          <div className="p-1 space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => handleSelect(opt.days)}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-900 flex items-center justify-between transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                    {opt.recommended ? (
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <Calendar className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 flex items-center gap-1.5">
                      <span>{opt.label}</span>
                      {opt.recommended && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-tighter">
                          {locale === "en" ? "Best" : "Ideal"}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 group-hover:text-slate-500 font-medium block">
                      {opt.sublabel}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-indigo-200/60 group-hover:text-indigo-800 transition-colors">
                  {opt.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
