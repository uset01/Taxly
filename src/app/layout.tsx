import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
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
      <body className="min-h-full bg-[#FAFAFA] text-[#1A1A1A] selection:bg-[#00C853]/20 selection:text-[#1A1A1A]">
        {children}
      </body>
    </html>
  );
}
