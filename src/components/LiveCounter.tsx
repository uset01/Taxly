"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/data/charges";

interface LiveCounterProps {
  initialValue?: number;
  className?: string;
}

/**
 * Contador animado de valor recuperado por usuários Taxly este mês.
 * Exibido em um retângulo com cantos arredondados (design system taxly) com os números e a frase em verde.
 */
export function LiveCounter({
  initialValue = 1842300,
  className = "",
}: LiveCounterProps) {
  const [totalRecovered, setTotalRecovered] = useState(initialValue);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Incremento dinâmico aleatório de R$ 30 a R$ 120
      const randomIncrement = Math.floor(Math.random() * 90) + 30;
      setTotalRecovered((prev) => prev + randomIncrement);
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 450);
      return () => clearTimeout(timer);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full min-h-[44px] rounded-[16px] bg-[#FAFAFA] dark:bg-[#1E1E20] border border-[#EAEAEA] dark:border-[#2C2C2E] px-2.5 sm:px-4 py-2.5 flex items-center justify-center text-center select-none whitespace-nowrap shadow-none ${className}`}
    >
      <p className="text-[11px] min-[350px]:text-[11.5px] min-[380px]:text-[12px] min-[410px]:text-[13px] font-semibold text-[#00A844] dark:text-[#22C55E] tracking-tight leading-none whitespace-nowrap">
        <span
          className={`font-bold tabular-nums transition-transform duration-200 inline-block mr-1.5 ${
            isPulsing ? "scale-105" : ""
          }`}
        >
          R$ {formatBRL(totalRecovered)}
        </span>
        recuperados por usuários taxly este mês
      </p>
    </div>
  );
}

