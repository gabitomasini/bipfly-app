import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";
import { LanguageProvider } from "@/lib/i18n/context";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ScanningProvider } from "@/context/ScanningContext";
import AuthModal from "@/components/auth/AuthModal";
import ScanningIndicator from "@/components/ScanningIndicator";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flight Radar | Intelligent Airfare Deal Tracker",
  description:
    "Automated flight price tracking across Google Flights with real-time alerts, interactive charts, and historical fare intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-100 selection:text-sky-900"
        suppressHydrationWarning
      >
        <LanguageProvider>
          <AuthProvider>
            <ToastProvider>
              <ScanningProvider>
                {children}
                <AuthModal />
                <ScanningIndicator />
                <BottomNav />
              </ScanningProvider>
            </ToastProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
