"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useTranslation } from "@/lib/i18n/context";
import { useToast } from "@/components/Toast";

interface ScanningContextType {
  isScanning: boolean;
  activeRouteId: number | null;
  activeRouteLabel: string | null;
  customTitle: string | null;
  elapsedSeconds: number;
  isCompleted: boolean;
  scanAllRoutes: () => Promise<boolean>;
  scanSingleRoute: (routeId: number, routeLabel?: string) => Promise<boolean>;
  startCustomScan: (title: string, label: string, routeId?: number) => void;
  endCustomScan: (success?: boolean) => void;
  registerRefreshCallback: (cb: () => void) => () => void;
}

const ScanningContext = createContext<ScanningContextType | null>(null);

export function useScanning(): ScanningContextType {
  const ctx = useContext(ScanningContext);
  if (!ctx) {
    throw new Error("useScanning must be used within a ScanningProvider");
  }
  return ctx;
}

export function ScanningProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [isScanning, setIsScanning] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<number | null>(null);
  const [activeRouteLabel, setActiveRouteLabel] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState<string | null>(null);
  const [scanStartTime, setScanStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const refreshCallbacksRef = useRef<Set<() => void>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const registerRefreshCallback = useCallback((cb: () => void) => {
    refreshCallbacksRef.current.add(cb);
    return () => {
      refreshCallbacksRef.current.delete(cb);
    };
  }, []);

  const triggerRefreshCallbacks = useCallback(() => {
    refreshCallbacksRef.current.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("Error running refresh callback:", err);
      }
    });
  }, []);

  // Timer for elapsed seconds while scanning
  useEffect(() => {
    if (isScanning) {
      setIsCompleted(false);
      setElapsedSeconds(0);
      const start = Date.now();
      setScanStartTime(start);

      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isScanning]);

  const scanAllRoutes = useCallback(async (): Promise<boolean> => {
    if (isScanning) return false;

    setIsScanning(true);
    setActiveRouteId(null);
    setActiveRouteLabel(t.scanning.allRoutes);
    addToast(`${t.toasts.searchStarted} ${t.toasts.searchStartedDesc}`, "info");

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        addToast(
          `${t.toasts.searchStarted} ${t.toasts.searchStartedDesc}`,
          "success"
        );
        setIsCompleted(true);
        triggerRefreshCallbacks();

        if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
        completionTimerRef.current = setTimeout(() => {
          setIsCompleted(false);
        }, 4000);

        return true;
      } else {
        addToast(data.error || t.toasts.searchFailed, "error");
        return false;
      }
    } catch {
      addToast(t.toasts.connError, "error");
      return false;
    } finally {
      setIsScanning(false);
      setActiveRouteId(null);
      setActiveRouteLabel(null);
    }
  }, [isScanning, t, addToast, triggerRefreshCallbacks]);

  const scanSingleRoute = useCallback(
    async (routeId: number, routeLabel?: string): Promise<boolean> => {
      if (isScanning) return false;

      setIsScanning(true);
      setActiveRouteId(routeId);
      setActiveRouteLabel(routeLabel || `#${routeId}`);
      addToast(
        `${t.toasts.searchStarted} ${routeLabel ? `(${routeLabel})` : ""}`,
        "info"
      );

      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routeId }),
        });
        const data = await res.json();

        if (data.success) {
          addToast(t.toasts.routeUpdated, "success");
          setIsCompleted(true);
          triggerRefreshCallbacks();

          if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
          completionTimerRef.current = setTimeout(() => {
            setIsCompleted(false);
          }, 4000);

          return true;
        } else {
          const errorMsg =
            data.error ||
            (data.data && data.data.error) ||
            t.toasts.searchFailed;
          addToast(errorMsg, "warning");
          triggerRefreshCallbacks();
          return false;
        }
      } catch {
        addToast(t.toasts.connError, "error");
        return false;
      } finally {
        setIsScanning(false);
        setActiveRouteId(null);
        setActiveRouteLabel(null);
      }
    },
    [isScanning, t, addToast, triggerRefreshCallbacks]
  );

  const startCustomScan = useCallback((title: string, label: string, routeId?: number) => {
    setIsScanning(true);
    setCustomTitle(title);
    setActiveRouteLabel(label);
    if (routeId) setActiveRouteId(routeId);
    setIsCompleted(false);
  }, []);

  const endCustomScan = useCallback((success = true) => {
    setIsScanning(false);
    setCustomTitle(null);
    setActiveRouteId(null);
    setActiveRouteLabel(null);

    if (success) {
      setIsCompleted(true);
      triggerRefreshCallbacks();
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      completionTimerRef.current = setTimeout(() => {
        setIsCompleted(false);
      }, 4000);
    }
  }, [triggerRefreshCallbacks]);

  return (
    <ScanningContext.Provider
      value={{
        isScanning,
        activeRouteId,
        activeRouteLabel,
        customTitle,
        elapsedSeconds,
        isCompleted,
        scanAllRoutes,
        scanSingleRoute,
        startCustomScan,
        endCustomScan,
        registerRefreshCallback,
      }}
    >
      {children}
    </ScanningContext.Provider>
  );
}
