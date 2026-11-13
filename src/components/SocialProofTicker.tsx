"use client";

import { useEffect, useState } from "react";

interface SocialProofTickerProps {
  className?: string;
  intervalMs?: number;
}

const TESTIMONIALS = [
  "Mariana S. recuperou R$ 212 do Netflix duplicado",
  "Carlos M. encontrou 3 tarifas indevidas do Itaú",
  "Felipe R. estornou R$ 149 de taxa de manutenção",
  "Beatriz A. cancelou assinatura de R$ 89 que não usava",
  "Rodrigo T. descobriu 2 cobranças duplicadas de R$ 64",
  "Camila P. recuperou R$ 380 em anuidade cobrada sem aviso",
];

/**
 * Faixa rotativa de prova social que troca a cada 3 segundos.
 * Exibe apenas nome abreviado e inicial, sem foto.
 */
export function SocialProofTicker({
  className = "",
  intervalMs = 3000,
}: SocialProofTickerProps) {
  const [index, setIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
        setIsFading(false);
      }, 250);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <div
      aria-label="Prova social recente"
      className={`rounded-[12px] bg-[#F5F5F5] dark:bg-[#1C1C1E] border border-[#EAEAEA] dark:border-[#2C2C2E] px-3.5 py-2 flex items-center justify-center gap-2 select-none overflow-hidden ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-[#00C853] shrink-0"
      />
      <p
        className={`text-[12.5px] sm:text-[13px] text-[#4B5563] dark:text-[#A1A1AA] font-medium truncate transition-opacity duration-300 ${
          isFading ? "opacity-0 -translate-y-1" : "opacity-100 translate-y-0"
        }`}
      >
        {TESTIMONIALS[index]}
      </p>
    </div>
  );
}
