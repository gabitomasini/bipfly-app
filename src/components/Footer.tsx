"use client";

import { ExternalLink } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="fixed bottom-[52px] md:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 text-slate-600 transition-all select-none shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-8 sm:h-9 flex items-center justify-between text-[11px] sm:text-xs">
        {/* Lado Esquerdo: Copyright */}
        <div className="text-slate-400 font-medium truncate mr-2">
          © {currentYear} BipFly.<span className="hidden sm:inline"> {t.footer.allRightsReserved}</span>
        </div>

        {/* Lado Direito: Créditos Gabriela Tomasini */}
        <div className="flex items-center gap-1 shrink-0 font-medium">
          <span className="text-slate-500 hidden sm:inline">{t.footer.developedBy}</span>
          <a
            href="https://gabrielatomasini.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 sm:gap-1 font-bold text-slate-800 hover:text-sky-600 transition-colors group underline decoration-sky-400/40 hover:decoration-sky-600 underline-offset-2"
          >
            <span>Gabriela Tomasini</span>
            <span className="text-slate-400 group-hover:text-sky-600/80 font-normal hidden xs:inline">
              — gabrielatomasini.dev
            </span>
            <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-sky-600 transition-colors shrink-0 ml-0.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
