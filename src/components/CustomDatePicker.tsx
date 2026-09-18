"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface CustomDatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  placeholder?: string;
  accentColor?: "sky" | "indigo";
  align?: "left" | "right";
  required?: boolean;
  className?: string;
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
  accentColor = "sky",
  align = "left",
  required = false,
  className = "",
}: CustomDatePickerProps) {
  const { locale } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view date
  const selectedDateObj = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedDateObj) return selectedDateObj.getFullYear();
    if (minDate) {
      const [y] = minDate.split("-").map(Number);
      if (y) return y;
    }
    return new Date().getFullYear();
  });

  const [viewMonth, setViewMonth] = useState<number>(() => {
    if (selectedDateObj) return selectedDateObj.getMonth();
    if (minDate) {
      const [, m] = minDate.split("-").map(Number);
      if (m !== undefined) return m - 1;
    }
    return new Date().getMonth();
  });

  // Keep view aligned when value changes from external presets
  useEffect(() => {
    if (selectedDateObj) {
      setViewYear(selectedDateObj.getFullYear());
      setViewMonth(selectedDateObj.getMonth());
    }
  }, [selectedDateObj]);

  // Click outside and escape handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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

  const monthNamesPT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const monthNamesEN = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const weekDaysPT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekDaysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const currentMonthName = (locale === "en" ? monthNamesEN : monthNamesPT)[viewMonth];
  const weekDays = locale === "en" ? weekDaysEN : weekDaysPT;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Format value for display on trigger button
  const displayLabel = useMemo(() => {
    if (!selectedDateObj) return placeholder || (locale === "en" ? "Select date" : "Selecione a data");
    const d = selectedDateObj.getDate().toString().padStart(2, "0");
    const mShort = (locale === "en" ? monthNamesEN : monthNamesPT)[selectedDateObj.getMonth()].slice(0, 3);
    const y = selectedDateObj.getFullYear();
    const dayOfWeek = weekDays[selectedDateObj.getDay()];

    if (locale === "en") {
      return `${mShort} ${d}, ${y} (${dayOfWeek})`;
    }
    return `${d} de ${mShort}, ${y} (${dayOfWeek})`;
  }, [selectedDateObj, locale, placeholder]);

  // Generate calendar days grid
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayStr = new Date().toISOString().split("T")[0];

    const days: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dStr = `${prevYear}-${(prevMonth + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;

      const isDisabled = (minDate ? dStr < minDate : false) || (maxDate ? dStr > maxDate : false);

      days.push({
        dayNumber: dayNum,
        dateStr: dStr,
        isCurrentMonth: false,
        isDisabled,
        isToday: dStr === todayStr,
        isSelected: dStr === value,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const dStr = `${viewYear}-${(viewMonth + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
      const isDisabled = (minDate ? dStr < minDate : false) || (maxDate ? dStr > maxDate : false);

      days.push({
        dayNumber: i,
        dateStr: dStr,
        isCurrentMonth: true,
        isDisabled,
        isToday: dStr === todayStr,
        isSelected: dStr === value,
      });
    }

    // Next month filler days (fill up to complete weeks, e.g. 35 or 42 cells)
    const remainingCells = 42 - days.length;
    if (remainingCells < 7) {
      for (let i = 1; i <= remainingCells; i++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
        const dStr = `${nextYear}-${(nextMonth + 1).toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}`;
        const isDisabled = (minDate ? dStr < minDate : false) || (maxDate ? dStr > maxDate : false);

        days.push({
          dayNumber: i,
          dateStr: dStr,
          isCurrentMonth: false,
          isDisabled,
          isToday: dStr === todayStr,
          isSelected: dStr === value,
        });
      }
    }

    return days;
  }, [viewYear, viewMonth, minDate, maxDate, value]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const isSky = accentColor === "sky";

  return (
    <div className={`relative ${isOpen ? "z-50" : "z-10"} ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          isOpen
            ? isSky
              ? "bg-white border-sky-500 ring-2 ring-sky-500/20 text-slate-900 shadow-sm"
              : "bg-white border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 shadow-sm"
            : "bg-slate-50 hover:bg-white border-slate-300 hover:border-slate-400 text-slate-900"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon
            className={`w-4 h-4 shrink-0 transition-colors ${
              isOpen
                ? isSky
                  ? "text-sky-600"
                  : "text-indigo-600"
                : "text-slate-500"
            }`}
          />
          <span className={`truncate ${!value ? "text-slate-400 font-normal" : "text-slate-900 font-bold"}`}>
            {displayLabel}
          </span>
        </div>

        {value && !required && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title={locale === "en" ? "Clear date" : "Limpar data"}
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Floating Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1.5 w-[285px] sm:w-[300px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3.5 animate-fadeIn select-none`}
          role="dialog"
          aria-modal="true"
        >
          {/* Header: Month & Year + Prev/Next Controls */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-900">
                {currentMonthName}
              </span>
              <span className="font-black text-sm text-slate-400 font-mono">
                {viewYear}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label={locale === "en" ? "Previous month" : "Mês anterior"}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label={locale === "en" ? "Next month" : "Próximo mês"}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDays.map((d, idx) => (
              <span
                key={idx}
                className="text-[10px] font-bold text-slate-400 py-0.5"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth && cell.isDisabled) {
                return (
                  <div
                    key={idx}
                    className="h-7.5 flex items-center justify-center text-[10px] text-slate-200"
                  >
                    {cell.dayNumber}
                  </div>
                );
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => handleSelectDate(cell.dateStr)}
                  className={`h-7.5 w-full rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer relative ${
                    cell.isSelected
                      ? isSky
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-indigo-600 text-white shadow-xs"
                      : cell.isDisabled
                      ? "text-slate-300 cursor-not-allowed opacity-30"
                      : !cell.isCurrentMonth
                      ? "text-slate-400 hover:bg-slate-100/60"
                      : "text-slate-800 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                >
                  <span>{cell.dayNumber}</span>
                  {cell.isToday && !cell.isSelected && (
                    <span
                      className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                        isSky ? "bg-sky-600" : "bg-indigo-600"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={() => {
                const todayStr = new Date().toISOString().split("T")[0];
                if (!minDate || todayStr >= minDate) {
                  handleSelectDate(todayStr);
                }
              }}
              className="font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {locale === "en" ? "Today" : "Hoje"}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="font-bold text-slate-400 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {locale === "en" ? "Close" : "Fechar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
