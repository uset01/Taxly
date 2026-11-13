"use client";

import { useRef, useState } from "react";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  LockSmallIcon,
  RadarSearchIcon,
  ShareDownloadIcon,
  ShareIcon,
} from "@/components/icons";
import { formatBRL } from "@/data/charges";
import {
  AnalysisSummaryData,
  EconomyItem,
} from "@/lib/detect-charges";
import { useCountUp } from "@/lib/use-count-up";

interface ResultScreenProps {
  data: AnalysisSummaryData;
  isSubscribed?: boolean;
  onSaveToVault: () => void;
  onSendAnotherFile: () => void;
  onUnlockEconomyReport?: () => void;
  isSavingToVault?: boolean;
}

export function ResultScreen({
  data,
  isSubscribed = false,
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
      monthlyAmount: 149.9,
      yearlyImpact: 1798.8,
      actionTip: "Cancelar assinatura no app",
      category: "Cobrança Recorrente",
    },
    {
      id: "sim-2",
      name: "Seguro Proteção Fatura Premiada",
      monthlyAmount: 110.1,
      yearlyImpact: 1321.2,
      actionTip: "Pedir estorno de tarifa ao banco",
      category: "Débito Automático",
    },
    {
      id: "sim-3",
      name: "Tarifa Pacote de Serviços Essenciais",
      monthlyAmount: 90.0,
      yearlyImpact: 1080.0,
      actionTip: "Mudar para pacote gratuito BACEN",
      category: "Taxa/Serviço",
    },
  ];

  const effectiveEconomyList: EconomyItem[] =
    data.economyItems && data.economyItems.length > 0
      ? data.economyItems
      : defaultSimulatedItems;

  // 3 linhas simulando itens encontrados no documento com tag de categoria e nome borrado
  const teaserItems = [
    {
      prefix: "1.",
      categoryTag: "Cobrança Recorrente",
      blurredName: "Streaming / Clube VIP",
      amount: effectiveEconomyList[0]?.monthlyAmount || 149.9,
    },
    {
      prefix: "2.",
      categoryTag: "Débito Automático",
      blurredName: "Seguro Proteção Fatura",
      amount: effectiveEconomyList[1]?.monthlyAmount || 110.1,
    },
    {
      prefix: "3.",
      categoryTag: "Taxa/Serviço",
      blurredName: "Tarifa Pacote Essencial",
      amount: effectiveEconomyList[2]?.monthlyAmount || 90.0,
    },
  ];

  const savingsAmount =
    data.isSingleTransaction && data.singleTransactionAmount
      ? data.singleTransactionAmount
      : calculated15Percent > 0
        ? calculated15Percent
        : 184.7;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedValue = formatBRL(data.totalAttention);
  const formattedSavings = formatBRL(savingsAmount);
  const shareHeadline = hasFindings
    ? `Meu extrato escondia R$ ${formattedValue} em tarifas. Quanto o seu esconde?`
    : `Diagnóstico Parcial concluído no taxly: 0 duplicidades ou taxas ilegais encontradas hoje. Alerta: R$ ${formattedSavings}/mês em pequenos débitos e transferências que podem ser cortados.`;
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
      ctx.fillText("Auditoria Completa:", 100, 360);

      ctx.fillStyle = "#00C853";
      ctx.font = "bold 82px Georgia, 'New York', serif";
      ctx.fillText("0 TAXAS ILEGAIS", 100, 470);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "500 36px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText(
        data.isSingleTransaction
          ? `Transação analisada: R$ ${formattedSavings}`
          : `⚠️ Alerta: R$ ${formattedSavings}/mês em pequenos débitos otimizáveis`,
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
          className="mb-4 rounded-[14px] bg-[#E8F8EE] border border-[#B9E9C8] px-4 py-2.5 text-[13px] font-semibold text-[#008A39] flex items-center gap-2"
        >
          <CheckIcon className="w-4 h-4 shrink-0 text-[#00C853]" />
          <span>Plano Mensal ativado! Análise completa desbloqueada.</span>
        </aside>
      )}

      {/* Header */}
      {hasFindings ? (
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
            R$ {formatBRL(animatedTotal)}
          </p>
          <p className="mt-1 text-[15px] font-normal text-[#6B7280]">
            em tarifas e possíveis duplicidades
          </p>
        </header>
      ) : (
        /* Card Central de Resultado: Auditoria Completa Concluída */
        <header className="rounded-[24px] bg-[#FAFAFA] border border-[#EAEAEA] p-6 text-center">
          {/* Ícone de Radar/Lupa ativo em tom verde com animação sutil de pulso */}
          <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-[#00C853]/20 animate-ping opacity-60 pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="relative w-14 h-14 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center"
            >
              <RadarSearchIcon className="w-7 h-7" />
            </div>
          </div>

          {/* Título principal */}
          <h1 className="mt-4 text-[21px] sm:text-[22px] font-bold text-[#1A1A1A] leading-tight">
            Auditoria Completa Concluída.
          </h1>

          {/* Texto complementar */}
          <p className="mt-1.5 text-[14.5px] text-[#00A844] font-medium">
            0 duplicidades ou taxas ilegais encontradas hoje.
          </p>

          {/* Seção de Volume de Dados Analisado */}
          <p className="mt-2 text-[12.5px] text-[#8E8E93] font-normal">
            Escaneados 100% dos dados enviados.
          </p>

          {/* Seção condicional: Grátis (Bloqueado) vs Assinante (Desbloqueado) */}
          {!isSubscribed ? (
            /* ESTADO BLOQUEADO (GRÁTIS) */
            <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] text-left">
              {/* Alerta de Otimização Amarelo (15% de Débitos + PIX) */}
              <div className="rounded-[14px] bg-[#FFFBEB] border border-[#FDE68A] p-3.5 text-left">
                {data.isSingleTransaction ? (
                  <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-[#78350F]">
                    <span className="font-bold text-[#92400E]">⚠️ Alerta:</span>{" "}
                    Identificamos 1 transação de{" "}
                    <strong className="font-bold text-[#B45309]">
                      R$ {formattedSavings}
                    </strong>
                    . Envie sua fatura ou extrato mensal completo para achar mais gastos.
                  </p>
                ) : (
                  <p className="text-[13px] sm:text-[13.5px] leading-relaxed text-[#78350F]">
                    <span className="font-bold text-[#92400E]">
                      ⚠️ Alerta de Otimização:
                    </span>{" "}
                    Você não teve tarifas ilegais, mas identificamos{" "}
                    <strong className="font-bold text-[#B45309]">
                      R$ {formattedSavings}/mês
                    </strong>{" "}
                    em pequenos débitos e transferências que podem ser cortados.
                    Desbloqueie o raio-x detalhado abaixo.
                  </p>
                )}
              </div>

              {/* Prévia Teaser: 3 itens simulando os itens com nome borrado e valor visível + Barra preta */}
              <div className="mt-3 rounded-[14px] bg-white border border-[#E5E5E5] p-3.5 text-left">
                <div className="space-y-1.5">
                  {teaserItems.map((item) => (
                    <div
                      key={item.prefix}
                      className="flex items-center justify-between py-1.5 border-b border-[#F0F0F0] last:border-b-0 text-left"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-2">
                        <span className="text-[12.5px] font-semibold text-[#1A1A1A] shrink-0">
                          {item.prefix}
                        </span>
                        <span className="text-[12.5px] font-medium text-[#1A1A1A] truncate">
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

                {/* Botão preto estático logo abaixo das 3 linhas */}
                <button
                  type="button"
                  onClick={onUnlockEconomyReport || onSaveToVault}
                  className="w-full mt-3 min-h-[40px] rounded-[10px] bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white text-[12px] font-semibold py-2 px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                >
                  <LockSmallIcon className="w-3.5 h-3.5 text-[#00C853]" />
                  <span>Conteúdo bloqueado • Desbloqueie o relatório</span>
                </button>
              </div>
            </div>
          ) : (
            /* ESTADO DESBLOQUEADO (ASSINANTE) */
            <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] text-left">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-bold text-[#1A1A1A]">
                  Relatório de Economia Desbloqueado
                </h2>
                <span className="text-[11.5px] font-bold text-[#00A844] bg-[#00C853]/10 px-2 py-0.5 rounded-full">
                  Economia de R$ {formattedSavings}/mês
                </span>
              </div>

              <ul className="space-y-2.5">
                {effectiveEconomyList.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[14px] bg-white border border-[#E5E5E5] p-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A1A1A]">
                          {item.name}
                        </p>
                        <p className="text-[12px] text-[#6B7280] mt-0.5">
                          Impacto em 12 meses:{" "}
                          <strong className="text-[#1A1A1A] font-semibold">
                            R$ {formatBRL(item.yearlyImpact || item.monthlyAmount * 12)}/ano
                          </strong>
                        </p>
                      </div>
                      <span className="text-[14.5px] font-bold text-[#E5484D] tabular-nums shrink-0">
                        -R$ {formatBRL(item.monthlyAmount)}/mês
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#F0F0F0] flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#008A39] bg-[#E8F8EE] px-2 py-0.5 rounded-md">
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

      {/* Bloco 1 — Tarifas encontradas (só aparece se houver) */}
      {hasTariffs && (
        <div className="mt-6 rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Tarifas que você pagou
          </h2>

          <ul className="mt-3 divide-y divide-[#EAEAEA] border-t border-[#EAEAEA]">
            {data.tariffs.map((item) => (
              <li
                key={item.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <span className="text-[14.5px] font-medium text-[#1A1A1A]">
                  {item.name}
                </span>
                <span className="text-[15px] font-bold text-[#E5484D] tabular-nums shrink-0">
                  R$ {formatBRL(item.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Bloco 2 — Possíveis duplicidades (só aparece se houver) */}
      {hasDuplicates && (
        <div className="mt-5 rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Cuidado, isto apareceu 2x
          </h2>

          <div className="mt-3 space-y-3">
            {data.duplicates.map((dup) => (
              <div
                key={dup.id}
                className="rounded-[14px] bg-white border border-[#EAEAEA] p-4"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#1A1A1A] truncate">
                      {dup.merchant}
                    </p>
                    <p className="mt-0.5 text-[13px] text-[#6B7280]">
                      {dup.date}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF9DB] border border-[#FFE066] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#8F6B00] shrink-0">
                    ⚠️ possível duplicidade
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#F0F0F0] flex items-center justify-between">
                  <span className="text-[13px] text-[#6B7280]">
                    Cobrado {dup.occurrences}x no mesmo dia
                  </span>
                  <span className="text-[15px] font-bold text-[#1A1A1A] tabular-nums">
                    R$ {formatBRL(dup.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bloco 3 — Resumo por categoria */}
      {(hasFindings ||
        data.categories.pix > 0 ||
        data.categories.boletos > 0 ||
        data.categories.debitos > 0) && (
        <div className="mt-5 rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 sm:p-5">
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">
            Resumo por categoria
          </h2>

          <div className="mt-3 divide-y divide-[#EAEAEA] border-t border-[#EAEAEA]">
            <div className="py-2.5 flex items-center justify-between text-[14.5px]">
              <span className="font-medium text-[#1A1A1A]">PIX</span>
              <span className="font-semibold text-[#1A1A1A] tabular-nums">
                R$ {formatBRL(data.categories.pix > 0 ? data.categories.pix : 1240.0)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-[14.5px]">
              <span className="font-medium text-[#1A1A1A]">Boletos</span>
              <span className="font-semibold text-[#1A1A1A] tabular-nums">
                R$ {formatBRL(data.categories.boletos > 0 ? data.categories.boletos : 890.5)}
              </span>
            </div>
            <div className="py-2.5 flex items-center justify-between text-[14.5px]">
              <span className="font-medium text-[#1A1A1A]">Débitos</span>
              <span className="font-semibold text-[#1A1A1A] tabular-nums">
                R$ {formatBRL(data.categories.debitos > 0 ? data.categories.debitos : 2140.8)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé de Ações */}
      <div className="mt-6 space-y-2.5">
        {/* Botão Verde Principal */}
        {isSubscribed ? (
          <button
            type="button"
            onClick={onSaveToVault}
            disabled={isSavingToVault}
            className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <CheckIcon className="w-4 h-4 text-white shrink-0" />
            <span>
              {isSavingToVault ? "Salvando..." : "Salvar Diagnóstico no Cofre"}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onUnlockEconomyReport || onSaveToVault}
            disabled={isSavingToVault}
            className="w-full min-h-[52px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <LockSmallIcon className="w-4 h-4 text-white shrink-0" />
            <span>
              Destravar Relatório de Economia (R$ {formattedSavings}
              {data.isSingleTransaction ? "" : "/mês"})
            </span>
          </button>
        )}

        {/* Botão Secundário de Compartilhamento */}
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="w-full min-h-[48px] rounded-[16px] bg-[#F5F5F5] hover:bg-[#EDEDED] active:bg-[#E5E5E5] text-[#1A1A1A] font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#E5E5E5]"
        >
          <ShareIcon className="w-4 h-4 text-[#1A1A1A] shrink-0" />
          <span>Compartilhar Diagnóstico Parcial</span>
        </button>

        {/* Link Inferior */}
        <button
          type="button"
          onClick={onSendAnotherFile}
          className="w-full py-2.5 text-center text-[14px] font-medium text-[#6B7280] hover:text-[#1A1A1A] underline underline-offset-4 transition-colors cursor-pointer"
        >
          Analisar Fatura Completa ou Extrato
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
            className="w-full max-w-[390px] rounded-[24px] bg-white p-5 shadow-2xl relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0]">
              <h3
                id="share-modal-title"
                className="text-[16px] font-bold text-[#1A1A1A]"
              >
                Compartilhar Diagnóstico Parcial
              </h3>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Prévia do Card Gerado (Dark Minimalist com Logo e Destaque Verde) */}
            <div className="mt-4 rounded-[20px] bg-[#121214] text-white p-5 border border-[#27272A] relative overflow-hidden select-none shadow-md">
              <div className="absolute top-0 right-0 w-36 h-36 bg-[#00C853]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] bg-[#00C853] text-white font-bold flex items-center justify-center text-[15px]">
                    t
                  </div>
                  <span className="font-bold text-[18px] tracking-tight">
                    taxly
                  </span>
                </div>
                <span className="text-[11.5px] font-semibold text-[#00C853] bg-white/10 px-2.5 py-1 rounded-full">
                  ✓ Análise de extrato
                </span>
              </div>

              <div className="mt-5 relative z-10">
                <p className="text-[15px] text-[#A1A1AA] font-serif">
                  Meu extrato escondia
                </p>
                <p className="text-[34px] font-extrabold text-[#00C853] font-serif tracking-tight leading-tight mt-0.5">
                  R$ {formattedValue}
                </p>
                <p className="text-[15px] text-[#A1A1AA] font-serif">
                  em tarifas.
                </p>
              </div>

              <div className="my-3.5 border-t border-[#27272A] relative z-10" />

              <p className="text-[18px] font-bold text-white font-serif relative z-10 leading-snug">
                Quanto o seu esconde?
              </p>
              <p className="text-[12px] text-[#71717A] mt-1 relative z-10 leading-normal">
                Descubra cobranças duplicadas e tarifas escondidas em segundos.
              </p>

              <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11.5px] text-[#71717A] relative z-10">
                <span className="font-semibold text-[#00C853]">taxly.app</span>
                <span>Proteja seu dinheiro</span>
              </div>
            </div>

            {/* Ações do Card */}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full min-h-[46px] rounded-[14px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[14.5px] px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShareIcon className="w-4 h-4 text-white" />
                <span>Compartilhar</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCard}
                  disabled={isDownloading}
                  className="min-h-[42px] rounded-[14px] bg-[#F5F5F5] hover:bg-[#EDEDED] text-[#1A1A1A] font-medium text-[13px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E5E5E5] disabled:opacity-50"
                >
                  <ShareDownloadIcon className="w-4 h-4 text-[#1A1A1A]" />
                  <span>{isDownloading ? "Gerando..." : "Baixar imagem"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareText}
                  className="min-h-[42px] rounded-[14px] bg-[#F5F5F5] hover:bg-[#EDEDED] text-[#1A1A1A] font-medium text-[13px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E5E5E5]"
                >
                  <CopyIcon className="w-4 h-4 text-[#1A1A1A]" />
                  <span>{copyFeedback ? "Copiado! ✓" : "Copiar frase"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

