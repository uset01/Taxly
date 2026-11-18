"use client";

import { useState } from "react";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  LockSmallIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { formatBRL } from "@/data/charges";

interface LossQuizScreenProps {
  onBack: () => void;
  onActivateSubscription: (planPrice: number, annualValue?: number) => void;
  onSendManualFile?: () => void;
}

type QuizStep = 1 | 2 | 3 | "final";

interface BankOption {
  id: string;
  name: string;
  shortName: string;
}

const BANK_OPTIONS: BankOption[] = [
  { id: "nubank", name: "Nubank", shortName: "Nubank" },
  { id: "itau", name: "Itaú", shortName: "Itaú" },
  { id: "inter", name: "Inter", shortName: "Inter" },
  { id: "bradesco", name: "Bradesco", shortName: "Bradesco" },
  { id: "caixa_bb", name: "Caixa / BB", shortName: "Caixa / BB" },
  { id: "outro", name: "Outro banco", shortName: "Outro" },
];

interface ExpenseOption {
  id: string;
  name: string;
  amount: number;
  category: string;
  examples: string;
}

const EXPENSE_OPTIONS: ExpenseOption[] = [
  {
    id: "streamings",
    name: "Streamings",
    amount: 49.9,
    category: "Cobrança Recorrente",
    examples: "Netflix, Spotify, Max, Prime Video...",
  },
  {
    id: "apps",
    name: "Apps Apple / Google",
    amount: 34.9,
    category: "Assinatura Digital",
    examples: "iCloud, Google One, apps e jogos...",
  },
  {
    id: "delivery",
    name: "Delivery / Transporte",
    amount: 45.0,
    category: "Serviço Recorrente",
    examples: "iFood Clube, Uber One, Rappi Prime...",
  },
  {
    id: "tarifa",
    name: "Seguro ou Tarifa de conta",
    amount: 38.9,
    category: "Tarifa Bancária",
    examples: "Tarifa de pacote, seguro cartão, juros...",
  },
];

interface RevisionOption {
  id: string;
  label: string;
  multiplier: number;
  description: string;
}

const REVISION_OPTIONS: RevisionOption[] = [
  {
    id: "1-3m",
    label: "1 a 3 meses",
    multiplier: 1.0,
    description: "Multiplicador 1x de perda acumulada",
  },
  {
    id: "6m+",
    label: "Mais de 6 meses",
    multiplier: 1.2,
    description: "Multiplicador 1.2x (maior risco de recorrência)",
  },
  {
    id: "nunca",
    label: "Nunca revisei",
    multiplier: 1.4,
    description: "Multiplicador 1.4x (acúmulo crônico de tarifas)",
  },
];

export function LossQuizScreen({
  onBack,
  onActivateSubscription,
  onSendManualFile,
}: LossQuizScreenProps) {
  const [step, setStep] = useState<QuizStep>(1);
  const [selectedBank, setSelectedBank] = useState<string>("Nubank");
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([
    "streamings",
    "tarifa",
  ]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionOption>(
    REVISION_OPTIONS[1]
  );

  // Cálculos matemáticos solicitados
  const baseExpensesSum =
    selectedExpenses.length > 0
      ? EXPENSE_OPTIONS.filter((e) => selectedExpenses.includes(e.id)).reduce(
          (acc, curr) => acc + curr.amount,
          0
        )
      : 49.9 + 38.9;

  const currentMultiplier = selectedRevision.multiplier;
  const valorEstimadoMensal = Number(
    (baseExpensesSum * currentMultiplier).toFixed(2)
  );
  const valorEstimadoAnual = Number((valorEstimadoMensal * 12).toFixed(2));

  // Toggle de seleção múltipla da Etapa 2
  const handleToggleExpense = (id: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Navegação para trás inteligente
  const handleStepBack = () => {
    if (step === 1) {
      onBack();
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  return (
    <section
      aria-label="Quiz interativo de diagnóstico financeiro"
      className="pt-1 text-left relative animate-in fade-in duration-200"
    >
      {/* Topo com botão de voltar e barra de progresso */}
      <header className="flex items-center justify-between gap-3 pb-3.5 border-b border-[#EAEAE7] dark:border-[#27272A]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Voltar"
            onClick={handleStepBack}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#EAEAE7] dark:border-[#2C2C2E] hover:bg-[#F5F5F2] active:scale-[0.98] text-[#171717] dark:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-[12px] font-medium text-[#858585] uppercase tracking-[0.06em]">
            {step === "final" ? "Diagnóstico" : `Etapa ${step} de 3`}
          </span>
        </div>

        {/* Barra de progresso segmentada de 3 etapas */}
        <div className="flex items-center gap-1.5 w-24">
          {[1, 2, 3].map((s) => {
            const isFilled =
              step === "final" || (typeof step === "number" && s <= step);
            const barClass = isFilled
              ? "h-1.5 flex-1 rounded-full transition-all duration-300 bg-[#08B968]"
              : "h-1.5 flex-1 rounded-full transition-all duration-300 bg-[#EAEAE7] dark:bg-[#2A2A2A]";
            return <div key={s} className={barClass} />;
          })}
        </div>
      </header>

      {/* ========================================================= */}
      {/* ETAPA 1: Qual seu banco ou cartão principal?               */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#08B968]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968]">
            Passo 1 · Rápido e anônimo
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-semibold tracking-[-0.025em] text-[#171717] dark:text-[#FAFAFA] leading-tight">
            Qual seu banco ou cartão principal?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#858585] dark:text-[#A1A1AA]">
            Toque no seu banco para calibrar a taxa média de cobranças ocultas:
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2.5">
            {BANK_OPTIONS.map((bank) => (
              <button
                key={bank.id}
                type="button"
                onClick={() => {
                  setSelectedBank(bank.name);
                  setStep(2);
                }}
                className="min-h-[54px] rounded-[14px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F2] dark:hover:bg-[#252525] active:scale-[0.98] border border-[#EAEAE7] dark:border-[#2A2A2A] hover:border-[#08B968]/40 p-3.5 text-left flex items-center justify-between gap-2 transition-all cursor-pointer group shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <span className="text-[14px] font-medium text-[#171717] dark:text-white group-hover:text-[#087D4A] transition-colors">
                  {bank.name}
                </span>
                <span className="text-[#858585] group-hover:text-[#08B968] transition-colors font-medium text-[14px]">
                  →
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-[12px] text-[#858585]">
            100% seguro · Não solicitamos senha nem dados de acesso
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 2: Quais destes você paga ou já testou?             */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#08B968]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968]">
            Passo 2 · Seleção múltipla
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-semibold tracking-[-0.025em] text-[#171717] dark:text-[#FAFAFA] leading-tight">
            Quais destes você paga ou já testou?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#858585] dark:text-[#A1A1AA]">
            Selecione todos que se aplicam ao seu dia a dia:
          </p>

          <div className="mt-4 space-y-2.5">
            {EXPENSE_OPTIONS.map((item) => {
              const isSelected = selectedExpenses.includes(item.id);
              const rowClass = isSelected
                ? "rounded-[14px] p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 text-left bg-[#08B968]/[0.05] dark:bg-[#08B968]/10 border-[#08B968]"
                : "rounded-[14px] p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 text-left bg-white dark:bg-[#1A1A1A] border-[#EAEAE7] dark:border-[#2A2A2A] hover:border-[#D4D4D0]";
              const checkClass = isSelected
                ? "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors bg-[#08B968] border-[#08B968] text-white"
                : "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-colors border-[#D4D4D0] dark:border-[#4B5563] bg-white dark:bg-[#111111]";

              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleExpense(item.id)}
                  className={rowClass}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-[#171717] dark:text-white">
                        {item.name}
                      </p>
                      <span className="text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968] bg-[#08B968]/10 px-2 py-0.5 rounded-full tabular-nums">
                        +R$ {formatBRL(item.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#858585] dark:text-[#A1A1AA]">
                      {item.examples}
                    </p>
                  </div>

                  <div className={checkClass}>
                    {isSelected && <CheckIcon className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Botão de avanço da Etapa 2 */}
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full min-h-[48px] rounded-[14px] bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium text-[14px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>Avançar para a última etapa</span>
              <span className="text-[#08B968]">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 3: Há quanto tempo você não revisa sua fatura?      */}
      {/* ========================================================= */}
      {step === 3 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#08B968]/10 px-2.5 py-0.5 text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968]">
            Passo 3 · Último passo
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-semibold tracking-[-0.025em] text-[#171717] dark:text-[#FAFAFA] leading-tight">
            Há quanto tempo você não revisa sua fatura linha por linha?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#858585] dark:text-[#A1A1AA]">
            Toque na opção que mais se aproxima:
          </p>

          <div className="mt-4 space-y-2.5">
            {REVISION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedRevision(opt);
                  setStep("final");
                }}
                className="w-full min-h-[60px] rounded-[14px] bg-white dark:bg-[#1A1A1A] hover:bg-[#F5F5F2] dark:hover:bg-[#252525] active:scale-[0.99] border border-[#EAEAE7] dark:border-[#2A2A2A] hover:border-[#08B968]/40 p-4 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div>
                  <p className="text-[14.5px] font-medium text-[#171717] dark:text-white group-hover:text-[#087D4A] transition-colors">
                    {opt.label}
                  </p>
                  <p className="text-[12px] text-[#858585] dark:text-[#A1A1AA] mt-0.5">
                    {opt.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] font-medium text-[#087D4A] dark:text-[#08B968] bg-[#08B968]/10 px-2.5 py-0.5 rounded-full">
                    {opt.multiplier}x
                  </span>
                  <span className="text-[#858585] group-hover:text-[#08B968] font-medium text-[14px]">
                    →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TELA FINAL DO QUIZ (Pré-Checkout)                         */}
      {/* ========================================================= */}
      {step === "final" && (
        <div className="mt-4 text-left animate-in fade-in duration-200">
          {/* Header do Diagnóstico */}
          <div className="rounded-[18px] bg-white dark:bg-[#1A1A1A] border border-[#EAEAE7] dark:border-[#2A2A2A] p-5 sm:p-6 text-left shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            {/* Badge de Alerta de Perfil */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E54848]/[0.08] border border-[#E54848]/20 px-2.5 py-1">
                <AlertCircleIcon className="w-3.5 h-3.5 text-[#E54848] shrink-0" />
                <span className="text-[12px] font-medium text-[#E54848]">
                  Alerta de Perfil
                </span>
              </div>
              <span className="text-[11.5px] font-medium text-[#858585] bg-[#F5F5F2] dark:bg-[#28282A] px-2.5 py-0.5 rounded-full">
                Cliente {selectedBank}
              </span>
            </div>

            {/* Diagnóstico principal exatamente com o texto solicitado */}
            <h1 className="mt-3.5 text-[18px] sm:text-[20px] font-semibold tracking-[-0.025em] text-[#171717] dark:text-[#FAFAFA] leading-snug">
              Pessoas com o seu perfil financeiro deixam em média{" "}
              <span className="text-[#E54848] font-semibold tabular-nums">
                R$ {formatBRL(valorEstimadoMensal)}/mês (R$ {formatBRL(valorEstimadoAnual)}/ano)
              </span>{" "}
              em cobranças silenciosas.
            </h1>

            {/* Teaser com 3 itens típicos desse perfil com nomes borrados */}
            <div className="mt-4 pt-4 border-t border-[#EAEAE7] dark:border-[#2A2A2A]">
              <p className="text-[11.5px] font-medium text-[#858585] uppercase tracking-[0.06em] mb-2.5">
                Vazamentos mais frequentes detectados para você
              </p>

              <div className="rounded-[14px] bg-[#FAFAF8] dark:bg-[#111111] border border-[#EAEAE7] dark:border-[#2D2D2D] p-3.5 text-left">
                <div className="divide-y divide-[#EAEAE7] dark:divide-[#242424]">
                  {/* Linha 1 */}
                  <div className="flex items-center justify-between py-2 first:pt-0">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12px] font-medium text-[#858585] shrink-0">
                        1.
                      </span>
                      <span className="text-[12.5px] font-normal text-[#171717] dark:text-[#E4E4E7] truncate">
                        Cobrança Recorrente{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Streaming VIP / Assinatura
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-medium text-[#E54848] tabular-nums shrink-0">
                      — R$ 49,90/mês
                    </span>
                  </div>

                  {/* Linha 2 */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12px] font-medium text-[#858585] shrink-0">
                        2.
                      </span>
                      <span className="text-[12.5px] font-normal text-[#171717] dark:text-[#E4E4E7] truncate">
                        Débito Automático{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Tarifa Pacote Essencial
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-medium text-[#E54848] tabular-nums shrink-0">
                      — R$ 38,90/mês
                    </span>
                  </div>

                  {/* Linha 3 */}
                  <div className="flex items-center justify-between py-2 last:pb-0">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12px] font-medium text-[#858585] shrink-0">
                        3.
                      </span>
                      <span className="text-[12.5px] font-normal text-[#171717] dark:text-[#E4E4E7] truncate">
                        Taxa/Serviço{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Assinatura Esquecida Nu
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-medium text-[#E54848] tabular-nums shrink-0">
                      — R$ 34,90/mês
                    </span>
                  </div>
                </div>

                {/* Bloqueio discreto */}
                <div className="w-full mt-3 rounded-[10px] bg-[#F5F5F2] dark:bg-[#1E1E21] border border-[#EAEAE7] dark:border-[#2C2C30] text-[#171717] dark:text-[#FAFAFA] text-[12px] font-normal py-2.5 px-3 flex items-center justify-center gap-2 text-center leading-snug">
                  <LockSmallIcon className="w-3.5 h-3.5 text-[#858585] shrink-0" />
                  <span>
                    O detalhamento dos nomes e o passo a passo de recuperação são liberados na auditoria.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botão Verde Principal Solicitado */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => onActivateSubscription(14.99, valorEstimadoAnual)}
              className="w-full min-h-[52px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] active:scale-[0.99] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_8px_rgba(8,185,104,0.2)] text-center leading-snug"
            >
              <span>Ativar Taxly por R$ 14,99/mês e Auditar Minha Fatura</span>
            </button>

            {/* Selo de Garantia Exato Solicitado */}
            <div className="mt-3 p-3.5 rounded-[14px] bg-white dark:bg-[#1A1A1A] border border-[#EAEAE7] dark:border-[#2C2C2E] text-left flex items-start gap-2.5">
              <ShieldCheckIcon className="w-4 h-4 text-[#08B968] shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed text-[#858585] dark:text-[#A1A1AA]">
                <strong className="font-medium text-[#171717] dark:text-white">
                  Garantia de Economia:
                </strong>{" "}
                se você enviar sua fatura em até 7 dias e não achar pelo menos R$ 15,00 para economizar, devolvemos 100% do valor.
              </p>
            </div>

            {/* Ação secundária: enviar arquivo se já tiver em mãos */}
            {onSendManualFile && (
              <button
                type="button"
                onClick={onSendManualFile}
                className="mt-3 w-full py-2 text-center text-[13px] font-normal text-[#858585] hover:text-[#171717] dark:hover:text-white underline underline-offset-4 cursor-pointer transition-colors"
              >
                Já tenho a fatura salva? Enviar arquivo agora
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
