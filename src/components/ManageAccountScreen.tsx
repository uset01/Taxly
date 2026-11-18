"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export type RetentionReasonId = "A" | "B" | "C";
type FunnelStep = 1 | 2 | 3 | 4;

interface ManageAccountScreenProps {
  onBack: () => void;
  onSendNewInvoice: () => void;
  onPauseSubscription: () => void;
  onConfirmDeactivate: () => void;
  planStatusLabel?: string;
}

const REASON_OPTIONS: { id: RetentionReasonId; label: string }[] = [
  {
    id: "A",
    label: "Já auditei minha fatura deste mês",
  },
  {
    id: "B",
    label: "R$ 14,99/mês pesa no meu orçamento agora",
  },
  {
    id: "C",
    label: "Outro motivo",
  },
];

export function ManageAccountScreen({
  onBack,
  onSendNewInvoice,
  onPauseSubscription,
  onConfirmDeactivate,
  planStatusLabel = "Plano Mensal · R$ 14,99/mês",
}: ManageAccountScreenProps) {
  const [step, setStep] = useState<FunnelStep>(1);
  const [selectedReason, setSelectedReason] =
    useState<RetentionReasonId | null>(null);
  const [riskConfirmed, setRiskConfirmed] = useState(false);

  const handleHeaderBack = () => {
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

  const confirmDeactivateBtnClass = riskConfirmed
    ? "w-full py-3 rounded-xl bg-black/[0.05] hover:bg-black/[0.08] text-[#71717A] text-xs font-medium transition-all cursor-pointer"
    : "w-full py-3 rounded-xl bg-black/[0.04] text-[#A1A1AA] text-xs font-medium opacity-40 pointer-events-none select-none";

  const checkboxBoxClass = riskConfirmed
    ? "w-4 h-4 rounded border border-[#0F9D58] bg-[#0F9D58] text-white flex items-center justify-center shrink-0 mt-0.5 transition-colors"
    : "w-4 h-4 rounded border border-black/20 bg-white flex items-center justify-center shrink-0 mt-0.5 transition-colors";

  return (
    <section
      aria-label="Gerenciar conta"
      className="mx-[-24px] mt-[-12px] px-6 pt-3 pb-12 bg-[#F6F5F1] text-[#18181B] text-left min-h-[calc(100dvh-70px)]"
    >
      {/* Topo com botão de voltar e indicador discreto */}
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Voltar"
          onClick={handleHeaderBack}
          className="w-9 h-9 rounded-full bg-white border border-black/[0.06] hover:bg-black/[0.03] active:scale-[0.98] text-[#18181B] flex items-center justify-center transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,0,0,0.03)]"
        >
          <ArrowLeft size={16} strokeWidth={1.5} />
        </button>

        <span className="text-[12px] font-medium text-[#8A8985] tracking-[-0.01em]">
          Gerenciar conta
        </span>
      </header>

      {/* ========================================================= */}
      {/* ETAPA 1: Tela Principal de 'Gerenciar conta'              */}
      {/* ========================================================= */}
      {step === 1 && (
        <div className="mt-5">
          {/* Card Principal de Status da Proteção */}
          <div className="rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            {/* Badge verde sutil */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0F9D58]/10 px-2.5 py-1">
              <ShieldCheck
                size={13}
                strokeWidth={1.5}
                className="text-[#0F9D58] shrink-0"
              />
              <span className="text-[10.5px] font-medium tracking-[0.04em] uppercase text-[#0F9D58]">
                BLINDAGEM ATIVA · RENOVAÇÃO AUTOMÁTICA
              </span>
            </div>

            {/* Destaque Principal */}
            <h1 className="mt-3.5 text-[23px] sm:text-[25px] leading-[1.15] tracking-[-0.03em] font-medium text-[#18181B] tabular-nums">
              R$ 2.172,00/ano protegidos pelo radar Taxly
            </h1>

            {/* Resumo de uso em 2 colunas */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-[#F6F5F1] border border-black/[0.06] p-3.5">
                <div className="flex items-center gap-1.5 text-[#0F9D58]">
                  <Lock size={15} strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.03em]">
                    Meu Cofre
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug font-medium text-[#18181B] tabular-nums">
                  12 comprovantes blindados no Cofre
                </p>
              </div>

              <div className="rounded-xl bg-[#F6F5F1] border border-black/[0.06] p-3.5">
                <div className="flex items-center gap-1.5 text-[#0F9D58]">
                  <TrendingUp size={15} strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase tracking-[0.03em]">
                    Progresso
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug font-medium text-[#18181B] tabular-nums">
                  Nível 2 de 3 de Auditoria (66%)
                </p>
              </div>
            </div>

            {/* Botão verde principal */}
            <button
              type="button"
              onClick={onSendNewInvoice}
              className="mt-4 w-full min-h-[48px] rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] active:scale-[0.99] text-white font-medium text-[14.5px] tracking-[-0.02em] px-4 py-3 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
            >
              <FileText size={16} strokeWidth={1.5} />
              <span>Enviar nova fatura para auditoria</span>
            </button>
          </div>

          {/* Dados do plano */}
          <div className="mt-3 rounded-2xl bg-white border border-black/[0.06] px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Shield
                size={16}
                strokeWidth={1.5}
                className="text-[#0F9D58] shrink-0"
              />
              <span className="text-[13.5px] font-medium text-[#18181B] tabular-nums">
                {planStatusLabel}
              </span>
            </div>
            <span className="text-[12px] font-medium text-[#0F9D58]">
              Ativo
            </span>
          </div>

          {/* Link minúsculo e de baixo contraste após espaçamento grande */}
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[11px] text-[#A1A1AA] hover:text-[#71717A] underline decoration-black/10 transition-colors cursor-pointer"
            >
              Alterar ciclo ou desativar monitoramento
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 2: Modal/Tela de Aversão à Perda                    */}
      {/* ========================================================= */}
      {step === 2 && (
        <div className="mt-5">
          {/* Título duo-tone */}
          <h1 className="text-[23px] sm:text-[25px] leading-[1.16] tracking-[-0.03em] font-medium">
            <span className="text-[#18181B]">
              Tem certeza que deseja desproteger sua conta?
            </span>{" "}
            <span className="text-[#8A8985]">
              Veja o que será desativado imediatamente:
            </span>
          </h1>

          {/* Card de impacto negativo com 3 itens */}
          <div className="mt-4 rounded-2xl bg-white border border-black/[0.06] p-5 space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5F1] border border-black/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <Lock size={15} strokeWidth={1.5} className="text-[#18181B]" />
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#52525B]">
                <strong className="font-medium text-[#18181B]">
                  Bloqueio do Meu Cofre:
                </strong>{" "}
                seus 12 recibos e comprovantes (R$ 3.801,30 indexados) ficarão
                inacessíveis para busca e exportação.
              </p>
            </div>

            <div className="pt-3.5 border-t border-black/[0.06] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5F1] border border-black/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp
                  size={15}
                  strokeWidth={1.5}
                  className="text-[#18181B]"
                />
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#52525B]">
                <strong className="font-medium text-[#18181B]">
                  Perda do Histórico de Auditoria:
                </strong>{" "}
                seu progresso de Nível 2 (66% concluído) será zerado.
              </p>
            </div>

            <div className="pt-3.5 border-t border-black/[0.06] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F6F5F1] border border-black/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle
                  size={15}
                  strokeWidth={1.5}
                  className="text-[#18181B]"
                />
              </div>
              <p className="text-[13.5px] leading-relaxed text-[#52525B]">
                <strong className="font-medium text-[#18181B]">
                  Vazamento Silencioso:
                </strong>{" "}
                82% das tarifas e assinaturas canceladas voltam na fatura
                seguinte com outro nome na razão social.
              </p>
            </div>
          </div>

          {/* Inversão de Botões */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-[#0F9D58] hover:bg-[#0B8043] text-white py-3.5 rounded-xl font-medium text-[15px] tracking-[-0.02em] transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
            >
              Manter minha blindagem ativa
            </button>

            <button
              type="button"
              onClick={() => setStep(3)}
              className="block mx-auto text-xs text-[#8A8985] hover:text-[#18181B] mt-3 transition-colors cursor-pointer"
            >
              Continuar para opções de pausa
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 3: Motivo + Oferta de Retenção Irrecusável          */}
      {/* ========================================================= */}
      {step === 3 && (
        <div className="mt-5">
          <h1 className="text-[22px] sm:text-[24px] leading-[1.16] tracking-[-0.03em] font-medium text-[#18181B]">
            Por que você pensa em desativar o radar hoje?
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#8A8985]">
            Selecione uma opção para liberarmos a alternativa ideal para sua
            conta:
          </p>

          {/* 3 Opções clicáveis */}
          <div className="mt-4 space-y-2.5">
            {REASON_OPTIONS.map((option) => {
              const isSelected = selectedReason === option.id;
              const optionBtnClass = isSelected
                ? "w-full rounded-xl bg-white border border-[#0F9D58] p-4 flex items-center justify-between gap-3 text-left transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.08)]"
                : "w-full rounded-xl bg-white border border-black/[0.06] hover:border-black/15 p-4 flex items-center justify-between gap-3 text-left transition-all cursor-pointer";
              const radioCircleClass = isSelected
                ? "w-5 h-5 rounded-full bg-[#0F9D58] text-white flex items-center justify-center shrink-0"
                : "w-5 h-5 rounded-full border border-black/15 bg-[#F6F5F1] flex items-center justify-center shrink-0";

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedReason(option.id)}
                  className={optionBtnClass}
                >
                  <span className="text-[14px] font-medium text-[#18181B]">
                    {option.label}
                  </span>
                  <span className={radioCircleClass}>
                    {isSelected && <Check size={12} strokeWidth={2} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Card de Alternativa Sem Custo Agora (Pausa de 30 dias + Perda de Tarifa Travada) */}
          {selectedReason !== null && (
            <div className="mt-4 rounded-2xl bg-white border border-[#0F9D58]/30 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0F9D58]/10 px-2.5 py-0.5">
                <Sparkles
                  size={12}
                  strokeWidth={1.5}
                  className="text-[#0F9D58]"
                />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#0F9D58]">
                  ALTERNATIVA SEM CUSTO AGORA
                </span>
              </div>

              <div className="mt-3">
                <h2 className="text-[15.5px] leading-snug font-medium text-[#18181B] tracking-[-0.02em]">
                  Pule a próxima cobrança: pause sua assinatura por 30 dias sem
                  perder seu Cofre
                </h2>

                <p className="mt-2 text-[13.5px] leading-relaxed text-[#52525B] tabular-nums">
                  Se cancelar hoje, você perde sua tarifa travada de R$
                  14,99/mês (valor padrão R$ 29,90/mês) e tranca seus 12
                  comprovantes. Pausando, você não paga nada agora e continua
                  protegido.
                </p>

                <button
                  type="button"
                  onClick={onPauseSubscription}
                  className="mt-4 w-full py-3.5 px-4 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white font-medium text-[14.5px] tracking-[-0.02em] transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
                >
                  Pausar por 30 dias grátis
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRiskConfirmed(false);
                  setStep(4);
                }}
                className="block mx-auto mt-3 text-xs text-[#8A8985] hover:text-[#18181B] transition-colors cursor-pointer"
              >
                Recusar pausa e continuar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* ETAPA 4: Checkbox de Confirmação de Risco                 */}
      {/* ========================================================= */}
      {step === 4 && (
        <div className="mt-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1">
            <ShieldAlert
              size={13}
              strokeWidth={1.5}
              className="text-[#18181B]"
            />
            <span className="text-[11px] font-medium uppercase tracking-[0.04em] text-[#18181B]">
              Última confirmação de segurança
            </span>
          </div>

          <h1 className="mt-3 text-[22px] sm:text-[24px] leading-[1.16] tracking-[-0.03em] font-medium text-[#18181B]">
            Confirmação de desativação da blindagem
          </h1>

          {/* Card com checkbox obrigatório */}
          <div className="mt-4 rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={riskConfirmed}
                onChange={(e) => setRiskConfirmed(e.target.checked)}
                className="sr-only"
              />
              <span aria-hidden="true" className={checkboxBoxClass}>
                {riskConfirmed && <Check size={11} strokeWidth={2.5} />}
              </span>
              <span className="text-[13.5px] leading-relaxed text-[#52525B] tabular-nums">
                Estou ciente de que meu Cofre de comprovantes será trancado,
                perderei minha tarifa travada de R$ 14,99/mês e não serei
                alertado caso cobranças duplicadas de R$ 181,00/mês voltem na
                próxima fatura.
              </span>
            </label>
          </div>

          {/* Botão primário verde + Botão secundário cinza-claro */}
          <div className="mt-5 space-y-2.5">
            <button
              type="button"
              onClick={onBack}
              className="w-full bg-[#0F9D58] hover:bg-[#0B8043] text-white py-3.5 rounded-xl font-medium text-[15px] tracking-[-0.02em] tabular-nums transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
            >
              Voltar e manter minha blindagem (R$ 14,99/mês)
            </button>

            <button
              type="button"
              disabled={!riskConfirmed}
              onClick={() => {
                if (riskConfirmed) {
                  onConfirmDeactivate();
                }
              }}
              className={confirmDeactivateBtnClass}
            >
              Confirmar desativação da blindagem
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

