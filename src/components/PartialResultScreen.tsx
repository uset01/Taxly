"use client";

import { CheckIcon, LockIcon } from "@/components/icons";
import { formatBRL } from "@/data/charges";
import { useCountUp } from "@/lib/use-count-up";
import { SocialProofTicker } from "@/components/SocialProofTicker";
import { AuditLevelBar } from "@/components/AuditLevelBar";

interface PartialResultScreenProps {
  onUnlock: () => void;
  onContinueFree: () => void;
}

const LOCKED_ITEMS = [
  {
    id: "locked-1",
    blurredPreview: "Clube de Benefícios — R$ 13,00",
  },
  {
    id: "locked-2",
    blurredPreview: "Tarifa de Proteção — R$ 10,00",
  },
];

/**
 * Tela 1 — Resultado parcial exibida após o primeiro upload gratuito.
 */
export function PartialResultScreen({
  onUnlock,
  onContinueFree,
}: PartialResultScreenProps) {
  const animatedFoundTotal = useCountUp(37.9, true, 1000);

  return (
    <>
      <section
        aria-label="Resultado parcial da análise"
        style={{ paddingBottom: "7rem" }}
        className="pt-1 text-left pb-28"
      >
        {/* Header: Badge vermelho + Frase com volume e valor */}
        <header>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] px-3 py-1">
            <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#F87171]">
              ⚠️ 1 transação suspeita detectada
            </span>
          </div>

          <p className="mt-3 text-[18px] sm:text-[20px] leading-tight font-bold text-[#1A1A1A] dark:text-white">
            Analisamos 19 transações. Identificamos 1 possível cobrança indevida de{" "}
            <span className="text-[#DC2626] dark:text-[#EF4444] font-extrabold tabular-nums">
              R$ {formatBRL(animatedFoundTotal)}
            </span>.
          </p>
        </header>

        {/* Bloco de itens (1 visível + 2 em efeito com bloqueio preto) */}
        <div className="mt-5 rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4 sm:p-5">
          <h2 className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white">
            O que encontramos:
          </h2>

          <ul className="mt-3 space-y-2.5" aria-label="Itens encontrados na fatura">
            {/* Item visível */}
            <li className="rounded-[14px] bg-white dark:bg-[#111111] border border-[#E5E7EB] dark:border-[#2A2A2A] px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-5 h-5 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center shrink-0"
                >
                  <CheckIcon className="w-3 h-3" />
                </span>
                <span className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white leading-snug">
                  Cobrança duplicada — R$ 14,90
                </span>
              </div>
            </li>

            {/* Itens bloqueados */}
            {LOCKED_ITEMS.map((item) => (
              <li key={item.id}>
                <div className="w-full rounded-[14px] bg-white/75 dark:bg-[#111111]/75 backdrop-blur-md border border-[#EAEAEA] dark:border-[#2A2A2A] px-4 py-3 flex items-center justify-between gap-3 text-left">
                  <span className="text-[13.5px] text-[#8E8E93] select-none filter blur-[3px]">
                    {item.blurredPreview}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1A1A1A] dark:text-white bg-[#F5F5F5] dark:bg-[#2A2A2A] px-2 py-0.5 rounded-full shrink-0">
                    <LockIcon className="w-3 h-3 text-[#00C853]" />
                    <span>Bloqueado</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {/* Bloqueio preto com texto exato da tarefa */}
          <div className="mt-4 rounded-[12px] bg-[#1A1A1A] p-3 text-center text-white text-[12.5px] font-semibold leading-snug shadow-sm">
            O relatório completo com a explicação e o passo a passo de recuperação está bloqueado.
          </div>
        </div>

        {/* Barra de Progressão de Níveis (Task 4) */}
        <AuditLevelBar
          currentLevel={1}
          isSubscribed={false}
          className="mt-5"
        />

        {/* Faixa Rotativa de Prova Social (Task 2) */}
        <div className="mt-4">
          <SocialProofTicker />
        </div>
      </section>

      {/* Barra fixa de conversão no rodapé com CTA (Task 3) */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[430px] px-6 pt-3 pb-2 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-sm border-t border-[#F0F0F0] dark:border-[#262626]">
        <button
          type="button"
          onClick={onUnlock}
          className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
        >
          <span>Recuperar meus R$ {formatBRL(animatedFoundTotal)} agora</span>
        </button>
        <p className="mt-1.5 text-center text-[11.5px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">
          Acesso imediato · R$ 29,90/mês · Cancele quando quiser
        </p>

        <div className="mt-2.5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onContinueFree}
            className="text-[13px] font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#1A1A1A] dark:hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Analisar Fatura Completa ou Extrato
          </button>
        </div>
      </div>
    </>
  );
}
