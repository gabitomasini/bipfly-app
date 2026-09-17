"use client";

import { AlertTriangle } from "lucide-react";
import { useModalBehavior } from "@/hooks/useModalBehavior";

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
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
  variant = "default",
}: ConfirmDialogProps) {
  const { overlayProps, containerRef } = useModalBehavior({
    isOpen,
    onClose: onCancel,
  });

  if (!isOpen) return null;

  const confirmBtnClass =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
      : "bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      {...overlayProps}
    >
      <div
        ref={containerRef}
        className="glass-panel w-full max-w-md bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          {variant === "danger" && (
            <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3
              id="confirm-dialog-title"
              className="text-base font-bold text-slate-900"
            >
              {title}
            </h3>
            <p className="text-xs text-slate-600 mt-1 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-sm font-bold shadow-xs transition-colors cursor-pointer ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
