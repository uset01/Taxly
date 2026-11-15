"use client";

import { useState } from "react";
import { ArrowLeftIcon, CheckIcon, LockSmallIcon } from "@/components/icons";
import { formatBRL } from "@/data/charges";

interface LossQuizScreenProps {
  onBack: () => void;
  onActivateSubscription: (planPrice: number) => void;
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
      style={{ paddingBottom: "7rem" }}
      className="pt-1 text-left pb-28 relative min-h-screen animate-in fade-in duration-200"
    >
      {/* Topo com botão de voltar e barra de progresso */}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-[#F0F0F0] dark:border-[#27272A]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            aria-label="Voltar"
            onClick={handleStepBack}
            className="w-9 h-9 rounded-full bg-[#FAFAFA] dark:bg-[#1C1C1E] border border-[#E5E7EB] dark:border-[#2C2C2E] hover:bg-[#F0F0F0] active:bg-[#E5E5E5] text-[#1A1A1A] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <span className="text-[12.5px] font-semibold text-[#8E8E93] uppercase tracking-[0.05em]">
            {step === "final" ? "Diagnóstico" : `Etapa ${step} de 3`}
          </span>
        </div>

        {/* Barra de progresso segmentada de 3 etapas */}
        <div className="flex items-center gap-1.5 w-24">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                (step === "final" || (typeof step === "number" && s <= step))
                  ? "bg-[#00C853]"
                  : "bg-[#E5E5E5] dark:bg-[#2A2A2A]"
              }`}
            />
          ))}
        </div>
      </header>

      {/* ========================================================= */}
      {/* ETAPA 1: Qual seu banco ou cartão principal?               */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#00C853]/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#008A39] dark:text-[#22C55E]">
            ⚡ Passo 1 · Rápido e anônimo
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-tight">
            Qual seu banco ou cartão principal?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA]">
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
                className="min-h-[54px] rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] active:scale-[0.98] border border-[#EAEAEA] dark:border-[#2A2A2A] hover:border-[#00C853] p-3 text-left flex items-center justify-between gap-2 transition-all cursor-pointer group shadow-sm"
              >
                <span className="text-[14.5px] font-semibold text-[#111111] dark:text-white group-hover:text-[#00A844] transition-colors">
                  {bank.name}
                </span>
                <span className="text-[#8E8E93] group-hover:text-[#00C853] transition-colors font-bold text-[14px]">
                  →
                </span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center text-[12px] text-[#8E8E93]">
            100% seguro · Não solicitamos senha nem dados de acesso
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 2: Quais destes você paga ou já testou?             */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#00C853]/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#008A39] dark:text-[#22C55E]">
            ⚡ Passo 2 · Seleção múltipla
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-tight">
            Quais destes você paga ou já testou?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA]">
            Selecione todos que se aplicam ao seu dia a dia:
          </p>

          <div className="mt-4 space-y-2.5">
            {EXPENSE_OPTIONS.map((item) => {
              const isSelected = selectedExpenses.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => handleToggleExpense(item.id)}
                  className={`rounded-[16px] p-3.5 border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                    isSelected
                      ? "bg-[#E8F8EE]/60 dark:bg-[#062414]/60 border-[#00C853] shadow-sm"
                      : "bg-[#FAFAFA] dark:bg-[#1A1A1A] border-[#EAEAEA] dark:border-[#2A2A2A] hover:border-[#D1D5DB]"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14.5px] font-semibold text-[#111111] dark:text-white">
                        {item.name}
                      </p>
                      <span className="text-[11.5px] font-bold text-[#008A39] dark:text-[#22C55E] bg-[#00C853]/10 px-2 py-0.5 rounded-full tabular-nums">
                        +R$ {formatBRL(item.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A1A1AA]">
                      {item.examples}
                    </p>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected
                        ? "bg-[#00C853] border-[#00C853] text-white"
                        : "border-[#D1D5DB] dark:border-[#4B5563] bg-white dark:bg-[#111111]"
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />}
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
              className="w-full min-h-[48px] rounded-[16px] bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <span>Avançar para a última etapa</span>
              <span className="text-[#00C853] font-bold">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 3: Há quanto tempo você não revisa sua fatura?      */}
      {/* ========================================================= */}
      {step === 3 && (
        <div className="mt-5 text-left animate-in fade-in duration-200">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#00C853]/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#008A39] dark:text-[#22C55E]">
            ⚡ Passo 3 · Último passo
          </span>

          <h1 className="mt-3 text-[22px] sm:text-[24px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-tight">
            Há quanto tempo você não revisa sua fatura linha por linha?
          </h1>

          <p className="mt-1.5 text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA]">
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
                className="w-full min-h-[60px] rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] hover:bg-[#F0F0F0] dark:hover:bg-[#252525] active:scale-[0.99] border border-[#EAEAEA] dark:border-[#2A2A2A] hover:border-[#00C853] p-4 text-left flex items-center justify-between gap-3 transition-all cursor-pointer group shadow-sm"
              >
                <div>
                  <p className="text-[15px] font-semibold text-[#111111] dark:text-white group-hover:text-[#00A844] transition-colors">
                    {opt.label}
                  </p>
                  <p className="text-[12px] text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
                    {opt.description}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11.5px] font-bold text-[#008A39] dark:text-[#22C55E] bg-[#00C853]/10 px-2.5 py-0.5 rounded-full">
                    {opt.multiplier}x
                  </span>
                  <span className="text-[#8E8E93] group-hover:text-[#00C853] font-bold text-[14px]">
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
          <div className="rounded-[24px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-5 sm:p-6 text-left">
            {/* Badge de Alerta de Perfil */}
            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] px-3 py-1">
                <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#F87171]">
                  ⚠️ Alerta de Perfil
                </span>
              </div>
              <span className="text-[11.5px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] bg-[#EFEFEF] dark:bg-[#28282A] px-2.5 py-0.5 rounded-full">
                Cliente {selectedBank}
              </span>
            </div>

            {/* Diagnóstico principal exatamente com o texto solicitado */}
            <h1 className="mt-3.5 text-[17.5px] sm:text-[19.5px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-snug">
              Pessoas com o seu perfil financeiro deixam em média{" "}
              <span className="text-[#DC2626] dark:text-[#EF4444] font-extrabold tabular-nums">
                R$ {formatBRL(valorEstimadoMensal)}/mês (R$ {formatBRL(valorEstimadoAnual)}/ano)
              </span>{" "}
              em cobranças silenciosas.
            </h1>

            {/* Teaser com 3 itens típicos desse perfil com nomes borrados */}
            <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] dark:border-[#2A2A2A]">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-[0.04em] mb-2.5">
                Vazamentos mais frequentes detectados para você:
              </p>

              <div className="rounded-[14px] bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2D2D2D] p-3.5 text-left">
                <div className="space-y-2">
                  {/* Linha 1 */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#F0F0F0] dark:border-[#242424]">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white shrink-0">
                        1.
                      </span>
                      <span className="text-[12.5px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7] truncate">
                        [Cobrança Recorrente]{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Streaming VIP / Assinatura
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#EF4444] tabular-nums shrink-0">
                      — R$ 49,90/mês
                    </span>
                  </div>

                  {/* Linha 2 */}
                  <div className="flex items-center justify-between py-1.5 border-b border-[#F0F0F0] dark:border-[#242424]">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white shrink-0">
                        2.
                      </span>
                      <span className="text-[12.5px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7] truncate">
                        [Tarifa Bancária / Seguro]{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Tarifa Pacote Essencial
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#EF4444] tabular-nums shrink-0">
                      — R$ 38,90/mês
                    </span>
                  </div>

                  {/* Linha 3 */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      <span className="text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white shrink-0">
                        3.
                      </span>
                      <span className="text-[12.5px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7] truncate">
                        [Débito em Aplicativo]{" "}
                        <span className="filter blur-[5px] select-none pointer-events-none opacity-80">
                          Assinatura Esquecida Nu
                        </span>
                      </span>
                    </div>
                    <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#EF4444] tabular-nums shrink-0">
                      — R$ 34,90/mês
                    </span>
                  </div>
                </div>

                {/* Bloqueio preto de curiosidade */}
                <div className="w-full mt-3 rounded-[10px] bg-[#1A1A1A] text-white text-[12px] font-medium py-2.5 px-3 flex items-center justify-center gap-2 text-center leading-snug">
                  <LockSmallIcon className="w-4 h-4 text-[#00C853] shrink-0" />
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
              onClick={() => onActivateSubscription(14.99)}
              className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] sm:text-[15.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md text-center leading-snug"
            >
              <span>Ativar Taxly por R$ 14,99/mês e Auditar Minha Fatura</span>
            </button>

            {/* Selo de Garantia Exato Solicitado */}
            <div className="mt-3.5 p-3.5 rounded-[14px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#E5E5E5] dark:border-[#2C2C2E] text-left flex items-start gap-2.5">
              <span className="text-[17px] shrink-0 leading-none select-none">
                🛡️
              </span>
              <p className="text-[12px] leading-relaxed text-[#4B5563] dark:text-[#A1A1AA]">
                <strong className="font-semibold text-[#111111] dark:text-white">
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
                className="mt-3 w-full py-2 text-center text-[13px] font-medium text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white underline underline-offset-4 cursor-pointer"
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
