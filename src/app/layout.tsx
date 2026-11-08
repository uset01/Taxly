import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "VazamentoZero — Suas finanças mais leves",
  description:
    "Identifique assinaturas esquecidas, cobranças recorrentes e economize todos os meses com segurança.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#F8F7F3] text-[#161A18] selection:bg-[#548771]/20 selection:text-[#161A18]">
        {children}
      </body>
    </html>
  );
}
