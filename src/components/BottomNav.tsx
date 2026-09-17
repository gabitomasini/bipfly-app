"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plane, BarChart2, Terminal, Settings } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Início", icon: Compass },
    { href: "/rotas", label: "Rotas", icon: Plane },
    { href: "/historico", label: "Histórico", icon: BarChart2 },
    { href: "/logs", label: "Logs", icon: Terminal },
    { href: "/configuracoes", label: "Ajustes", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 py-1.5 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all select-none ${
                isActive
                  ? "text-sky-600 font-bold bg-sky-50"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-sky-600" : "text-slate-400"}`} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
