import type { Metadata } from "next";
import Script from "next/script";
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
  title: "BipFly",
  description:
    "Monitoramento automatizado de preços no Google Flights com alertas em tempo real, inteligência tarifária e histórico de preços.",
  icons: {
    icon: "/bipfly-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <Script
          id="travelpayouts-drive"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function () {
    var script = document.createElement("script");
    script.async = 1;
    script.setAttribute("data-cmp-ab","2");
    script.src = 'https://emrldco.com/NTc2Nzc0.js?t=576774';
    document.head.appendChild(script);
})();`,
          }}
        />
      </head>
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
