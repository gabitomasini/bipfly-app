import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radar de Passagens | Monitor Inteligente de Voos",
  description:
    "Monitoramento automatizado de preços de passagens aéreas no Google Flights com histórico, gráficos interativos e alertas no celular.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.className} suppressHydrationWarning>
      <body
        className="antialiased min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-100 selection:text-sky-900"
        suppressHydrationWarning
      >
        <ToastProvider>
          {children}
          <BottomNav />
        </ToastProvider>
      </body>
    </html>
  );
}
