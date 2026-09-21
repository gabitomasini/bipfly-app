"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Plane, BarChart2, Terminal, Settings } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { user } = useAuth();

  const navItems = [
    { href: "/", label: t.nav.dashboard, icon: Sparkles },
    { href: "/routes", label: t.nav.routes, icon: Plane },
    { href: "/history", label: t.nav.history, icon: BarChart2 },
    ...(user?.isAdmin !== false ? [{ href: "/logs", label: t.nav.logs, icon: Terminal }] : []),
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  const colCount = navItems.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 pt-1.5"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}
    >
      <div className={`grid items-center w-full max-w-md mx-auto gap-1 ${colCount === 4 ? "grid-cols-4" : "grid-cols-5"}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all select-none min-w-0 ${
                isActive
                  ? "text-sky-600 font-bold bg-sky-50"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <Icon
                className={`w-4.5 h-4.5 mb-0.5 shrink-0 ${
                  isActive ? "text-sky-600 stroke-[2.5]" : "text-slate-400"
                }`}
              />
              <span className="text-[10px] leading-tight truncate w-full text-center tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
