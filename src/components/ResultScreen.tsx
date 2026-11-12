"use client";

import { useRef, useState } from "react";
import {
  CheckIcon,
  CloseIcon,
  CopyIcon,
  ShareDownloadIcon,
  ShareIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { formatBRL } from "@/data/charges";
import { AnalysisSummaryData } from "@/lib/detect-charges";
import { useCountUp } from "@/lib/use-count-up";

interface ResultScreenProps {
  data: AnalysisSummaryData;
  onSaveToVault: () => void;
  onSendAnotherFile: () => void;
  isSavingToVault?: boolean;
}

export function ResultScreen({
  data,
  onSaveToVault,
  onSendAnotherFile,
  isSavingToVault = false,
}: ResultScreenProps) {
  const animatedTotal = useCountUp(data.totalAttention, true, 1000);
  const hasTariffs = data.tariffs.length > 0;
  const hasDuplicates = data.duplicates.length > 0;
  const hasFindings = hasTariffs || hasDuplicates;

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const formattedValue = formatBRL(data.totalAttention);
  const shareHeadline = `Meu extrato escondia R$ ${formattedValue} em tarifas. Quanto o seu esconde?`;
  const shareFullText = `${shareHeadline} Descubra no taxly`;

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
      ctx.roundRect(700, 104, 280, 68, 34);
      ctx.fill();
    }
    ctx.fillStyle = "#00C853";
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✓ Análise de extrato", 840, 138);

    // Textos principais
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#A1A1AA";
    ctx.font = "400 48px Georgia, 'New York', serif";
    ctx.fillText("Meu extrato escondia", 100, 380);

    // Valor GRANDE R$ 42,30 em verde #00C853
    ctx.fillStyle = "#00C853";
    ctx.font = "bold 112px Georgia, 'New York', serif";
    ctx.fillText(`R$ ${formattedValue}`, 100, 495);

    ctx.fillStyle = "#A1A1AA";
    ctx.font = "400 48px Georgia, 'New York', serif";
    ctx.fillText("em tarifas.", 100, 570);

    // Linha divisória
    ctx.strokeStyle = "#27272A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, 635);
    ctx.lineTo(980, 635);
    ctx.stroke();

    // Pergunta de impacto
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 58px Georgia, 'New York', serif";
    ctx.fillText("Quanto o seu esconde?", 100, 730);

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
    ctx.fillText("Proteja seu dinheiro", 980, 955);

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
      style={{ paddingBottom: "140px" }}
      className="pt-1 text-left pb-[140px]"
    >
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
        /* Estado positivo quando nada for encontrado */
        <header className="rounded-[20px] bg-[#FAFAFA] border border-[#EAEAEA] p-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto w-12 h-12 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center"
          >
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h1 className="mt-3.5 text-[20px] font-bold text-[#1A1A1A] leading-tight">
            Nenhuma tarifa ou duplicidade encontrada.
          </h1>
          <p className="mt-1.5 text-[14.5px] text-[#00A844] font-medium">
            {data.documentType === "extrato"
              ? "Seu extrato está limpo."
              : "Sua fatura está limpa."}
          </p>
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
        {/* Botão Salvar no Cofre */}
        <button
          type="button"
          onClick={onSaveToVault}
          disabled={isSavingToVault}
          className="w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] px-5 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-60"
        >
          {isSavingToVault ? "Salvando no Cofre..." : "Salvar no Cofre"}
        </button>

        {/* Botão Contar pra alguém */}
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="w-full min-h-[48px] rounded-[16px] bg-[#F5F5F5] hover:bg-[#EDEDED] active:bg-[#E5E5E5] text-[#1A1A1A] font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#E5E5E5]"
        >
          <ShareIcon className="w-4 h-4 text-[#1A1A1A]" />
          <span>Contar pra alguém</span>
        </button>

        {/* Link Enviar outro arquivo */}
        <button
          type="button"
          onClick={onSendAnotherFile}
          className="w-full py-2.5 text-center text-[14px] font-medium text-[#6B7280] hover:text-[#1A1A1A] underline underline-offset-4 transition-colors cursor-pointer"
        >
          Enviar outro arquivo
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
                Card de compartilhamento
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

