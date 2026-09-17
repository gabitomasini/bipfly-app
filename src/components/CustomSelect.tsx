"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  description?: string;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: CustomSelectOption<T>[];
  icon?: ReactNode;
  className?: string;
}

export default function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  icon,
  className = "",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
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

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 text-xs font-medium text-slate-800 shadow-xs transition-colors cursor-pointer select-none"
      >
        {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
        {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ml-0.5 ${
            isOpen ? "rotate-180 text-sky-600" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[180px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn p-1 text-xs">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                  <div className="truncate">
                    <div>{opt.label}</div>
                    {opt.description && (
                      <div className="text-[10px] text-slate-400 font-normal">{opt.description}</div>
                    )}
                  </div>
                </div>

                {isSelected && <Check className="w-3.5 h-3.5 text-sky-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
