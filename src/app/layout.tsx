import type { Metadata } from "next";
import { Noto_Serif, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
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
    <html
      lang="pt-BR"
      className={`${notoSerif.variable} ${sourceSerif4.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-[#111111] overflow-x-hidden selection:bg-[#22C55E]/20 selection:text-[#111111]">
        {children}
      </body>
    </html>
  );
}
