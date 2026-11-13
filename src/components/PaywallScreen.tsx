"use client";

import { useState } from "react";
import { ArrowLeftIcon, CheckIcon } from "@/components/icons";

export type BillingPlanId = "annual" | "monthly";

interface PaywallScreenProps {
  onBack: () => void;
  onSubscribe: (plan: BillingPlanId) => void;
}

interface PlanOption {
  id: BillingPlanId;
  title: string;
  priceMain: string;
  pricePeriod: string;
  badge?: string;
  highlightNote?: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: "annual",
    title: "Anual",
    priceMain: "R$ 179,90",
    pricePeriod: "/ano",
    badge: "MAIS ECONÔMICO",
    highlightNote: "Equivale a R$ 14,99/mês — 50% OFF",
  },
  {
    id: "monthly",
    title: "Mensal",
    priceMain: "R$ 29,90",
    pricePeriod: "/mês",
  },
];

const PAYWALL_BENEFITS = [
  "Análises ilimitadas de faturas e comprovantes",
  "Alertas quando surgir uma cobrança nova",
  "Passo a passo de como cancelar cada item",
];

/**
 * Tela 2 — Paywall exibida ao tocar em "Desbloquear análise completa".
 */
export function PaywallScreen({ onBack, onSubscribe }: PaywallScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>("annual");

  return (
    <section
      aria-label="Planos e assinatura taxly"
      style={{ paddingBottom: "7rem" }}
      className="pt-1 text-left pb-28"
    >
      {/* Header com seta de retorno, frase âncora e subtítulo */}
      <header>
        <button
          type="button"
          aria-label="Voltar para a tela de resultado"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] hover:bg-[#F0F0F0] active:bg-[#E5E5E5] text-[#1A1A1A] flex items-center justify-center transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>

        <h1 className="mt-4 text-[28px] sm:text-[30px] leading-[1.15] tracking-[-0.03em] font-extrabold text-[#1A1A1A]">
          Recupere R$ 37,90 por menos de R$ 0,33 por dia.
        </h1>

        <p className="mt-2 text-[14.5px] font-normal text-[#6B7280]">
          Cancele quando quiser, direto no app.
        </p>
      </header>

      {/* Cards de plano (Anual em destaque + Mensal) */}
      <div
        role="radiogroup"
        aria-label="Escolha seu plano"
        className="mt-6 space-y-3"
      >
        {PLAN_OPTIONS.map((plan) => {
          const isSelected = selectedPlan === plan.id;

          return (
            <button
              key={plan.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative w-full rounded-[16px] p-4 sm:p-5 text-left transition-colors cursor-pointer ${
                isSelected
                  ? "border-2 border-[#00C853] bg-[#FAFAFA]"
                  : "border-2 border-[#E5E7EB] bg-white hover:border-[#D4D4D8]"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-[#00C853] px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em] uppercase text-white">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {plan.title}
                  </p>
                  <p className="mt-1 flex items-baseline gap-0.5">
                    <span className="text-[24px] font-extrabold tracking-[-0.025em] text-[#1A1A1A] tabular-nums">
                      {plan.priceMain}
                    </span>
                    <span className="text-[14px] font-medium text-[#6B7280]">
                      {plan.pricePeriod}
                    </span>
                  </p>
                  {plan.highlightNote && (
                    <p className="mt-1.5 text-[13px] font-semibold text-[#00C853]">
                      {plan.highlightNote}
                    </p>
                  )}
                </div>

                {/* Indicador de seleção (check verde quando selecionado) */}
                <span
                  aria-hidden="true"
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#00C853] text-white"
                      : "border-2 border-[#D4D4D8] bg-white"
                  }`}
                >
                  {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Lista de benefícios */}
      <ul
        aria-label="Benefícios incluídos na assinatura"
        className="mt-6 space-y-3"
      >
        {PAYWALL_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="w-[22px] h-[22px] rounded-full bg-[#FAFAFA] border border-[#EAEAEA] text-[#00C853] flex items-center justify-center shrink-0"
            >
              <CheckIcon className="w-3 h-3" />
            </span>
            <span className="text-[14.5px] text-[#1A1A1A] leading-snug font-normal">
              {benefit}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA final */}
      <div className="mt-7">
        <button
          type="button"
          onClick={() => onSubscribe(selectedPlan)}
          className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15.5px] px-5 flex items-center justify-center transition-colors cursor-pointer"
        >
          Assinar e desbloquear
        </button>

        <p className="mt-2.5 text-center text-[12.5px] font-normal text-[#6B7280]">
          Pagamento seguro · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
