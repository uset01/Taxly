"use client";

import { CheckIcon, LockIcon } from "@/components/icons";
import { formatBRL } from "@/data/charges";
import { useCountUp } from "@/lib/use-count-up";

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
        style={{ paddingBottom: "130px" }}
        className="pt-1 text-left"
      >
        {/* Header: Selo pequeno + Valor grande com count-up + Subtítulo */}
        <header>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] px-3 py-1">
            <span
              aria-hidden="true"
              className="w-4 h-4 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center shrink-0"
            >
              <CheckIcon className="w-2.5 h-2.5" />
            </span>
            <span className="text-[12.5px] font-medium text-[#1A1A1A]">
              Análise concluída
            </span>
          </div>

          <p className="mt-4 text-[40px] leading-[1.06] tracking-[-0.035em] font-extrabold text-[#1A1A1A] tabular-nums">
            R$ {formatBRL(animatedFoundTotal)}
          </p>
          <p className="mt-1 text-[15px] font-normal text-[#6B7280]">
            encontrados nesta fatura
          </p>
        </header>

        {/* Bloco de itens (1 visível + 2 em efeito de vidro fosco com cadeado) */}
        <div className="mt-6 rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            O que encontramos:
          </h2>

          <ul className="mt-3.5 space-y-2.5" aria-label="Itens encontrados na fatura">
            {/* Item visível */}
            <li className="rounded-[14px] bg-white border border-[#E5E7EB] px-4 py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="w-5 h-5 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center shrink-0"
                >
                  <CheckIcon className="w-3 h-3" />
                </span>
                <span className="text-[14.5px] font-semibold text-[#1A1A1A] leading-snug">
                  Cobrança duplicada — R$ 14,90
                </span>
              </div>
            </li>

            {/* 2 itens bloqueados atrás de vidro fosco */}
            {LOCKED_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={onUnlock}
                  aria-label="Item oculto — assine para ver"
                  className="w-full rounded-[14px] bg-white/75 backdrop-blur-md border border-[#EAEAEA] hover:border-[#D4D4D8] px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-[#3F3F46] leading-snug">
                      Item oculto — assine para ver
                    </p>
                    <p
                      aria-hidden="true"
                      className="mt-0.5 text-[12.5px] text-[#71717A] blur-[4.5px] select-none truncate"
                    >
                      {item.blurredPreview}
                    </p>
                  </div>

                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-[#F4F4F5] text-[#52525B] flex items-center justify-center shrink-0"
                  >
                    <LockIcon className="w-4 h-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#52525B]">
            Assine para ver os 2 itens restantes e o passo a passo de como
            cancelar.
          </p>
        </div>

        {/* Espaço extra para o CTA fixo não sobrepor o texto em telas menores */}
        <div aria-hidden="true" className="h-[104px]" />
      </section>

      {/* CTA fixo no rodapé (acima da barra de navegação flutuante) */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[430px] px-6 pt-3 pb-2 bg-white/95 backdrop-blur-sm border-t border-[#F0F0F0]">
        <button
          type="button"
          onClick={onUnlock}
          className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15.5px] px-5 flex items-center justify-center transition-colors cursor-pointer"
        >
          Desbloquear análise completa
        </button>

        <button
          type="button"
          onClick={onContinueFree}
          className="mt-2 w-full min-h-[38px] py-1.5 text-center text-[13.5px] font-medium text-[#52525B] hover:text-[#1A1A1A] underline underline-offset-4 transition-colors cursor-pointer"
        >
          Continuar grátis (1 análise por mês)
        </button>
      </div>
    </>
  );
}

