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

  const textClass = isFading
    ? "text-[12.5px] font-normal text-[#858585] truncate transition-opacity duration-200 opacity-0"
    : "text-[12.5px] font-normal text-[#858585] truncate transition-opacity duration-200 opacity-100";

  return (
    <div
      aria-label="Prova social recente"
      className={`rounded-[12px] bg-[#F5F5F2] border border-[#EAEAE7] px-3.5 py-2.5 flex items-center justify-center gap-2 select-none overflow-hidden ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-[#08B968] shrink-0"
      />
      <p className={textClass}>{TESTIMONIALS[index]}</p>
    </div>
  );
}
