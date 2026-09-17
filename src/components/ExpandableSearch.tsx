"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface ExpandableSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export default function ExpandableSearch({
  value,
  onChange,
  placeholder = "Buscar...",
  className = "",
}: ExpandableSearchProps) {
  const [isOpen, setIsOpen] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setIsOpen(true);
    }
  }, [value]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        !value
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, value]);

  const handleToggle = () => {
    if (isOpen && !value) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClear();
    }
  };

  return (
    <div ref={containerRef} className={`relative flex items-center ${className}`}>
      {!isOpen ? (
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center justify-center w-8.5 h-8.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 text-slate-500 hover:text-slate-900 transition-all cursor-pointer shadow-2xs"
          title="Buscar"
          aria-label="Abrir campo de busca"
        >
          <Search className="w-4 h-4" />
        </button>
      ) : (
        <div className="relative flex items-center animate-fadeIn">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-44 sm:w-52 pl-8 pr-7 py-1.5 text-xs font-medium rounded-xl border border-sky-400 bg-white shadow-2xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900 placeholder-slate-400 transition-all"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            title="Fechar busca"
            aria-label="Fechar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
