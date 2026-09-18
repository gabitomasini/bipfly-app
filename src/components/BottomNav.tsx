"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Plane, BarChart2, Terminal, Settings } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = [
    { href: "/", label: t.nav.dashboard, icon: Sparkles },
    { href: "/routes", label: t.nav.routes, icon: Plane },
    { href: "/history", label: t.nav.history, icon: BarChart2 },
    { href: "/logs", label: t.nav.logs, icon: Terminal },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all select-none ${
                isActive
                  ? "text-sky-600 font-bold bg-sky-50"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 mb-0.5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
