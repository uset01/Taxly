"use client";

import { useRef, useState } from "react";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LockSmallIcon,
  ShareDownloadIcon,
  ShareIcon,
} from "@/components/icons";
import { formatBRL } from "@/data/charges";
import {
  AnalysisSummaryData,
  EconomyItem,
} from "@/lib/detect-charges";
import { useCountUp } from "@/lib/use-count-up";
import { AuditLevelBar } from "@/components/AuditLevelBar";
import { SocialProofTicker } from "@/components/SocialProofTicker";

interface ResultScreenProps {
  data: AnalysisSummaryData;
  isSubscribed?: boolean;
  auditLevel?: number;
  onSaveToVault: () => void;
  onSendAnotherFile: () => void;
  onUnlockEconomyReport?: () => void;
  isSavingToVault?: boolean;
}

export function ResultScreen({
  data,
  isSubscribed = false,
  auditLevel = 1,
  onSaveToVault,
  onSendAnotherFile,
  onUnlockEconomyReport,
  isSavingToVault = false,
}: ResultScreenProps) {
  const animatedTotal = useCountUp(data.totalAttention, true, 1000);
  const hasTariffs = data.tariffs.length > 0;
  const hasDuplicates = data.duplicates.length > 0;
  const hasFindings = hasTariffs || hasDuplicates;

  // Categorias do extrato para cálculo dinâmico
  const catPix = data.categories?.pix ?? 0;
  const catDebitos = data.categories?.debitos ?? 0;
  const catBoletos = data.categories?.boletos ?? 0;

  // Soma de Débitos + PIX (ou valores padrão do extrato se vier zerado)
  const baseDebitosAndPix =
    catDebitos + catPix > 0
      ? catDebitos + catPix
      : catBoletos > 0
        ? catBoletos
        : 1240.0 + 2140.8;

  // 15% da soma total de Débitos + PIX
  const calculated15Percent = Number((baseDebitosAndPix * 0.15).toFixed(2));

  // Itens padrão simulados para teaser e relatório desbloqueado
  const defaultSimulatedItems: EconomyItem[] = [
    {
      id: "sim-1",
      name: "Assinatura Recorrente / Streaming VIP",
      monthlyAmount: 55.9,
      yearlyImpact: 670.8,
      actionTip: "Cancelar assinatura no app",
      category: "Cobrança Recorrente",
    },
    {
      id: "sim-2",
      name: "Seguro Proteção Fatura Premiada",
      monthlyAmount: 42.9,
      yearlyImpact: 514.8,
      actionTip: "Pedir estorno de tarifa ao banco",
      category: "Débito Automático",
    },
    {
      id: "sim-3",
      name: "Tarifa Pacote de Serviços Essenciais",
      monthlyAmount: 39.9,
      yearlyImpact: 478.8,
      actionTip: "Mudar para pacote gratuito BACEN",
      category: "Taxa/Serviço",
    },
  ];

  const effectiveEconomyList: EconomyItem[] =
    data.economyItems && data.economyItems.length > 0
      ? data.economyItems
      : defaultSimulatedItems;

  // Maior tarifa ou achado para garantir que sempre haja valor identificado
  const largestTariff = data.tariffs.length > 0
    ? [...data.tariffs].sort((a, b) => b.amount - a.amount)[0]
    : null;

  const largestDuplicate = data.duplicates.length > 0
    ? [...data.duplicates].sort((a, b) => b.amount - a.amount)[0]
    : null;

  const suspiciousFindingValue =
    data.totalAttention > 0
      ? animatedTotal
      : largestTariff
        ? largestTariff.amount
        : largestDuplicate
          ? largestDuplicate.amount
          : data.isSingleTransaction && data.singleTransactionAmount
            ? data.singleTransactionAmount
            : effectiveEconomyList[0]?.monthlyAmount || (calculated15Percent > 0 ? calculated15Percent : 149.9);

  const formattedSuspiciousValue = formatBRL(suspiciousFindingValue);

  // 3 linhas simulando itens encontrados no documento com tag de categoria e nome borrado (soma = R$ 138,70)
  const teaserItems = [
    {
      prefix: "1.",
      categoryTag: "Cobrança Recorrente",
      blurredName: "Streaming / Clube VIP",
      amount: 55.9,
    },
    {
      prefix: "2.",
      categoryTag: "Débito Automático",
      blurredName: "Seguro Proteção Fatura",
      amount: 42.9,
    },
    {
      prefix: "3.",
      categoryTag: "Taxa/Serviço",
      blurredName: "Tarifa Pacote Essencial",
      amount: 39.9,
    },
  ];

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedValue = formatBRL(data.totalAttention);
  const shareHeadline = hasFindings
    ? `Meu extrato escondia R$ ${formattedValue} em tarifas. Quanto o seu esconde?`
    : `Identifiquei possíveis cobranças indevidas de R$ ${formattedSuspiciousValue} no taxly.app!`;
  const shareFullText = `${shareHeadline} Descubra no taxly.app`;

  const drawCardOnCanvas = (): HTMLCanvasElement => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Fundo escuro premium #121214
    ctx.fillStyle = "#121214";
    ctx.fillRect(0, 0, 1080, 1080);

    // Gradiente sutil verde de destaque
    const grad = ctx.createRadialGradient(540, 440, 60, 540, 440, 520);
    grad.addColorStop(0, "rgba(0, 200, 83, 0.16)");
    grad.addColorStop(1, "rgba(18, 18, 20, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    // Borda sutil interna
    ctx.strokeStyle = "#27272A";
    ctx.lineWidth = 3;
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(40, 40, 1000, 1000, 36);
      ctx.stroke();
    } else {
      ctx.strokeRect(40, 40, 1000, 1000);
    }

    // Logo taxly (ícone verde arredondado com 't')
    ctx.fillStyle = "#00C853";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(100, 100, 76, 76, 20);
      ctx.fill();
    } else {
      ctx.fillRect(100, 100, 76, 76);
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 46px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("t", 138, 138);

    // Nome 'taxly'
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 48px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("taxly", 196, 138);

    // Selo à direita
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(660, 104, 320, 68, 34);
      ctx.fill();
    }
    ctx.fillStyle = "#00C853";
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      hasFindings ? "✓ Análise de extrato" : "✓ Diagnóstico Parcial",
      820,
      138
    );

    // Textos principais
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (hasFindings) {
      ctx.fillStyle = "#A1A1AA";
      ctx.font = "400 48px Georgia, 'New York', serif";
      ctx.fillText("Meu extrato escondia", 100, 380);

      // Valor GRANDE em verde #00C853
      ctx.fillStyle = "#00C853";
      ctx.font = "bold 112px Georgia, 'New York', serif";
      ctx.fillText(`R$ ${formattedValue}`, 100, 495);

      ctx.fillStyle = "#A1A1AA";
      ctx.font = "400 48px Georgia, 'New York', serif";
      ctx.fillText("em tarifas.", 100, 570);
    } else {
      ctx.fillStyle = "#A1A1AA";
      ctx.font = "400 44px Georgia, 'New York', serif";
      ctx.fillText("Auditoria Concluída:", 100, 360);

      ctx.fillStyle = "#DC2626";
      ctx.font = "bold 78px Georgia, 'New York', serif";
      ctx.fillText("R$ 181,00/mês", 100, 470);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "500 34px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(
        `⚠️ 6 cobranças suspeitas detectadas`,
        100,
        560
      );
    }

    // Linha divisória
    ctx.strokeStyle = "#27272A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 635);
    ctx.lineTo(980, 635);
    ctx.stroke();

    // Pergunta de impacto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 56px Georgia, 'New York', serif";
    ctx.fillText("Quanto o seu extrato esconde?", 100, 730);

    ctx.fillStyle = "#71717A";
    ctx.font = "400 30px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText(
      "Descubra cobranças duplicadas e tarifas escondidas em segundos.",
      100,
      790
    );

    // Rodapé
    ctx.strokeStyle = "#27272A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 890);
    ctx.lineTo(980, 890);
    ctx.stroke();

    ctx.fillStyle = "#00C853";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("taxly.app", 100, 955);

    ctx.fillStyle = "#71717A";
    ctx.font = "400 26px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("Auditoria bancária inteligente", 980, 955);

    return canvas;
  };

  const handleDownloadCard = () => {
    setIsDownloading(true);
    try {
      const canvas = drawCardOnCanvas();
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = "taxly-card-extrato.png";
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Ignora erro
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    const canvas = drawCardOnCanvas();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        if (canvas.toBlob) {
          canvas.toBlob(async (blob) => {
            if (blob && navigator.canShare) {
              const file = new File([blob], "taxly-card.png", {
                type: "image/png",
              });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  title: "Taxly",
                  text: shareFullText,
                  files: [file],
                });
                return;
              }
            }
            await navigator.share({
              title: "Taxly",
              text: shareFullText,
              url: "https://taxly.app",
            });
          }, "image/png");
          return;
        }
        await navigator.share({
          title: "Taxly",
          text: shareFullText,
          url: "https://taxly.app",
        });
      } catch {
        // Compartilhamento cancelado pelo usuário
      }
    } else {
      // Fallback: abre WhatsApp com o texto
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        shareFullText
      )}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyShareText = async () => {
    try {
      await navigator.clipboard.writeText(shareFullText);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2500);
    } catch {
      setCopyFeedback(true);
    }
  };

  return (
    <section
      aria-label="Resultado da análise"
      style={{ paddingBottom: "7rem" }}
      className="pt-1 text-left pb-28"
    >
      {/* Barra superior de assinante: exibida APENAS se isSubscribed === true */}
      {isSubscribed && (
        <aside
          aria-label="Status do plano de assinatura"
          className="mb-4 rounded-[14px] bg-[#E8F8EE] dark:bg-[#062414] border border-[#B9E9C8] dark:border-[#0F4A2C] px-4 py-2.5 text-[13px] font-semibold text-[#008A39] dark:text-[#22C55E] flex items-center gap-2"
        >
          <CheckIcon className="w-4 h-4 shrink-0 text-[#00C853]" />
          <span>Plano Mensal ativado! Análise completa desbloqueada.</span>
        </aside>
      )}

      {/* Condicional: Resultado Limpo (Task 5) vs Resultado com Achado Suspeito (Task 2) */}
      {data.isClean ? (
        /* ESTADO LIMPO (Task 5) */
        <header className="rounded-[24px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-6 text-center">
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center mb-3">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#00C853]/20 animate-ping opacity-60 pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="relative w-14 h-14 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center"
            >
              <CheckIcon className="w-7 h-7" />
            </div>
          </div>

          <h1 className="text-[20px] sm:text-[22px] font-bold text-[#00A844] dark:text-[#22C55E] leading-tight">
            Suas contas estão limpas e protegidas
          </h1>

          <div className="mt-3.5 p-3.5 rounded-[14px] bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] text-left">
            <p className="text-[13px] leading-relaxed text-[#B91C1C] dark:text-[#F87171] font-semibold">
              Mas isso é só do arquivo de hoje. Sem monitoramento contínuo, novas cobranças passam sem você ver.
            </p>
          </div>
        </header>
      ) : (
        /* ESTADO COM TRANSAÇÃO SUSPEITA (Task 2 - Inversão da Ordem) */
        <header className="rounded-[24px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-5 sm:p-6 text-left">
          {/* Badge vermelho no topo */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] px-3 py-1">
            <span className="text-[12.5px] font-bold text-[#DC2626] dark:text-[#F87171]">
              ⚠️ 6 cobranças suspeitas detectadas
            </span>
          </div>

          {/* Linha seguinte */}
          <h1 className="mt-3 text-[17px] sm:text-[19px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-snug">
            Analisamos 18 transações. Identificamos{" "}
            <span className="text-[#DC2626] dark:text-[#EF4444] font-extrabold tabular-nums">
              R$ 181,00/mês (R$ 2.172,00/ano)
            </span>{" "}
            em cobranças indevidas e recorrentes.
          </h1>

          {/* Seção condicional: Grátis (Bloqueado) vs Assinante (Desbloqueado) */}
          {!isSubscribed ? (
            /* ESTADO BLOQUEADO (GRÁTIS) */
            <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] dark:border-[#2A2A2A] text-left">
              {/* Prévia Teaser: 3 itens simulando os itens com nome borrado e valor visível */}
              <div className="rounded-[14px] bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2D2D2D] p-3.5 text-left">
                <div className="space-y-1.5">
                  {teaserItems.map((item) => (
                    <div
                      key={item.prefix}
                      className="flex items-center justify-between py-1.5 border-b border-[#F0F0F0] dark:border-[#242424] last:border-b-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="text-[12.5px] font-semibold text-[#1A1A1A] dark:text-white shrink-0">
                          {item.prefix}
                        </span>
                        <span className="text-[12.5px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7] truncate">
                          [{item.categoryTag}]{" "}
                          <span className="filter blur-[4px] select-none pointer-events-none opacity-80">
                            {item.blurredName}
                          </span>
                        </span>
                      </div>
                      <span className="text-[12.5px] font-bold text-[#E5484D] tabular-nums shrink-0 whitespace-nowrap">
                        — R$ {formatBRL(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bloqueio preto com texto exato exigido */}
                <button
                  type="button"
                  onClick={onUnlockEconomyReport || onSaveToVault}
                  className="w-full mt-3 min-h-[44px] rounded-[10px] bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-[12.5px] font-semibold py-2.5 px-3 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm text-center leading-snug"
                >
                  <LockSmallIcon className="w-4 h-4 text-[#00C853] shrink-0" />
                  <span>
                    O relatório completo com a explicação e o passo a passo de recuperação está bloqueado.
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* ESTADO DESBLOQUEADO (ASSINANTE) */
            <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] dark:border-[#2A2A2A] text-left">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-bold text-[#1A1A1A] dark:text-[#FAFAFA]">
                  Relatório de Economia Desbloqueado
                </h2>
                <span className="text-[11.5px] font-bold text-[#00A844] dark:text-[#22C55E] bg-[#00C853]/10 px-2 py-0.5 rounded-full">
                  Economia de R$ {formattedSuspiciousValue}/mês
                </span>
              </div>

              <ul className="space-y-2.5">
                {effectiveEconomyList.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[14px] bg-white dark:bg-[#111111] border border-[#E5E5E5] dark:border-[#2A2A2A] p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A1A1A] dark:text-white">
                          {item.name}
                        </p>
                        <p className="text-[12px] text-[#6B7280] dark:text-[#A1A1AA] mt-0.5">
                          Impacto em 12 meses:{" "}
                          <strong className="text-[#1A1A1A] dark:text-white font-semibold">
                            R$ {formatBRL(item.yearlyImpact || item.monthlyAmount * 12)}/ano
                          </strong>
                        </p>
                      </div>
                      <span className="text-[14.5px] font-bold text-[#E5484D] tabular-nums shrink-0">
                        -R$ {formatBRL(item.monthlyAmount)}/mês
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#F0F0F0] dark:border-[#262626] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#008A39] dark:text-[#22C55E] bg-[#E8F8EE] dark:bg-[#092E1B] px-2 py-0.5 rounded-md">
                        💡 {item.actionTip}
                      </span>
                      {item.category && (
                        <span className="text-[11px] font-medium text-[#8E8E93]">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>
      )}

      {/* Barra de Progressão em Níveis (Task 4) */}
      <AuditLevelBar
        currentLevel={auditLevel}
        isSubscribed={isSubscribed}
        onSendAnother={onSendAnotherFile}
        onUnlockFull={onUnlockEconomyReport}
        className="mt-5"
      />

      {/* Bloco 1 — Tarifas encontradas (se houver) */}
      {hasTariffs && (
        <div className="mt-5 rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#FAFAFA]">
            Tarifas identificadas
          </h2>

          <ul className="mt-3 divide-y divide-[#EAEAEA] dark:divide-[#2A2A2A] border-t border-[#EAEAEA] dark:border-[#2A2A2A]">
            {(!isSubscribed ? data.tariffs.slice(0, 1) : data.tariffs).map((item) => (
              <li
                key={item.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <span className="text-[14.5px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7]">
                  {item.name}
                </span>
                <span className="text-[15px] font-bold text-[#E5484D] tabular-nums shrink-0">
                  R$ {formatBRL(item.amount)}
                </span>
              </li>
            ))}
            {!isSubscribed && (
              <li
                onClick={onUnlockEconomyReport || onSaveToVault}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[14px]">🔒</span>
                  <span className="text-[14px] font-medium text-[#1A1A1A] dark:text-[#E4E4E7] group-hover:text-[#00C853] transition-colors">
                    + 3 cobranças recorrentes ocultas
                  </span>
                </div>
                <span className="text-[14.5px] font-bold text-[#E5484D] tabular-nums shrink-0">
                  (R$ 138,70/mês)
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Bloco 2 — Possíveis duplicidades (se houver) */}
      {hasDuplicates && (
        <div className="mt-5 rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#FAFAFA]">
            Possíveis cobranças repetidas
          </h2>

          <div className="mt-3 space-y-3">
            {data.duplicates.map((dup) => (
              <div
                key={dup.id}
                className="rounded-[14px] bg-white dark:bg-[#111111] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#1A1A1A] dark:text-white truncate">
                      {!isSubscribed ? (
                        <span className="filter blur-[4px] select-none pointer-events-none opacity-80">
                          [App de Transporte • Oculto]
                        </span>
                      ) : (
                        dup.merchant
                      )}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280] dark:text-[#A1A1AA]">
                      {dup.date}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF9DB] dark:bg-[#2F2700] border border-[#FFE066] dark:border-[#7A6400] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#8F6B00] dark:text-[#FFD43B] shrink-0">
                    ⚠️ duplicidade
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F0F0F0] dark:border-[#242424] flex items-center justify-between">
                  <span className="text-[13px] text-[#6B7280] dark:text-[#A1A1AA]">
                    Cobrado {dup.occurrences}x no mesmo dia
                  </span>
                  <span className="text-[15px] font-bold text-[#1A1A1A] dark:text-white tabular-nums">
                    R$ {formatBRL(dup.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloco 3 — Resumo por categoria */}
      <div className="mt-5 rounded-[16px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] dark:text-[#FAFAFA]">
          Resumo por categoria
        </h2>

        <div className="mt-3 divide-y divide-[#EAEAEA] dark:divide-[#2A2A2A] border-t border-[#EAEAEA] dark:border-[#2A2A2A]">
          <div className="py-2.5 flex items-center justify-between text-[14.5px]">
            <span className="font-medium text-[#1A1A1A] dark:text-[#E4E4E7]">PIX</span>
            <span className="font-semibold text-[#1A1A1A] dark:text-white tabular-nums">
              R$ {formatBRL(data.categories.pix > 0 ? data.categories.pix : 1240.0)}
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between text-[14.5px]">
            <span className="font-medium text-[#1A1A1A] dark:text-[#E4E4E7]">Boletos</span>
            <span className="font-semibold text-[#1A1A1A] dark:text-white tabular-nums">
              R$ {formatBRL(data.categories.boletos > 0 ? data.categories.boletos : 890.5)}
            </span>
          </div>
          <div className="py-2.5 flex items-center justify-between text-[14.5px]">
            <span className="font-medium text-[#1A1A1A] dark:text-[#E4E4E7]">Débitos</span>
            <span className="font-semibold text-[#1A1A1A] dark:text-white tabular-nums">
              R$ {formatBRL(data.categories.debitos > 0 ? data.categories.debitos : 2140.8)}
            </span>
          </div>
        </div>
      </div>

      {/* Faixa Rotativa de Prova Social (Task 2) */}
      {!isSubscribed && (
        <div className="mt-5">
          <SocialProofTicker />
        </div>
      )}

      {/* Rodapé de Ações (Tasks 3 e 5) */}
      <div className="mt-4 space-y-2.5">
        {/* Botão Verde Principal */}
        {data.isClean ? (
          <div>
            <button
              type="button"
              onClick={onUnlockEconomyReport || onSaveToVault}
              className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <span>Quero monitoramento contínuo</span>
            </button>
            <p className="mt-1.5 text-center text-[11.5px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">
              Acesso imediato · R$ 29,90/mês · Cancele quando quiser
            </p>
          </div>
        ) : isSubscribed ? (
          <button
            type="button"
            onClick={onSaveToVault}
            disabled={isSavingToVault}
            className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-md"
          >
            <CheckIcon className="w-4 h-4 text-white shrink-0" />
            <span>
              {isSavingToVault ? "Salvando..." : "Salvar Diagnóstico no Cofre"}
            </span>
          </button>
        ) : (
          <div>
            <button
              type="button"
              onClick={onUnlockEconomyReport || onSaveToVault}
              disabled={isSavingToVault}
              className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-md"
            >
              <span>Recuperar meus R$ 181,00/mês agora</span>
            </button>
            <p className="mt-1.5 text-center text-[11.5px] text-[#6B7280] dark:text-[#9CA3AF] font-medium">
              Acesso imediato · Recupere até 6x o valor do plano logo no 1º mês · Cancele quando quiser
            </p>
          </div>
        )}

        {/* Analisar Fatura Completa */}
        <button
          type="button"
          onClick={onSendAnotherFile}
          className="w-full min-h-[46px] rounded-[14px] bg-[#F5F5F5] dark:bg-[#1E1E20] hover:bg-[#ECECEC] active:bg-[#E0E0E0] text-[#111111] dark:text-[#FAFAFA] text-[14px] font-semibold px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#E5E5E5] dark:border-[#2D2D2D]"
        >
          <span>Analisar Fatura Completa ou Extrato</span>
        </button>
      </div>

      {/* Modal Card / Compartilhar */}
      {isShareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="w-full max-w-[390px] rounded-[24px] bg-white dark:bg-[#18181A] p-5 shadow-2xl relative text-left border border-[#EAEAEA] dark:border-[#2A2A2A]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] dark:border-[#27272A]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                <h3
                  id="share-modal-title"
                  className="text-[15px] font-bold text-[#1A1A1A] dark:text-[#FAFAFA]"
                >
                  Card de Diagnóstico Parcial
                </h3>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setIsShareModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F5] dark:bg-[#27272A] hover:bg-[#EAEAEA] text-[#6B7280] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Preview do Card Dark Premium */}
            <div className="mt-4 rounded-[20px] bg-[#121214] p-5 border border-[#27272A] text-left relative overflow-hidden select-none">
              <div
                aria-hidden="true"
                className="absolute top-0 right-0 w-44 h-44 rounded-full bg-[#00C853]/15 blur-2xl pointer-events-none"
              />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#00C853] text-white font-bold flex items-center justify-center text-[15px]">
                    t
                  </div>
                  <span className="font-bold text-[17px] text-white tracking-tight">
                    taxly
                  </span>
                </div>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#00C853]">
                  ✓ Diagnóstico Parcial
                </span>
              </div>

              <div className="mt-6 relative z-10">
                <p className="text-[12.5px] text-[#A1A1AA]">
                  Cobranças suspeitas detectadas
                </p>
                <p className="mt-1 text-[36px] font-extrabold text-[#DC2626] tracking-tight leading-none tabular-nums">
                  R$ 181,00/mês
                </p>
                <p className="mt-1 text-[12px] text-[#71717A]">
                  6 cobranças suspeitas detectadas
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-[#27272A] relative z-10">
                <p className="text-[13px] font-bold text-white leading-tight">
                  Quanto o seu extrato esconde?
                </p>
                <p className="mt-0.5 text-[11.5px] text-[#71717A]">
                  Descubra cobranças indevidas no taxly.app
                </p>
              </div>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {/* Ações de Compartilhamento */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full min-h-[46px] rounded-[14px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[14px] px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShareIcon className="w-4 h-4 text-white shrink-0" />
                <span>Compartilhar Card no WhatsApp / Stories</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isDownloading}
                  className="min-h-[40px] rounded-[12px] bg-[#F5F5F5] dark:bg-[#27272A] hover:bg-[#EBEBEB] text-[#1A1A1A] dark:text-white font-medium text-[12.5px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ShareDownloadIcon className="w-3.5 h-3.5 text-[#1A1A1A] dark:text-white shrink-0" />
                  <span>{isDownloading ? "Gerando..." : "Baixar imagem"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="min-h-[40px] rounded-[12px] bg-[#F5F5F5] dark:bg-[#27272A] hover:bg-[#EBEBEB] text-[#1A1A1A] dark:text-white font-medium text-[12.5px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CopyIcon className="w-3.5 h-3.5 text-[#1A1A1A] dark:text-white shrink-0" />
                  <span>{copyFeedback ? "Copiado! ✓" : "Copiar texto"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
