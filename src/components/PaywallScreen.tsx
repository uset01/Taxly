"use client";

import { ArrowLeft, Check } from "lucide-react";
import { formatBRL } from "@/data/charges";

export type BillingPlanId = "annual" | "monthly";

interface PaywallScreenProps {
  onBack: () => void;
  onSubscribe: (plan: BillingPlanId) => void;
  annualValue?: number;
  isLoading?: boolean;
}

interface PaywallBenefitItem {
  title: string;
  description: string;
}

const PAYWALL_BENEFITS: PaywallBenefitItem[] = [
  {
    title: "Nomes e datas revelados:",
    description:
      "tire o desfoque agora e veja exatamente quem está cobrando cada centavo na sua fatura",
  },
  {
    title: "Impacto em 12 meses:",
    description:
      "descubra quanto cada assinatura ou taxa silenciosa vai tirar do seu bolso ao longo do ano",
  },
  {
    title: "Auditorias ilimitadas todo mês:",
    description:
      "escaneie suas próximas faturas antes de pagar para barrar duplicidades e reajustes",
  },
  {
    title: "Cofre blindado de comprovantes:",
    description:
      "guarde PIX, boletos e faturas organizados para nunca perder uma prova de pagamento",
  },
];

/**
 * Tela de Paywall / Assinatura — Oferta única de R$ 14,99/mês.
 */
export function PaywallScreen({
  onBack,
  onSubscribe,
  annualValue = 2172,
  isLoading = false,
}: PaywallScreenProps) {
  const valorAnual =
    annualValue && annualValue > 0 ? formatBRL(annualValue) : "2.172,00";

  return (
    <section
      aria-label="Assinatura Taxly"
      className="mx-[-24px] mt-[-12px] px-6 pt-3 pb-8 bg-[#F6F5F1] text-[#18181B] text-left rounded-b-2xl"
    >
      {/* Header com seta de retorno, headline dinâmica e subtítulo */}
      <header>
        <button
          type="button"
          aria-label="Voltar para a tela de resultado"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white border border-black/[0.06] hover:bg-black/[0.03] active:scale-[0.98] text-[#18181B] flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <h1 className="mt-4 text-[26px] sm:text-[28px] leading-[1.12] tracking-[-0.03em] font-medium text-[#18181B] tabular-nums">
          Recupere até R$ {valorAnual}/ano por menos de R$ 0,50 por dia.
        </h1>

        <p className="mt-2 text-[14px] leading-relaxed font-normal text-[#8A8985]">
          Desbloqueie sua auditoria completa agora e monitore suas próximas faturas.
        </p>
      </header>

      {/* Card Único de Assinatura (Hero Card) */}
      <div className="mt-5 rounded-2xl bg-white border border-[#0F9D58]/30 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-left">
        <span className="inline-flex items-center rounded-full bg-[#0F9D58]/10 px-2.5 py-0.5 text-[10.5px] font-medium tracking-[0.04em] uppercase text-[#0F9D58]">
          PLANO ÚNICO · ACESSO IMEDIATO
        </span>

        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-[32px] font-medium tracking-[-0.03em] text-[#18181B] tabular-nums leading-none">
            R$ 14,99
          </span>
          <span className="text-[14px] font-normal text-[#8A8985]">
            /mês
          </span>
        </div>

        <p className="mt-2 text-[13px] font-normal text-[#8A8985]">
          Cancele quando quiser, em 1 clique direto no app.
        </p>

        {/* Faixa de retorno estimado */}
        <div className="mt-3 bg-[#F6F5F1] rounded-lg px-3 py-2 text-xs font-medium text-[#18181B]">
          Retorno estimado: recupere até 12x o valor do plano já na 1ª auditoria.
        </div>

        {/* Lista de Benefícios Focada em Retenção (4 itens com check fino #0F9D58) */}
        <ul
          aria-label="Benefícios incluídos na assinatura"
          className="mt-4 pt-4 border-t border-black/[0.06] space-y-3"
        >
          {PAYWALL_BENEFITS.map((benefit) => (
            <li key={benefit.title} className="flex items-start gap-2.5">
              <Check
                size={16}
                strokeWidth={1.5}
                className="text-[#0F9D58] shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span className="text-[13.5px] leading-snug text-[#52525B] font-normal">
                <strong className="font-semibold text-[#18181B]">
                  {benefit.title}
                </strong>{" "}
                {benefit.description}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Botão Principal */}
      <div className="mt-5">
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onSubscribe("monthly")}
          className="w-full min-h-[52px] rounded-2xl bg-[#0F9D58] hover:bg-[#0B8043] active:scale-[0.99] disabled:opacity-65 text-white font-medium tracking-[-0.02em] tabular-nums text-[15px] px-5 flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_12px_rgba(15,157,88,0.2)]"
        >
          {isLoading
            ? "Redirecionando para o pagamento seguro..."
            : "Desbloquear meu relatório · R$ 14,99"}
        </button>

        <p className="mt-2.5 text-center text-[12px] font-normal text-[#8A8985]">
          Pagamento seguro via Cartão · Renovação mensal
        </p>
      </div>
    </section>
  );
}
