"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Settings, Plane, ChevronDown, LogIn, LogOut, Sparkles, BarChart2, Terminal } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import { useAuth } from "@/lib/auth/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Logo from "@/components/Logo";

interface NavbarProps {
  onSearchTriggered?: () => void;
}

export default function Navbar({ onSearchTriggered }: NavbarProps) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const { user, logout, openAuthModal } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    }
    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const navLinks = [
    { href: "/", label: t.nav.dashboard, icon: Sparkles },
    { href: "/routes", label: t.nav.routes, icon: Plane },
    { href: "/history", label: t.nav.history, icon: BarChart2 },
    { href: "/settings", label: t.nav.settings, icon: Settings },
    ...(user?.isAdmin ? [{ href: "/logs", label: t.nav.logs, icon: Terminal }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Slogan (Anchored Left Width) */}
          <div className="w-56 sm:w-64 shrink-0 flex items-center">
            <Link
              href="/"
              className="flex flex-col items-start group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl py-0.5 pr-2"
              aria-label="BipFly Home"
            >
              <Logo
                variant="full"
                textColor="#0f172a"
                className="h-7 sm:h-7.5 w-auto group-hover:scale-[1.01] transition-transform origin-left"
              />
              <span className="text-[10px] sm:text-[10.5px] font-semibold text-slate-500 tracking-tight group-hover:text-slate-700 transition-colors mt-0.5 leading-none pl-0.5 whitespace-nowrap">
                {t.nav.subtitle}
              </span>
            </Link>
          </div>

          {/* Center Navigation Links (Fixed equal-width item tabs for zero language shift) */}
          <nav className="hidden md:flex items-center justify-center gap-1 sm:gap-2 h-full">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                link.href === "/"
                  ? pathname === "/" || pathname === "/dashboard"
                  : pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group relative flex items-center justify-center gap-2 h-16 w-26 sm:w-28 text-[13px] font-medium transition-colors select-none ${
                    isActive
                      ? "text-slate-900 font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive
                        ? "text-sky-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{link.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-sky-600 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Language Switcher + User Profile Dropdown (Anchored Right Width) */}
          <div className="w-56 sm:w-64 shrink-0 flex items-center justify-end gap-3">
            <LanguageSwitcher />

            {/* User Profile / Auth */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-100 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-cyan-500 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs">
                    {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                  </div>
                  <span className="hidden sm:inline max-w-[120px] truncate text-slate-800 font-semibold">
                    {user.name || user.email.split("@")[0]}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                      isUserMenuOpen ? "rotate-180 text-slate-600" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.name || (locale === "en" ? "My Account" : "Minha Conta")}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/routes"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <Plane className="w-4 h-4 text-slate-400" />
                        <span>{t.nav.routes}</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        <Settings className="w-4 h-4 text-slate-400" />
                        <span>{t.nav.settings}</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50/80 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>{t.auth.logout}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal({ mode: "login" })}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-600" />
                <span>{t.auth.login}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
