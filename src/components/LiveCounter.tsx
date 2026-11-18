"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/data/charges";

interface LiveCounterProps {
  initialValue?: number;
  className?: string;
}

/**
 * Contador animado de valor recuperado por usuários Taxly este mês.
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

  const amountClass = isPulsing
    ? "font-semibold tabular-nums transition-transform duration-200 inline-block mr-1 scale-[1.03]"
    : "font-semibold tabular-nums transition-transform duration-200 inline-block mr-1";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-white border border-black/[0.06] select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full bg-[#0F9D58] shrink-0"
      />
      <p className="text-[11px] sm:text-xs leading-tight text-center font-medium text-[#087D4A] dark:text-[#08B968]">
        <span className={amountClass}>R$ {formatBRL(totalRecovered)}</span>
        recuperados por usuários taxly
      </p>
    </div>
  );
}
