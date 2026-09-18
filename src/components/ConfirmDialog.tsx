"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { useModalBehavior } from "@/hooks/useModalBehavior";

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "danger" | "default";
}

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmIcon,
  icon,
  variant = "default",
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  const { overlayProps, containerRef } = useModalBehavior({
    isOpen,
    onClose: onCancel,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs hover:shadow-md"
      : "bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white shadow-xs hover:shadow-md";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      {...overlayProps}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-6 sm:p-7 text-left animate-fadeIn"
      >
        {/* Close Button Top Right */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header: Context Icon + Title & Description (Left-aligned) */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              variant === "danger"
                ? "bg-rose-50 border-rose-100 text-rose-600"
                : "bg-sky-50 border-sky-100 text-sky-600"
            }`}
          >
            {icon ? (
              icon
            ) : variant === "danger" ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <h3
              id="confirm-dialog-title"
              className="text-base sm:text-lg font-bold text-slate-900 leading-snug"
            >
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Footer Actions: Right-aligned */}
        <div className="flex items-center justify-end gap-3 pt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${confirmBtnClass}`}
          >
            {confirmIcon}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
