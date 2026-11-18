"use client";

import { useRef, useState } from "react";
import {
  Copy,
  FileUp,
  Info,
  Landmark,
  Repeat,
  Sparkles,
} from "lucide-react";
import {
  AlertCircleIcon,
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
  hasAnalysis?: boolean;
  isSubscribed?: boolean;
  isLoggedIn?: boolean;
  auditLevel?: number;
  resolvedChargeIds?: string[];
  onToggleChargeResolved?: (chargeId: string, nextResolved: boolean) => void;
  onRequestSignup?: () => void;
  onSaveToVault: () => void;
  onSendAnotherFile: () => void;
  onTriggerFilePicker?: () => void;
  onOpenQuiz?: () => void;
  onUnlockEconomyReport?: () => void;
  isSavingToVault?: boolean;
}

const DEMO_SHOWCASE_ITEMS = [
  {
    id: "demo-1",
    label: "Tarifa de manutenção de conta — R$ 18,90/mês",
    tag: "Estornável",
    Icon: Landmark,
  },
  {
    id: "demo-2",
    label: "Cobrança duplicada no mesmo dia — R$ 29,90",
    tag: "Duplicidade",
    Icon: Copy,
  },
  {
    id: "demo-3",
    label: "Assinatura digital não utilizada — R$ 55,90/mês",
    tag: "Recorrente",
    Icon: Repeat,
  },
];

export function ResultScreen({
  data,
  hasAnalysis = true,
  isSubscribed = false,
  isLoggedIn = false,
  auditLevel = 1,
  resolvedChargeIds = [],
  onToggleChargeResolved,
  onRequestSignup,
  onSaveToVault,
  onSendAnotherFile,
  onTriggerFilePicker,
  onOpenQuiz,
  onUnlockEconomyReport,
  isSavingToVault = false,
}: ResultScreenProps) {
  const [localResolvedIds, setLocalResolvedIds] = useState<string[]>([]);
  const [copiedScriptItemId, setCopiedScriptItemId] = useState<string | null>(
    null
  );

  const isChargeResolved = (id: string) =>
    resolvedChargeIds.includes(id) || localResolvedIds.includes(id);

  const handleToggleResolved = (id: string) => {
    const currentlyResolved = isChargeResolved(id);
    const nextState = !currentlyResolved;
    setLocalResolvedIds((prev) =>
      nextState ? [...prev, id] : prev.filter((item) => item !== id)
    );
    onToggleChargeResolved?.(id, nextState);
  };

  const handleCopyRefundScript = async (item: {
    id: string;
    nomeEstabelecimento: string;
    valorMensal: number;
    data: string;
    tag: string;
  }) => {
    const scriptText = `Olá! Identifiquei na minha fatura/extrato a cobrança "${item.nomeEstabelecimento}" no valor de R$ ${formatBRL(
      item.valorMensal
    )} (${item.data} · ${
      item.tag
    }). Solicito o cancelamento imediato e o estorno integral do valor cobrado, conforme o Código de Defesa do Consumidor (Art. 39 e Art. 42) e normas do Banco Central.`;

    try {
      await navigator.clipboard.writeText(scriptText);
    } catch {
      // Fallback silencioso
    }
    setCopiedScriptItemId(item.id);
    window.setTimeout(() => {
      setCopiedScriptItemId((prev) => (prev === item.id ? null : prev));
    }, 2500);
  };
  const animatedTotal = useCountUp(data.totalAttention, true, 1000);
  const hasTariffs = data.tariffs.length > 0;
  const hasDuplicates = data.duplicates.length > 0;
  const hasFindings = hasTariffs || hasDuplicates;

  // Normaliza a tag específica do problema exatamente para uma das 4 opções exigidas
  const normalizeProblemTag = (rawCategory?: string, rawName?: string): string => {
    const combined = `${rawCategory || ""} ${rawName || ""}`.toLowerCase();
    if (combined.includes("duplic")) return "Cobrança duplicada";
    if (
      combined.includes("tarifa") ||
      combined.includes("juros") ||
      combined.includes("iof") ||
      combined.includes("anuidade") ||
      combined.includes("manuten") ||
      combined.includes("encargo") ||
      combined.includes("taxa")
    ) {
      return "Tarifa bancária";
    }
    if (
      combined.includes("seguro") ||
      combined.includes("opcional") ||
      combined.includes("prote") ||
      combined.includes("clube") ||
      combined.includes("pacote")
    ) {
      return "Serviço opcional";
    }
    return "Renovação recorrente";
  };

  // Categorias reais do extrato vindas da OpenAI
  const catPix = data.resumoCategorias?.pix ?? data.categories?.pix ?? 0;
  const catBoletos =
    data.resumoCategorias?.boletos ?? data.categories?.boletos ?? 0;
  const catDebitos =
    data.resumoCategorias?.debitos ?? data.categories?.debitos ?? 0;

  // Base real de débitos/movimentações para o cálculo de 15% quando o extrato está limpo de tarifas ilegais
  const baseDebitosTotal =
    catDebitos > 0 ? catDebitos : catPix + catBoletos > 0 ? catPix + catBoletos : 0;

  // 15% real dos débitos identificados
  const calculated15Percent = Number((baseDebitosTotal * 0.15).toFixed(2));

  // Constrói a lista unificada real de itens encontrados pela API
  const rawOpportunities =
    data.itensOportunidade && data.itensOportunidade.length > 0
      ? data.itensOportunidade.map((op, idx) => ({
          id: `op-${idx + 1}`,
          tag: normalizeProblemTag(op.categoria, op.nomeEstabelecimento),
          data: op.data || "Recente",
          nomeEstabelecimento: op.nomeEstabelecimento,
          valorMensal: op.valorMensal,
          custoAnual: Number((op.valorMensal * 12).toFixed(2)),
        }))
      : [
          ...data.tariffs.map((t, idx) => ({
            id: `tar-${idx + 1}`,
            tag: normalizeProblemTag("Tarifa bancária", t.name),
            data: "Neste ciclo",
            nomeEstabelecimento: t.name,
            valorMensal: t.amount,
            custoAnual: Number((t.amount * 12).toFixed(2)),
          })),
          ...data.duplicates.map((d, idx) => ({
            id: `dup-${idx + 1}`,
            tag: "Cobrança duplicada",
            data: d.date || "Neste ciclo",
            nomeEstabelecimento: d.merchant,
            valorMensal: d.amount,
            custoAnual: Number((d.amount * 12).toFixed(2)),
          })),
        ];

  // Adiciona duplicidade da OpenAI se encontrada e ainda não listada em rawOpportunities
  if (
    data.possivelDuplicidade?.encontrada &&
    data.possivelDuplicidade.nomeEstabelecimento &&
    data.possivelDuplicidade.valor > 0
  ) {
    const dupExists = rawOpportunities.some(
      (item) =>
        item.nomeEstabelecimento.toLowerCase() ===
          data.possivelDuplicidade?.nomeEstabelecimento.toLowerCase() &&
        Math.abs(item.valorMensal - (data.possivelDuplicidade?.valor ?? 0)) <
          0.01
    );
    if (!dupExists) {
      rawOpportunities.push({
        id: "dup-openai-1",
        tag: "Cobrança duplicada",
        data: data.possivelDuplicidade.data || "Neste ciclo",
        nomeEstabelecimento: data.possivelDuplicidade.nomeEstabelecimento,
        valorMensal: data.possivelDuplicidade.valor,
        custoAnual: Number((data.possivelDuplicidade.valor * 12).toFixed(2)),
      });
    }
  }

  // Coerência matemática: nunca listar mais itens suspeitos do que totalTransacoes
  const maxAllowedItems =
    data.totalTransacoes && data.totalTransacoes > 0
      ? data.totalTransacoes
      : rawOpportunities.length;

  const listedItems = rawOpportunities.slice(0, Math.max(1, maxAllowedItems));

  // Total de transações nunca menor que a quantidade de itens listados
  const totalTxCount =
    data.totalTransacoes && data.totalTransacoes > 0
      ? Math.max(data.totalTransacoes, listedItems.length)
      : Math.max(1, listedItems.length);

  // Selo vermelho sempre igual à quantidade real de itens listados e nunca maior que totalTransacoes
  const suspiciousCount = listedItems.length;

  const effectiveEconomyList: EconomyItem[] = listedItems.map((item) => ({
    id: item.id,
    name: item.nomeEstabelecimento,
    monthlyAmount: item.valorMensal,
    yearlyImpact: item.custoAnual,
    actionTip:
      item.tag === "Tarifa bancária" || item.tag === "Cobrança duplicada"
        ? "Pedir estorno ao banco"
        : "Cancelar cobrança no app",
    category: item.tag,
  }));

  const opportunitiesMonthlySum = Number(
    listedItems
      .reduce((acc, item) => acc + item.valorMensal, 0)
      .toFixed(2)
  );

  const monthlyIdentified =
    opportunitiesMonthlySum > 0
      ? opportunitiesMonthlySum
      : data.totalAttention > 0
        ? data.totalAttention
        : data.tarifaAmostraGratis?.valor && data.tarifaAmostraGratis.valor > 0
          ? data.tarifaAmostraGratis.valor
          : calculated15Percent;

  const annualIdentified = Number((monthlyIdentified * 12).toFixed(2));

  const suspiciousFindingValue =
    opportunitiesMonthlySum > 0
      ? opportunitiesMonthlySum
      : data.totalAttention > 0
        ? animatedTotal
        : monthlyIdentified;

  const formattedSuspiciousValue = formatBRL(suspiciousFindingValue);
  const formattedMonthlyIdentified = formatBRL(monthlyIdentified);
  const formattedAnnualIdentified = formatBRL(annualIdentified);

  const freeSampleTariff =
    data.tarifaAmostraGratis &&
    data.tarifaAmostraGratis.nome &&
    data.tarifaAmostraGratis.valor > 0
      ? {
          id: "tarifa-sample-free",
          name: data.tarifaAmostraGratis.nome,
          amount: data.tarifaAmostraGratis.valor,
        }
      : data.tariffs[0] || null;

  const hiddenTariffsCount = Math.max(
    0,
    listedItems.length - (freeSampleTariff ? 1 : 0)
  );

  const hiddenTariffsSum = Number(
    Math.max(
      0,
      monthlyIdentified - (freeSampleTariff ? freeSampleTariff.amount : 0)
    ).toFixed(2)
  );

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

  const hasActualAnalysis = hasAnalysis && Boolean(data.fileName);

  if (!hasActualAnalysis) {
    return (
      <section
        aria-label="Vitrine de demonstração de auditoria"
        className="mx-[-24px] mt-[-12px] px-6 pt-3 pb-36 bg-[#F6F5F1] text-[#18181B] text-left min-h-[calc(100dvh-70px)]"
      >
        {/* 1. Badge superior discreta */}
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white border border-black/[0.06] px-3 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <Sparkles
            size={13}
            strokeWidth={1.5}
            className="text-[#0F9D58] shrink-0"
          />
          <span className="text-[10.5px] font-medium uppercase tracking-[0.04em] text-[#18181B]">
            EXEMPLO DE AUDITORIA · VEJA O QUE O TAXLY ENCONTRA
          </span>
        </div>

        {/* 2. Card de Demonstração Realista */}
        <div className="mt-4 rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <h1 className="text-[20px] sm:text-[22px] leading-[1.2] tracking-[-0.03em] font-medium text-[#18181B] tabular-nums">
            Em média, encontramos{" "}
            <span className="text-[#0F9D58]">
              R$ 181,00/mês (R$ 2.172,00/ano)
            </span>{" "}
            escondidos na 1ª fatura.
          </h1>

          <div className="mt-4 pt-4 border-t border-black/[0.06] space-y-2.5">
            {DEMO_SHOWCASE_ITEMS.map(({ id, label, tag, Icon }) => (
              <div
                key={id}
                className="rounded-xl bg-[#F6F5F1] border border-black/[0.06] px-3.5 py-3 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-white border border-black/[0.06] flex items-center justify-center shrink-0 text-[#0F9D58]">
                    <Icon size={14} strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-[#18181B] leading-snug tabular-nums">
                    {label}
                  </span>
                </div>

                <span className="whitespace-nowrap px-2 py-0.5 rounded-md bg-white border border-black/[0.06] text-[11px] font-medium text-[#0F9D58] shrink-0">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Chamada direta para ação (sem precisar voltar para a Home) */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onTriggerFilePicker || onSendAnotherFile}
            className="w-full bg-[#0F9D58] hover:bg-[#0B8043] text-white py-3.5 px-4 rounded-xl font-medium text-[14.5px] tracking-[-0.02em] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
          >
            <FileUp size={16} strokeWidth={1.5} />
            <span>Enviar print ou PDF da minha fatura (Grátis)</span>
          </button>

          {onOpenQuiz && (
            <button
              type="button"
              onClick={onOpenQuiz}
              className="block mx-auto mt-3 text-xs text-[#8A8985] hover:text-[#18181B] transition-colors cursor-pointer"
            >
              Sem o arquivo agora? Simular perda em 10 segundos →
            </button>
          )}
        </div>

        {/* 4. Dica rápida de baixa fricção */}
        <div className="mt-5 rounded-xl bg-white border border-black/[0.06] p-3.5 flex items-start gap-2.5">
          <Info
            size={15}
            strokeWidth={1.5}
            className="text-[#0F9D58] shrink-0 mt-0.5"
          />
          <p className="text-[12.5px] leading-relaxed text-[#52525B]">
            Dica: basta tirar um print da fatura aberta no app do seu banco —
            leva menos de 10 segundos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Resultado da análise"
      className="pt-1 pb-36 text-left"
    >
      {/* Barra superior de assinante: exibida APENAS se isSubscribed === true */}
      {isSubscribed && (
        <aside
          aria-label="Status do plano de assinatura"
          className="mb-4 rounded-[12px] bg-[#08B968]/10 border border-[#08B968]/25 px-4 py-2.5 text-[13px] font-medium text-[#087D4A] flex items-center gap-2"
        >
          <CheckIcon className="w-4 h-4 shrink-0 text-[#08B968]" />
          <span>Plano Mensal ativado! Análise completa desbloqueada.</span>
        </aside>
      )}

      {/* Condicional: Resultado Limpo vs Resultado com Achado Suspeito */}
      {data.isClean ? (
        /* ESTADO LIMPO */
            <header className="rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 text-center">
              <div className="relative mx-auto w-12 h-12 flex items-center justify-center mb-3">
                <div
                  aria-hidden="true"
                  className="relative w-12 h-12 rounded-full bg-[#08B968]/10 text-[#08B968] flex items-center justify-center"
                >
                  <CheckIcon className="w-6 h-6" />
                </div>
              </div>

                <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.025em] text-[#171717] leading-tight">
                  0 tarifas ilegais hoje, mas identificamos R$ {formatBRL(calculated15Percent)}/mês em gastos otimizáveis.
                </h1>

                    <div className="mt-3.5 p-3.5 rounded-[12px] bg-[#E54848]/[0.06] border border-[#E54848]/20 text-left">
                      <p className="text-[13px] leading-relaxed text-[#E54848] font-normal">
                        Mesmo sem taxas bancárias duplicadas, até 15% dos seus R$ {formatBRL(baseDebitosTotal)} em débitos estão indo para cobranças silenciosas e micro-gastos recorrentes.
                      </p>
                    </div>
                  </header>
                  ) : (
                        /* ESTADO COM TRANSAÇÃO SUSPEITA */
                        <header className="rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] p-5 text-left">
                          {/* Badge de alerta no topo */}
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E54848]/[0.08] border border-[#E54848]/20 px-2.5 py-1">
                            <AlertCircleIcon className="w-3.5 h-3.5 text-[#E54848] shrink-0" />
                            <span className="text-[12px] font-medium text-[#E54848]">
                              {suspiciousCount} {suspiciousCount === 1 ? "cobrança suspeita detectada" : "cobranças suspeitas detectadas"}
                            </span>
                          </div>

                            {/* Título principal e valor identificado com alto destaque */}
                            <h1 className="mt-3.5 text-[16.5px] sm:text-[18px] font-semibold text-[#171717] leading-[1.35] tracking-[-0.02em]">
                              Analisamos {totalTxCount} {totalTxCount === 1 ? "transação" : "transações"}. Identificamos{" "}
                                <span className="text-[#E54848] font-semibold tabular-nums text-[19px] sm:text-[21px] tracking-[-0.03em]">
                                  R$ {formattedMonthlyIdentified}/mês
                                </span>{" "}
                                <span className="text-[#171717] font-semibold tabular-nums">
                                  (R$ {formattedAnnualIdentified}/ano)
                                </span>{" "}
                                <span className="text-[#858585] font-normal">
                                  em cobranças indevidas e recorrentes.
                                </span>
                            </h1>

                            {/* Seção condicional: Grátis (plan_status !== 'active') vs Assinante (plan_status === 'active') */}
                            {!isSubscribed ? (
                              /* ESTADO GRÁTIS: 1ª cobrança desbloqueada + demais com blur + CTA R$ 14,99/mês */
                                <div className="mt-4 pt-3.5 border-t border-black/[0.06] text-left">
                                  <div className="rounded-xl bg-[#F6F5F1] border border-black/[0.06] p-3.5 text-left">
                                    <div className="divide-y divide-black/[0.06]">
                                      {listedItems.map((item, idx) => {
                                        const isFirstUnlocked = idx === 0;
                                        const merchantNameClass = isFirstUnlocked
                                          ? "mt-1 text-[13.5px] font-medium text-[#18181B] truncate"
                                          : "mt-1 text-[13.5px] font-medium text-[#18181B] truncate filter blur-[5px] select-none pointer-events-none";

                                        return (
                                          <div
                                            key={item.id}
                                            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0 text-left"
                                          >
                                            <div className="min-w-0 flex-1 pr-2">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="inline-flex items-center rounded-md bg-white border border-black/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#18181B]">
                                                  {item.tag}
                                                </span>
                                                <span className="text-[11px] text-[#8A8985] tabular-nums">
                                                  {item.data}
                                                </span>
                                                {isFirstUnlocked && (
                                                  <span className="inline-flex items-center rounded-full bg-[#0F9D58]/10 px-2 py-0.5 text-[10px] font-medium text-[#0F9D58]">
                                                    1ª liberada
                                                  </span>
                                                )}
                                              </div>
                                              <p className={merchantNameClass}>
                                                {item.nomeEstabelecimento}
                                              </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className="text-[13.5px] font-semibold text-[#E54848] tabular-nums whitespace-nowrap">
                                                R$ {formatBRL(item.valorMensal)}/mês
                                              </p>
                                              <p className="text-[11px] text-[#8A8985] tabular-nums whitespace-nowrap">
                                                R$ {formatBRL(item.custoAnual)}/ano
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Botão de desbloqueio direto: Desbloquear todas as cobranças · R$ 14,99/mês */}
                                    <button
                                      type="button"
                                      onClick={onUnlockEconomyReport || onSaveToVault}
                                      className="w-full mt-3.5 min-h-[46px] rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white text-[13.5px] font-medium py-3 px-4 flex items-center justify-center gap-2 transition-all cursor-pointer text-center leading-snug shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
                                    >
                                      <LockSmallIcon className="w-3.5 h-3.5 text-white shrink-0" />
                                      <span>
                                        Desbloquear todas as cobranças · R$ 14,99/mês
                                      </span>
                                    </button>
                                  </div>

                                  {!isLoggedIn && onRequestSignup && (
                                    <div className="mt-3 rounded-xl bg-[#F6F5F1] border border-black/[0.06] px-3.5 py-2.5 flex items-center justify-between gap-2">
                                      <span className="text-[12px] text-[#52525B]">
                                        Salve esta auditoria no seu Histórico de Faturas:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={onRequestSignup}
                                        className="text-[12px] font-medium text-[#0F9D58] hover:underline whitespace-nowrap cursor-pointer"
                                      >
                                        Criar conta grátis →
                                      </button>
                                    </div>
                                  )}
                                </div>
                            ) : (
                              /* ESTADO DESBLOQUEADO (ASSINANTE: plan_status === 'active') */
                                <div className="mt-4 pt-3.5 border-t border-black/[0.06] text-left">
                                  <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-[13.5px] font-semibold text-[#18181B]">
                                      Relatório de Economia Desbloqueado
                                    </h2>
                                    <span className="text-[11.5px] font-medium text-[#0F9D58] bg-[#0F9D58]/10 px-2.5 py-0.5 rounded-full tabular-nums">
                                      Economia de R$ {formattedMonthlyIdentified}/mês
                                    </span>
                                  </div>

                                  <ul className="space-y-2.5">
                                    {listedItems.map((item) => {
                                      const resolved = isChargeResolved(item.id);
                                      const isCopied =
                                        copiedScriptItemId === item.id;
                                      const cardClass = resolved
                                        ? "rounded-xl bg-[#0F9D58]/[0.05] border border-[#0F9D58]/30 p-3.5 text-left transition-all"
                                        : "rounded-xl bg-[#F6F5F1] border border-black/[0.06] p-3.5 text-left transition-all";
                                      const resolveBtnClass = resolved
                                        ? "flex-1 min-h-[34px] rounded-lg bg-[#0F9D58] text-white text-[12px] font-medium px-2.5 py-1.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                        : "flex-1 min-h-[34px] rounded-lg bg-white hover:bg-black/[0.03] border border-black/[0.08] text-[#18181B] text-[12px] font-medium px-2.5 py-1.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer";

                                      return (
                                        <li key={item.id} className={cardClass}>
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="inline-flex items-center rounded-md bg-white border border-black/[0.06] px-2 py-0.5 text-[11px] font-medium text-[#18181B]">
                                                  {item.tag}
                                                </span>
                                                <span className="text-[11px] text-[#8A8985] tabular-nums">
                                                  {item.data}
                                                </span>
                                                {resolved && (
                                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#0F9D58]/15 px-2 py-0.5 text-[10.5px] font-medium text-[#0F9D58]">
                                                    <CheckIcon className="w-2.5 h-2.5" />
                                                    Estornado / Resolvido
                                                  </span>
                                                )}
                                              </div>
                                              <p className="mt-1.5 text-[14px] font-medium text-[#18181B]">
                                                {item.nomeEstabelecimento}
                                              </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <p className="text-[14px] font-semibold text-[#E54848] tabular-nums whitespace-nowrap">
                                                R$ {formatBRL(item.valorMensal)}/mês
                                              </p>
                                              <p className="text-[11px] text-[#8A8985] tabular-nums whitespace-nowrap">
                                                R$ {formatBRL(item.custoAnual)}/ano
                                              </p>
                                            </div>
                                          </div>

                                          {/* Botões de ação do assinante: Marcar como Estornado/Resolvido + Copiar texto de pedido de estorno */}
                                          <div className="mt-3 pt-2.5 border-t border-black/[0.06] flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleToggleResolved(item.id)
                                              }
                                              className={resolveBtnClass}
                                            >
                                              <CheckIcon className="w-3.5 h-3.5 shrink-0" />
                                              <span>
                                                {resolved
                                                  ? "Estornado/Resolvido"
                                                  : "Marcar Estornado/Resolvido"}
                                              </span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleCopyRefundScript(item)
                                              }
                                              className="flex-1 min-h-[34px] rounded-lg bg-white hover:bg-black/[0.03] border border-black/[0.08] text-[#18181B] text-[12px] font-medium px-2.5 py-1.5 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                            >
                                              <CopyIcon className="w-3.5 h-3.5 text-[#0F9D58] shrink-0" />
                                              <span>
                                                {isCopied
                                                  ? "Texto copiado!"
                                                  : "Copiar pedido de estorno"}
                                              </span>
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                            )}
                                                            </header>
      )}

                                                            {/* Barra de Progressão em Níveis */}
                                                            <AuditLevelBar
                                                              currentLevel={auditLevel}
                                                              isSubscribed={isSubscribed}
                                                              onSendAnother={onSendAnotherFile}
                                                              onUnlockFull={onUnlockEconomyReport}
                                                              className="mt-4"
                                                            />

                                                            {/* Bloco 1 — Tarifas encontradas (se houver) */}
                                                            {(hasTariffs || freeSampleTariff) && (
                                                                  <div className="mt-4 rounded-[16px] bg-white border border-[#EAEAE7] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                                    <h2 className="text-[14px] font-semibold text-[#171717]">
                                                                      Tarifas identificadas
                                                                    </h2>

                                                                      <ul className="mt-3 divide-y divide-[#EAEAE7] border-t border-[#EAEAE7]">
                                                                        {(!isSubscribed
                                                                          ? freeSampleTariff
                                                                            ? [freeSampleTariff]
                                                                            : data.tariffs.slice(0, 1)
                                                                          : data.tariffs
                                                                        ).map((item) => (
                                                                          <li
                                                                            key={item.id}
                                                                            className="py-3 flex items-center justify-between gap-3"
                                                                          >
                                                                              <span className="text-[14px] font-normal text-[#171717]">
                                                                                {item.name}
                                                                              </span>
                                                                                <span className="text-[14px] font-semibold text-[#E54848] tabular-nums shrink-0">
                                                                                  R$ {formatBRL(item.amount)}
                                                                                </span>
                                                                              </li>
            ))}
                                                                              {!isSubscribed && hiddenTariffsCount > 0 && (
                                                                                <li
                                                                                  onClick={onUnlockEconomyReport || onSaveToVault}
                                                                                  className="py-3 flex items-center justify-between gap-3 cursor-pointer group"
                                                                                >
                                                                                  <div className="flex items-center gap-2 min-w-0">
                                                                                      <LockSmallIcon className="w-3.5 h-3.5 text-[#858585] shrink-0" />
                                                                                      <span className="text-[13.5px] font-medium text-[#171717] group-hover:text-[#08B968] transition-colors">
                                                                                        + {hiddenTariffsCount} {hiddenTariffsCount === 1 ? "cobrança recorrente oculta" : "cobranças recorrentes ocultas"}
                                                                                      </span>
                                                                                  </div>
                                                                                    <span className="text-[14px] font-semibold text-[#E54848] tabular-nums shrink-0">
                                                                                      (R$ {formatBRL(hiddenTariffsSum)}/mês)
                                                                                    </span>
                                                                                </li>
                                                                              )}
                                                                            </ul>
                                                                          </div>
                                                                        )}

                                                                        {/* Bloco 2 — Possíveis duplicidades (se houver) */}
                                                                        {hasDuplicates && (
                                                                              <div className="mt-4 rounded-[16px] bg-white border border-[#EAEAE7] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                                                <h2 className="text-[14px] font-semibold text-[#171717]">
                                                                                  Possíveis cobranças repetidas
                                                                                </h2>

                                                                                  <div className="mt-3 space-y-2.5">
                                                                                    {data.duplicates.map((dup) => (
                                                                                      <div
                                                                                        key={dup.id}
                                                                                        className="rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] p-3.5"
                                                                                      >
                                                                                        <div className="flex items-start justify-between gap-2.5">
                                                                                          <div className="min-w-0">
                                                                                              <p className="text-[14px] font-semibold text-[#171717] truncate">
                                                                                                {!isSubscribed ? (
                        <span className="filter blur-[4px] select-none pointer-events-none opacity-75">
                          {dup.merchant}
                        </span>
                      ) : (
                        dup.merchant
                      )}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#858585]">
                      {dup.date}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E54848]/[0.08] border border-[#E54848]/20 px-2.5 py-0.5 text-[11px] font-medium text-[#E54848] shrink-0">
                    duplicidade
                  </span>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-[#EAEAE7] flex items-center justify-between">
                  <span className="text-[12.5px] text-[#858585]">
                    Cobrado {dup.occurrences}x no mesmo dia
                  </span>
                  <span className="text-[14px] font-semibold text-[#171717] tabular-nums">
                    R$ {formatBRL(dup.amount)}
                  </span>
                </div>
              </div>
                                                                                                ))}
                                                                                              </div>
                                                                                          </div>
      )}

                                                                                          {/* Bloco 3 — Resumo por categoria */}
                                                                                              <div className="mt-4 rounded-[16px] bg-white border border-[#EAEAE7] p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                                                                <h2 className="text-[14px] font-semibold text-[#171717]">
                                                                                                  Resumo por categoria
                                                                                                </h2>

                                                                                                      <div className="mt-3 divide-y divide-[#EAEAE7] border-t border-[#EAEAE7]">
                                                                                                        <div className="py-2.5 flex items-center justify-between text-[14px]">
                                                                                                          <span className="font-normal text-[#858585]">PIX</span>
                                                                                                          <span className="font-semibold text-[#171717] tabular-nums">
                                                                                                            R$ {formatBRL(catPix)}
                                                                                                          </span>
                                                                                                        </div>
                                                                                                            <div className="py-2.5 flex items-center justify-between text-[14px]">
                                                                                                              <span className="font-normal text-[#858585]">Boletos</span>
                                                                                                              <span className="font-semibold text-[#171717] tabular-nums">
                                                                                                                R$ {formatBRL(catBoletos)}
                                                                                                              </span>
                                                                                                            </div>
                                                                                                                <div className="py-2.5 flex items-center justify-between text-[14px]">
                                                                                                                  <span className="font-normal text-[#858585]">Débitos</span>
                                                                                                                  <span className="font-semibold text-[#171717] tabular-nums">
                                                                                                                    R$ {formatBRL(catDebitos)}
                                                                                                                  </span>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        {/* Faixa Rotativa de Prova Social */}
                                                                                                        {!isSubscribed && (
                                                                                                            <div className="mt-4">
                                                                                                              <SocialProofTicker />
                                                                                                            </div>
      )}

                                                                                                            {/* Rodapé de Ações */}
                                                                                                            <div className="mt-4 space-y-2.5">
                                                                                                              {/* Botão Verde Principal */}
                                                                                                              {data.isClean ? (
                                                                                                                <div>
                                                                                                                  <button
                                                                                                                    type="button"
                                                                                                                    onClick={onUnlockEconomyReport || onSaveToVault}
                                                                                                                    className="w-full min-h-[50px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-[0_2px_8px_rgba(8,185,104,0.22)]"
                                                                                                                  >
                                                                                                                    <span>Desbloquear raio-x de gastos (R$ {formatBRL(calculated15Percent)}/mês)</span>
                                                                                                                  </button>
                                                                                                                    <p className="mt-2 text-center text-[11.5px] text-[#858585] font-normal">
                                                                                                                      Acesso imediato por R$ 14,99/mês · Cancele quando quiser
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                              ) : isSubscribed ? (
                                                                                                                <button
                                                                                                                  type="button"
                                                                                                                  onClick={onSaveToVault}
                                                                                                                  disabled={isSavingToVault}
                                                                                                                  className="w-full min-h-[50px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-[0_2px_8px_rgba(8,185,104,0.22)]"
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
                                                                                                                    className="w-full min-h-[50px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[15px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60 shadow-[0_2px_8px_rgba(8,185,104,0.22)]"
                                                                                                                  >
                                                                                                                    <span>Recuperar meus R$ {formattedMonthlyIdentified}/mês agora</span>
                                                                                                                  </button>
                                                                                                                    <p className="mt-2 text-center text-[11.5px] text-[#858585] font-normal">
                                                                                                                      Acesso imediato por R$ 14,99/mês (Recupere até 12x o valor no 1º mês) · Cancele quando quiser
                                                                                                                    </p>
                                                                                                                </div>
                                                                                                              )}

                                                                                                              {/* Analisar Fatura Completa */}
                                                                                                              <button
                                                                                                                type="button"
                                                                                                                onClick={onSendAnotherFile}
                                                                                                                className="w-full min-h-[46px] rounded-[14px] bg-white hover:bg-[#F5F5F2] text-[#171717] text-[13.5px] font-medium px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#EAEAE7]"
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
                                                                                                                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-200"
                                                                                                                onClick={() => setIsShareModalOpen(false)}
                                                                                                              >
                                                                                                                <div
                                                                                                                  className="w-full max-w-[390px] rounded-[20px] bg-white p-5 shadow-2xl relative text-left border border-[#EAEAE7]"
                                                                                                                  onClick={(e) => e.stopPropagation()}
                                                                                                                >
                                                                                                                  {/* Header do Modal */}
                                                                                                                    <div className="flex items-center justify-between pb-3 border-b border-[#EAEAE7]">
                                                                                                                      <div className="flex items-center gap-2">
                                                                                                                        <span className="w-2 h-2 rounded-full bg-[#08B968]" />
                                                                                                                        <h3
                                                                                                                          id="share-modal-title"
                                                                                                                          className="text-[14.5px] font-semibold text-[#171717]"
                                                                                                                        >
                                                                                                                          Card de Diagnóstico Parcial
                                                                                                                        </h3>
                                                                                                                      </div>
                                                                                                                      <button
                                                                                                                        type="button"
                                                                                                                        aria-label="Fechar"
                                                                                                                        onClick={() => setIsShareModalOpen(false)}
                                                                                                                        className="w-7 h-7 rounded-full bg-[#F5F5F2] hover:bg-[#EAEAE7] text-[#858585] flex items-center justify-center transition-colors cursor-pointer"
                                                                                                                      >
                                                                                                                        <CloseIcon className="w-3.5 h-3.5" />
                                                                                                                      </button>
                                                                                                                    </div>

                                                                                                                    {/* Preview do Card Dark Premium */}
                                                                                                                      <div className="mt-4 rounded-[16px] bg-[#171717] p-5 border border-[#27272A] text-left relative overflow-hidden select-none">
                                                                                                                        <div className="flex items-center justify-between relative z-10">
                                                                                                                          <div className="flex items-center gap-2">
                                                                                                                              <div className="w-7 h-7 rounded-[8px] bg-[#08B968] text-white font-semibold flex items-center justify-center text-[15px]">
                                                                                                                                t
                                                                                                                              </div>
                                                                                                                                <span className="font-semibold text-[16px] text-white tracking-tight">
                                                                                                                                  taxly
                                                                                                                                </span>
                                                                                                                            </div>
                                                                                                                              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[#08B968]">
                                                                                                                                Diagnóstico Parcial
                                                                                                                              </span>
                                                                                                                          </div>

                                                                                                                          <div className="mt-6 relative z-10">
                                                                                                                              <p className="text-[12px] text-[#858585]">
                                                                                                                                Cobranças suspeitas detectadas
                                                                                                                              </p>
                                                                                                                                <p className="mt-1 text-[34px] font-semibold text-[#E54848] tracking-[-0.03em] leading-none tabular-nums">
                                                                                                                                  R$ 181,00/mês
                                                                                                                                </p>
                                                                                                                                  <p className="mt-1.5 text-[12px] text-[#858585]">
                                                                                                                                    6 cobranças suspeitas detectadas
                                                                                                                                  </p>
                                                                                                                                </div>

                                                                                                                                    <div className="mt-5 pt-3.5 border-t border-white/10 relative z-10">
                                                                                                                                      <p className="text-[13px] font-semibold text-white leading-tight">
                                                                                                                                        Quanto o seu extrato esconde?
                                                                                                                                      </p>
                                                                                                                                        <p className="mt-0.5 text-[11.5px] text-[#858585]">
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
                                                                                                                                    className="w-full min-h-[44px] rounded-[12px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[13.5px] px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                                                                                                  >
                                                                                                                                    <ShareIcon className="w-4 h-4 text-white shrink-0" />
                                                                                                                                    <span>Compartilhar Card no WhatsApp / Stories</span>
                                                                                                                                  </button>

                                                                                                                                  <div className="grid grid-cols-2 gap-2">
                                                                                                                                    <button
                                                                                                                                      type="button"
                                                                                                                                      onClick={handleDownloadCard}
                                                                                                                                      disabled={isDownloading}
                                                                                                                                      className="min-h-[38px] rounded-[10px] bg-[#F5F5F2] hover:bg-[#EAEAE7] text-[#171717] font-medium text-[12.5px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#EAEAE7]"
                                                                                                                                    >
                                                                                                                                      <ShareDownloadIcon className="w-3.5 h-3.5 text-[#171717] shrink-0" />
                                                                                                                                      <span>{isDownloading ? "Gerando..." : "Baixar imagem"}</span>
                                                                                                                                    </button>

                                                                                                                                    <button
                                                                                                                                      type="button"
                                                                                                                                      onClick={handleCopyShareText}
                                                                                                                                      className="min-h-[38px] rounded-[10px] bg-[#F5F5F2] hover:bg-[#EAEAE7] text-[#171717] font-medium text-[12.5px] px-3 flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#EAEAE7]"
                                                                                                                                    >
                                                                                                                                      <CopyIcon className="w-3.5 h-3.5 text-[#171717] shrink-0" />
                                                                                                                                      <span>{copyFeedback ? "Copiado!" : "Copiar texto"}</span>
                                                                                                                                    </button>
                                                                                                                                  </div>
                                                                                                                                </div>
                                                                                                                              </div>
                                                                                                                          </div>
      )}
                                                                                                                        </section>
                                                                                                                        );
}
