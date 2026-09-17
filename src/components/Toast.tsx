"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

const TOAST_CONFIG: Record<
  ToastType,
  {
    icon: typeof CheckCircle2;
    bg: string;
    border: string;
    text: string;
    iconColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    iconColor: "text-emerald-600",
  },
  error: {
    icon: AlertCircle,
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-900",
    iconColor: "text-rose-600",
  },
  info: {
    icon: Info,
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
    iconColor: "text-sky-600",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-900",
    iconColor: "text-amber-600",
  },
};

const AUTO_DISMISS_MS = 5000;

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const config = TOAST_CONFIG[toast.type];
  const IconComponent = config.icon;
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg max-w-sm transition-all duration-300 ${
        config.bg
      } ${config.border} ${config.text} ${
        isExiting
          ? "opacity-0 translate-x-4 scale-95"
          : "opacity-100 translate-x-0 scale-100 animate-fadeIn"
      }`}
      role="alert"
      aria-live="polite"
    >
      <IconComponent
        className={`w-4.5 h-4.5 ${config.iconColor} shrink-0 mt-0.5`}
      />
      <span className="text-xs font-semibold flex-1 leading-relaxed">
        {toast.message}
      </span>
      <button
        onClick={handleClose}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Fechar notificação"
      >
        <X className="w-3.5 h-3.5 opacity-60" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    portalRef.current = document.body;
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, createdAt: Date.now() }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastContainer =
    mounted && portalRef.current
      ? createPortal(
          <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2.5 pointer-events-auto">
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRemove={removeToast}
              />
            ))}
          </div>,
          portalRef.current
        )
      : null;

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toastContainer}
    </ToastContext.Provider>
  );
}
