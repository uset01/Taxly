"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/data/charges";

interface LiveCounterProps {
  initialValue?: number;
  className?: string;
}

/**
 * Contador animado de valor recuperado por usuários Taxly este mês.
 * Incrementa periodicamente (~1.5s) com fonte média e tom verde.
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C853]/10 border border-[#00C853]/25 select-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="w-2 h-2 rounded-full bg-[#00C853] shrink-0 animate-ping"
      />
      <p className="text-[12.5px] sm:text-[13px] font-medium text-[#008A39] dark:text-[#22C55E] tracking-tight leading-none">
        <span
          className={`font-semibold tabular-nums transition-transform duration-200 inline-block ${
            isPulsing ? "scale-105 text-[#00A844]" : ""
          }`}
        >
          R$ {formatBRL(totalRecovered)}
        </span>{" "}
        recuperados por usuários taxly este mês
      </p>
    </div>
  );
}

