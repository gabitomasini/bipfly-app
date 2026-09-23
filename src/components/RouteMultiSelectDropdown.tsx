"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Layers, Plane, CheckSquare, Square, Search } from "lucide-react";
import { MonitoredRoute } from "@/lib/types";
import { useTranslation } from "@/lib/i18n/context";
import { ROUTE_COLORS } from "./MultiRoutePriceChart";

interface RouteMultiSelectDropdownProps {
  routes: MonitoredRoute[];
  selectedIds: number[];
  onChange: (newSelectedIds: number[]) => void;
}

export default function RouteMultiSelectDropdown({
  routes,
  selectedIds,
  onChange,
}: RouteMultiSelectDropdownProps) {
  const { t, formatDate, formatCurrency, locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const allSelected = routes.length > 0 && selectedIds.length === routes.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < routes.length;

  const filteredRoutes = routes.filter((r) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.origin.toLowerCase().includes(term) ||
      r.destination.toLowerCase().includes(term) ||
      r.flightDate.toLowerCase().includes(term)
    );
  });

  const handleToggleAll = () => {
    if (allSelected) {
      // Se todos estiverem selecionados, desseleciona tudo (ou deixa o primeiro)
      onChange([]);
    } else {
      onChange(routes.map((r) => r.id));
    }
  };

  const handleToggleRoute = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Label do botão principal
  const getButtonLabel = () => {
    if (routes.length === 0) return locale === "en" ? "Loading routes..." : "Carregando rotas...";
    if (allSelected) return `${t.history.dropdownAllRoutes} (${routes.length})`;
    if (selectedIds.length === 0) return t.history.dropdownSelectRoutes;
    if (selectedIds.length === 1) {
      const r = routes.find((item) => item.id === selectedIds[0]);
      return r ? `${r.origin} → ${r.destination} (${formatDate(r.flightDate)})` : t.history.dropdownOneSelected;
    }
    return t.history.dropdownSelectedCount
      .replace("{selected}", String(selectedIds.length))
      .replace("{total}", String(routes.length));
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Botão Trigger Customizado */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs transition-all cursor-pointer min-w-[230px] justify-between"
      >
        <div className="flex items-center gap-2 truncate">
          <Layers className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="truncate font-semibold">{getButtonLabel()}</span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Popover Customizado */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn text-xs">
          {/* Header do Menu */}
          <div className="p-3 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex items-center gap-2 font-bold text-slate-800 hover:text-slate-950 cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allSelected
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : isIndeterminate
                    ? "bg-indigo-100 border-indigo-400 text-indigo-700"
                    : "border-slate-300 bg-white"
                }`}
              >
                {allSelected && <Check className="w-3 h-3 stroke-[3]" />}
                {isIndeterminate && <span className="w-2 h-0.5 bg-indigo-700 rounded-full" />}
              </div>
              <span>{t.history.dropdownSelectAll} ({routes.length})</span>
            </button>

            {selectedIds.length > 0 && selectedIds.length < routes.length && (
              <span className="text-[11px] font-semibold text-indigo-600">
                {selectedIds.length} {t.history.activeLabel}
              </span>
            )}
          </div>

          {/* Campo de Busca no Dropdown */}
          <div className="p-2 border-b border-slate-100 bg-white">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t.history.dropdownFilterPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Lista de Rotas com Checkboxes */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredRoutes.map((route, idx) => {
              const isChecked = selectedIds.includes(route.id);
              const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => handleToggleRoute(route.id)}
                  className={`w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors rounded-xl cursor-pointer ${
                    isChecked ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        isChecked
                          ? "bg-indigo-600 border-indigo-600 text-white"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span>{route.origin} → {route.destination}</span>
                        <span className="text-slate-400 font-normal text-[11px]">
                          ({formatDate(route.flightDate)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {t.history.dropdownTargetPrefix} {formatCurrency(route.targetPrice)}
                      </div>
                    </div>
                  </div>

                  {route.latestPrice !== null && route.latestPrice !== undefined && (
                    <span className="text-xs font-bold text-slate-700 shrink-0">
                      {formatCurrency(route.latestPrice)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer com Ações */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => onChange(routes.map((r) => r.id))}
              className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              {t.history.dropdownSelectAll}
            </button>
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-slate-500 hover:text-slate-700 font-medium cursor-pointer"
            >
              {t.history.dropdownDeselectAll}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
