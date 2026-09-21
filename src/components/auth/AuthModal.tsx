"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, User as UserIcon, ArrowRight, CheckCircle, RefreshCw, KeyRound, AlertCircle, Plane } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/lib/i18n/context";
import Logo from "@/components/Logo";
import OtpInput from "./OtpInput";

export default function AuthModal() {
  const { isAuthModalOpen, authModalOptions, closeAuthModal, refreshUser } = useAuth();
  const { addToast } = useToast();
  const { t, locale } = useTranslation();

  const mode = authModalOptions.mode || "login";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isAuthModalOpen) {
      setEmail(authModalOptions.initialEmail || "");
      setName(authModalOptions.initialName || "");
      setOtpCode("");
      setStep("form");
      setErrorMessage(null);
      setResendCooldown(0);
    }
  }, [isAuthModalOpen, authModalOptions]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!isAuthModalOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage(t.auth.errorEmailInvalid);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name: name.trim() || undefined, locale }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || t.auth.errorEmailInvalid);
        return;
      }

      setStep("otp");
      setResendCooldown(60);
      addToast(t.auth.otpSentToast, "info");
    } catch {
      setErrorMessage(t.toasts.connError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (!code || code.length !== 6) {
      setErrorMessage(t.auth.errorOtpLength);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || t.auth.errorOtpLength);
        return;
      }

      await refreshUser();
      addToast(t.auth.loginSuccessToast, "success");
      authModalOptions.onSuccess?.(data.user);
      closeAuthModal();
    } catch {
      setErrorMessage(t.toasts.connError);
    } finally {
      setLoading(false);
    }
  };

  const handleProgressiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage(t.auth.errorEmailInvalid);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (authModalOptions.routeDataToSave) {
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...authModalOptions.routeDataToSave,
            email: email.trim().toLowerCase(),
            name: name.trim() || undefined,
            locale,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMessage(data.error || t.toasts.connError);
          return;
        }

        await refreshUser();
        addToast(t.auth.routeCreatedSuccessToast, "success");
        authModalOptions.onSuccess?.(data.user);
        closeAuthModal();
      } else {
        await handleSendOtp();
      }
    } catch {
      setErrorMessage(t.toasts.connError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 shadow-sm">
              <Logo variant="icon" className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {mode === "progressive"
                  ? t.auth.modalProgressiveTitle
                  : step === "form"
                  ? t.auth.modalLoginTitle
                  : t.auth.modalOtpTitle}
              </h3>
              <p className="text-xs text-slate-600">
                {mode === "progressive"
                  ? t.auth.modalProgressiveSubtitle
                  : step === "form"
                  ? t.auth.modalLoginSubtitle
                  : `${t.auth.modalOtpSubtitle} ${email}`}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6">
          {mode === "progressive" ? (
            /* Progressive Profiling Form */
            <form onSubmit={handleProgressiveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.auth.nameLabel} <span className="text-slate-400 font-normal">{t.auth.nameOptional}</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={t.auth.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.auth.emailAlertsLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  {t.auth.emailAlertsHint}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.auth.activatingButton}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.auth.activateButton}</span>
                  </>
                )}
              </button>
            </form>
          ) : step === "form" ? (
            /* Recurring Login: Step 1 (Enter Email) */
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.auth.emailRegisteredLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder={t.auth.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-600">
                  {t.auth.emailOtpHint}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.auth.sendingOtpButton}</span>
                  </>
                ) : (
                  <>
                    <span>{t.auth.sendOtpButton}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Recurring Login: Step 2 (Enter OTP) */
            <div className="space-y-5">
              <div className="py-2">
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  onComplete={(code) => handleVerifyOtp(code)}
                  disabled={loading}
                  autoFocus={true}
                  error={Boolean(errorMessage)}
                />
              </div>

              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={loading || otpCode.length !== 6}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.auth.verifyingButton}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>{t.auth.verifyButton}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="text-slate-600 hover:text-slate-800 font-medium"
                >
                  {t.auth.changeEmail}
                </button>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || loading}
                  onClick={() => handleSendOtp()}
                  className="text-sky-600 hover:text-sky-700 font-semibold disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? t.auth.resendIn.replace("{seconds}", String(resendCooldown))
                    : t.auth.resendCode}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
