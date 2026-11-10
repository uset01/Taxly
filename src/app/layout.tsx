import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VazamentoZero — Possível economia e cobranças para revisar",
  description:
    "Analise faturas com dados mascarados, identifique cobranças para revisar e descubra sua possível economia mensal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-white text-[#111111] overflow-x-hidden selection:bg-[#22C55E]/20 selection:text-[#111111]">
        {children}
      </body>
    </html>
  );
}
