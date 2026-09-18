"use client";

import { Plane } from "lucide-react";

interface AirlineBadgeProps {
  airline?: string | null;
  className?: string;
  size?: "sm" | "md";
}

interface AirlineConfig {
  name: string;
  shortCode: string;
  badgeBg: string;
  textColor: string;
  accentBg: string;
}

const KNOWN_AIRLINES: Record<string, AirlineConfig> = {
  LATAM: {
    name: "LATAM",
    shortCode: "LA",
    badgeBg: "bg-rose-50 border-rose-200/80",
    textColor: "text-rose-700",
    accentBg: "bg-rose-600 text-white",
  },
  GOL: {
    name: "GOL",
    shortCode: "G3",
    badgeBg: "bg-orange-50 border-orange-200/80",
    textColor: "text-orange-700",
    accentBg: "bg-orange-500 text-white",
  },
  AZUL: {
    name: "Azul",
    shortCode: "AD",
    badgeBg: "bg-sky-50 border-sky-200/80",
    textColor: "text-sky-700",
    accentBg: "bg-sky-600 text-white",
  },
  TAP: {
    name: "TAP Air Portugal",
    shortCode: "TP",
    badgeBg: "bg-emerald-50 border-emerald-200/80",
    textColor: "text-emerald-800",
    accentBg: "bg-emerald-600 text-white",
  },
  "AIR FRANCE": {
    name: "Air France",
    shortCode: "AF",
    badgeBg: "bg-blue-50 border-blue-200/80",
    textColor: "text-blue-800",
    accentBg: "bg-blue-600 text-white",
  },
  AMERICAN: {
    name: "American Airlines",
    shortCode: "AA",
    badgeBg: "bg-indigo-50 border-indigo-200/80",
    textColor: "text-indigo-800",
    accentBg: "bg-indigo-600 text-white",
  },
  UNITED: {
    name: "United Airlines",
    shortCode: "UA",
    badgeBg: "bg-blue-50 border-blue-200/80",
    textColor: "text-blue-900",
    accentBg: "bg-blue-700 text-white",
  },
  DELTA: {
    name: "Delta Air Lines",
    shortCode: "DL",
    badgeBg: "bg-red-50 border-red-200/80",
    textColor: "text-red-800",
    accentBg: "bg-red-600 text-white",
  },
  COPA: {
    name: "Copa Airlines",
    shortCode: "CM",
    badgeBg: "bg-sky-50 border-sky-200/80",
    textColor: "text-sky-900",
    accentBg: "bg-sky-700 text-white",
  },
  IBERIA: {
    name: "Iberia",
    shortCode: "IB",
    badgeBg: "bg-amber-50 border-amber-200/80",
    textColor: "text-amber-800",
    accentBg: "bg-amber-600 text-white",
  },
  AVIANCA: {
    name: "Avianca",
    shortCode: "AV",
    badgeBg: "bg-rose-50 border-rose-200/80",
    textColor: "text-rose-800",
    accentBg: "bg-rose-600 text-white",
  },
  KLM: {
    name: "KLM",
    shortCode: "KL",
    badgeBg: "bg-cyan-50 border-cyan-200/80",
    textColor: "text-cyan-800",
    accentBg: "bg-cyan-600 text-white",
  },
  LUFTHANSA: {
    name: "Lufthansa",
    shortCode: "LH",
    badgeBg: "bg-amber-50 border-amber-200/80",
    textColor: "text-amber-900",
    accentBg: "bg-amber-700 text-white",
  },
  "BRITISH AIRWAYS": {
    name: "British Airways",
    shortCode: "BA",
    badgeBg: "bg-blue-50 border-blue-200/80",
    textColor: "text-blue-900",
    accentBg: "bg-blue-800 text-white",
  },
  "VIRGIN": {
    name: "Virgin Atlantic",
    shortCode: "VS",
    badgeBg: "bg-red-50 border-red-200/80",
    textColor: "text-red-800",
    accentBg: "bg-red-600 text-white",
  },
  "NORSE": {
    name: "Norse Atlantic",
    shortCode: "N0",
    badgeBg: "bg-cyan-50 border-cyan-200/80",
    textColor: "text-cyan-900",
    accentBg: "bg-cyan-700 text-white",
  },
  "JETBLUE": {
    name: "JetBlue",
    shortCode: "B6",
    badgeBg: "bg-blue-50 border-blue-200/80",
    textColor: "text-blue-700",
    accentBg: "bg-blue-600 text-white",
  },
  "AIR EUROPA": {
    name: "Air Europa",
    shortCode: "UX",
    badgeBg: "bg-sky-50 border-sky-200/80",
    textColor: "text-sky-800",
    accentBg: "bg-sky-600 text-white",
  },
  "ITA": {
    name: "ITA Airways",
    shortCode: "AZ",
    badgeBg: "bg-blue-50 border-blue-200/80",
    textColor: "text-blue-800",
    accentBg: "bg-blue-600 text-white",
  },
  "SWISS": {
    name: "SWISS",
    shortCode: "LX",
    badgeBg: "bg-red-50 border-red-200/80",
    textColor: "text-red-800",
    accentBg: "bg-red-600 text-white",
  },
  "TURKISH": {
    name: "Turkish Airlines",
    shortCode: "TK",
    badgeBg: "bg-red-50 border-red-200/80",
    textColor: "text-red-900",
    accentBg: "bg-red-700 text-white",
  },
  "AER LINGUS": {
    name: "Aer Lingus",
    shortCode: "EI",
    badgeBg: "bg-emerald-50 border-emerald-200/80",
    textColor: "text-emerald-900",
    accentBg: "bg-emerald-700 text-white",
  },
  "ICELANDAIR": {
    name: "Icelandair",
    shortCode: "FI",
    badgeBg: "bg-indigo-50 border-indigo-200/80",
    textColor: "text-indigo-900",
    accentBg: "bg-indigo-700 text-white",
  },
  EMIRATES: {
    name: "Emirates",
    shortCode: "EK",
    badgeBg: "bg-red-50 border-red-200/80",
    textColor: "text-red-900",
    accentBg: "bg-red-700 text-white",
  },
  QATAR: {
    name: "Qatar Airways",
    shortCode: "QR",
    badgeBg: "bg-purple-50 border-purple-200/80",
    textColor: "text-purple-800",
    accentBg: "bg-purple-700 text-white",
  },
};

function resolveAirline(nameStr?: string | null): AirlineConfig {
  if (!nameStr || !nameStr.trim()) {
    return {
      name: "Não identificada",
      shortCode: "—",
      badgeBg: "bg-slate-100 border-slate-200",
      textColor: "text-slate-500",
      accentBg: "bg-slate-300 text-slate-700",
    };
  }

  const clean = nameStr.trim().toUpperCase();

  for (const [key, cfg] of Object.entries(KNOWN_AIRLINES)) {
    if (clean.includes(key)) {
      return {
        ...cfg,
        name: nameStr.trim(), // preserve specific text if desired
      };
    }
  }

  // Generic fallback with initials
  const initials = clean
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return {
    name: nameStr.trim(),
    shortCode: initials || "CIA",
    badgeBg: "bg-slate-50 border-slate-200",
    textColor: "text-slate-700",
    accentBg: "bg-slate-200 text-slate-700",
  };
}

import Tooltip from "./Tooltip";

export default function AirlineBadge({ airline, className = "", size = "md" }: AirlineBadgeProps) {
  if (!airline) {
    return <span className="text-slate-400 text-xs">—</span>;
  }

  const config = resolveAirline(airline);

  if (size === "sm") {
    return (
      <Tooltip content={config.name}>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${config.badgeBg} ${config.textColor} ${className}`}
        >
          <span
            className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${config.accentBg}`}
          >
            {config.shortCode}
          </span>
          <span className="truncate max-w-[110px]">{config.name}</span>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip content={config.name}>
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${config.badgeBg} ${config.textColor} shadow-2xs ${className}`}
      >
        <span
          className={`w-4.5 h-4.5 rounded-sm text-[10px] font-black flex items-center justify-center shrink-0 shadow-2xs ${config.accentBg}`}
        >
          {config.shortCode}
        </span>
        <span className="truncate max-w-[130px]">{config.name}</span>
      </span>
    </Tooltip>
  );
}
