"use client";

import { useState, useRef, useEffect } from "react";
import { Plane, Check, ChevronDown, X, Sparkles } from "lucide-react";
import { AirportInfo, searchAirports, AIRPORTS } from "@/lib/airports-data";
import Tooltip from "./Tooltip";
import { useTranslation } from "@/lib/i18n/context";

interface AirportComboboxProps {
  label: string;
  value: string; // IATA code (ex: "SAO", "GRU")
  onChange: (iata: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function AirportCombobox({
  label,
  value,
  onChange,
  placeholder,
  autoFocus = false,
}: AirportComboboxProps) {
  const { t, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const defaultPlaceholder =
    placeholder ||
    (locale === "en"
      ? "City or IATA (e.g. JFK, Miami, London, GRU)"
      : "Digite a cidade ou IATA (ex: SP, SAO, Roma, MIA)");

  // Encontra o aeroporto atualmente selecionado
  const selectedAirport = AIRPORTS.find(
    (a) => a.iata.toUpperCase() === value?.toUpperCase()
  );

  // Resultados de busca filtrados
  const filteredAirports = searchAirports(query, 10);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (airport: AirportInfo) => {
    onChange(airport.iata);
    setQuery("");
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (!isOpen) setIsOpen(true);

    if (val.trim().length === 3 && /^[a-zA-Z]{3}$/.test(val.trim())) {
      onChange(val.trim().toUpperCase());
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative space-y-1.5" ref={containerRef}>
      <label className="block text-xs font-bold text-slate-700">
        {label}
      </label>

      {/* Input de Seleção */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className={`w-full min-h-[44px] px-3 py-2 bg-slate-50 border rounded-xl flex items-center justify-between gap-2 cursor-text transition-all ${
          isOpen
            ? "border-sky-500 bg-white ring-2 ring-sky-100 shadow-xs"
            : "border-slate-300 hover:border-slate-400 bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <Plane className="w-4 h-4 text-slate-400 shrink-0" />

          {isOpen ? (
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder={selectedAirport ? `${selectedAirport.city} (${selectedAirport.iata})` : defaultPlaceholder}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder:text-slate-400"
              autoFocus={autoFocus}
            />
          ) : selectedAirport ? (
            <div className="flex items-center gap-2 truncate">
              <span className="text-base leading-none">{selectedAirport.flag}</span>
              <span
                className={`text-xs font-black font-mono px-1.5 py-0.5 rounded ${
                  selectedAirport.isMetropolitan
                    ? "bg-indigo-100 text-indigo-800"
                    : "bg-sky-100 text-sky-800"
                }`}
              >
                {selectedAirport.iata}
              </span>
              <span className="text-xs font-bold text-slate-800 truncate">
                {selectedAirport.city}
              </span>
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                - {selectedAirport.name}
              </span>
            </div>
          ) : value ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 font-mono bg-slate-200 px-1.5 py-0.5 rounded">
                {value.toUpperCase()}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {locale === "en" ? "Custom Airport Code" : "Código Personalizado"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium truncate">
              {defaultPlaceholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {(value || query) && (
            <Tooltip content={locale === "en" ? "Clear" : "Limpar"}>
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-sky-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Menu Suspenso de Sugestões */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn">
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredAirports.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-slate-500 font-medium text-xs mb-1">
                  {locale === "en"
                    ? `No airports found for "${query}".`
                    : `Nenhum aeroporto encontrado para "${query}".`}
                </p>
                {query.trim().length === 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(query.trim().toUpperCase());
                      setIsOpen(false);
                    }}
                    className="mt-2 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 font-bold border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    {locale === "en" ? "Use custom IATA code:" : "Usar código IATA personalizado:"}{" "}
                    <strong>{query.trim().toUpperCase()}</strong>
                  </button>
                )}
              </div>
            ) : (
              filteredAirports.map((airport) => {
                const isSelected = airport.iata === value?.toUpperCase();
                return (
                  <button
                    key={airport.iata}
                    type="button"
                    onClick={() => handleSelect(airport)}
                    className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-sky-50/70 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-sky-50 text-sky-900 font-bold"
                        : airport.isMetropolitan
                        ? "bg-indigo-50/30 hover:bg-indigo-50/70"
                        : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg leading-none">{airport.flag}</span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900">{airport.city}</span>
                          <span className="text-[11px] text-slate-500 font-normal">({airport.country})</span>
                          {airport.isMetropolitan && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                              {locale === "en" ? "All Airports (Metro)" : "Todos os Aeroportos"}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-medium">
                          {airport.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded-md border ${
                          airport.isMetropolitan
                            ? "bg-indigo-50 text-indigo-900 border-indigo-200"
                            : "bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        {airport.iata}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
