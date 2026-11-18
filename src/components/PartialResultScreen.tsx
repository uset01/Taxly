"use client";

import { AlertCircleIcon, CheckIcon, LockIcon } from "@/components/icons";
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
  return (
    <>
      <section
        aria-label="Resultado parcial da análise"
        style={{ paddingBottom: "7rem" }}
        className="pt-1 text-left pb-28"
      >
        {/* Header: Badge + Frase com volume e valor */}
        <header>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E54848]/[0.08] border border-[#E54848]/20 px-2.5 py-1">
                <AlertCircleIcon className="w-3.5 h-3.5 text-[#E54848] shrink-0" />
                <span className="text-[12px] font-medium text-[#E54848]">
                  6 cobranças suspeitas detectadas
                </span>
              </div>

                <p className="mt-3 text-[17px] sm:text-[18.5px] leading-[1.35] font-semibold tracking-[-0.02em] text-[#171717]">
                  Analisamos 18 transações. Identificamos{" "}
                    <span className="text-[#E54848] font-semibold tabular-nums">
                      R$ 181,00/mês (R$ 2.172,00/ano)
                    </span>{" "}
                    <span className="text-[#858585] font-normal">
                      em cobranças indevidas e recorrentes.
                    </span>
                </p>
              </header>

                  {/* Bloco de itens */}
                  <div className="mt-4 rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-5">
                    <h2 className="text-[14px] font-semibold text-[#171717]">
                      O que encontramos:
                    </h2>

                      <ul className="mt-3 space-y-2" aria-label="Itens encontrados na fatura">
                        {/* Item visível */}
                          <li className="rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] px-3.5 py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                aria-hidden="true"
                                className="w-5 h-5 rounded-full bg-[#08B968]/10 text-[#08B968] flex items-center justify-center shrink-0"
                              >
                                <CheckIcon className="w-3 h-3" />
                              </span>
                                <span className="text-[13.5px] font-semibold text-[#171717] leading-snug">
                                  Cobrança duplicada — R$ 14,90
                                </span>
                            </div>
                          </li>

                          {/* Itens bloqueados */}
                          {LOCKED_ITEMS.map((item) => (
                            <li key={item.id}>
                                  <div className="w-full rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] px-3.5 py-3 flex items-center justify-between gap-3 text-left">
                                    <span className="text-[13.5px] text-[#858585] select-none filter blur-[3px]">
                                      {item.blurredPreview}
                                    </span>
                                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#171717] bg-[#F5F5F2] border border-[#EAEAE7] px-2 py-0.5 rounded-full shrink-0">
                                        <LockIcon className="w-3 h-3 text-[#08B968]" />
                                        <span>Bloqueado</span>
                                      </span>
                                  </div>
                                </li>
            ))}
                              </ul>

                                {/* Bloqueio com texto exato da tarefa */}
                                <div className="mt-3.5 rounded-[10px] bg-[#F5F5F2] border border-[#EAEAE7] p-3 text-center text-[#171717] text-[12px] font-medium leading-snug">
                                  O relatório completo com a explicação e o passo a passo de recuperação está bloqueado.
                                </div>
                              </div>

                              {/* Barra de Progressão de Níveis */}
                              <AuditLevelBar
                                currentLevel={1}
                                isSubscribed={false}
                                className="mt-4"
                              />

                              {/* Faixa Rotativa de Prova Social */}
                              <div className="mt-4">
                                <SocialProofTicker />
                              </div>
                            </section>

      {/* Barra fixa de conversão no rodapé com CTA */}
      <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-30 w-full max-w-[430px] px-6 pt-3 pb-2 bg-[#FAFAF8]/95 backdrop-blur-md border-t border-[#EAEAE7]">
        <button
          type="button"
          onClick={onUnlock}
          className="w-full min-h-[50px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_2px_8px_rgba(8,185,104,0.22)]"
        >
          <span>Recuperar meus R$ 181,00/mês agora</span>
        </button>
        <p className="mt-1.5 text-center text-[11.5px] text-[#858585] font-normal">
          Acesso imediato por R$ 14,99/mês (Recupere até 12x o valor no 1º mês) · Cancele quando quiser
        </p>

        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={onContinueFree}
            className="text-[13px] font-medium text-[#858585] hover:text-[#171717] underline underline-offset-4 cursor-pointer"
          >
            Analisar Fatura Completa ou Extrato
          </button>
        </div>
      </div>
    </>
                          );
}
