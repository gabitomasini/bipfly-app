"use client";

import React, { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  error?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  error = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, char: string) => {
    if (disabled) return;
    const cleanChar = char.replace(/\D/g, "");
    if (!cleanChar) {
      // Clear current digit
      const newDigits = [...digits];
      newDigits[index] = "";
      const newValue = newDigits.join("");
      onChange(newValue);
      return;
    }

    const newChar = cleanChar[cleanChar.length - 1];
    const newDigits = [...digits];
    newDigits[index] = newChar;
    const newValue = newDigits.join("");
    onChange(newValue);

    if (index < length - 1 && newChar) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newValue.length === length) {
      onComplete?.(newValue);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    const targetIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[targetIndex]?.focus();

    if (pastedData.length === length) {
      onComplete?.(pastedData);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index] || ""}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl sm:text-2xl font-bold rounded-xl border-2 transition-all outline-none ${
            error
              ? "border-rose-400 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
              : digits[index]
              ? "border-sky-500 bg-sky-50/30 text-sky-950 shadow-xs focus:ring-4 focus:ring-sky-500/15"
              : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15"
          } disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
}
