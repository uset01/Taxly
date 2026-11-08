"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  DocumentScannerIcon,
  ShieldCheckIcon,
  UploadIcon,
} from "@/components/icons";
import { Charge } from "@/data/charges";
import {
  AnalysisStageId,
  InvoiceAnalysisError,
  analyzeInvoice,
} from "@/lib/analyze-invoice";

export type ScreenState = "empty" | "analyzing" | "result";

const BENEFITS = [
  "Resultado em 15 segundos",
  "Acha cobranças duplicadas e taxas escondidas",
  "Mostra como cancelar, passo a passo",
];

const ANALYSIS_STEPS: { id: AnalysisStageId; label: string }[] = [
  { id: "reading", label: "Lendo documento…" },
  { id: "masking", label: "Mascarando seus dados…" },
  { id: "identifying", label: "Identificando assinaturas…" },
  { id: "duplicates", label: "Procurando duplicadas e taxas…" },
];

export function HomeScreen() {
  const userName = "Davi";
  const [screenState, setScreenState] = useState<ScreenState>("empty");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [currentStage, setCurrentStage] = useState<AnalysisStageId>("reading");
  const [completedStages, setCompletedStages] = useState<AnalysisStageId[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rola para o topo sempre que mudar de estado para evitar salto visual
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screenState]);

  const handleStartAnalysis = async (file: File) => {
    setSelectedFileName(file.name);
    setAnalysisError(null);
    setCurrentStage("reading");
    setCompletedStages([]);
    setAnalysisProgress(10);
    setScreenState("analyzing");

    try {
      const result = await analyzeInvoice(file, (update) => {
        setCurrentStage(update.stage);
        setCompletedStages(update.completedStages);
        setAnalysisProgress(update.progressPercent);
      });
      setCharges(result.charges);
      setScreenState("result");
    } catch (err) {
      if (err instanceof InvoiceAnalysisError) {
        setAnalysisError(err.message);
      } else {
        setAnalysisError(
          "Verifique se o arquivo é um PDF, PNG ou JPG legível e tente novamente."
        );
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleStartAnalysis(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleStartAnalysis(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#161A18] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F8F7F3] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] relative">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 bg-[#F8F7F3]/95 backdrop-blur-md border-b border-[#EAE8E2] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              role="img"
              aria-label="Escudo de proteção VazamentoZero"
              className="w-[38px] h-[38px] rounded-[12px] bg-[#FAF9F6] border border-[#E5E3DD] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#181B19]"
            >
              <ShieldCheckIcon className="w-[19px] h-[19px]" />
            </div>
            <span className="text-[18px] tracking-[-0.025em] leading-none select-none">
              <strong className="font-semibold text-[#181B19]">Vazamento</strong>
              <span className="font-semibold text-[#3B6B56]">Zero</span>
            </span>
          </div>

          <button
            type="button"
            aria-label="Abrir menu da conta de Davi (DM)"
            className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] rounded-full bg-[#1B1D1B] text-white text-[13px] font-bold tracking-wide flex items-center justify-center hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] transition-opacity cursor-pointer"
          >
            DM
          </button>
        </header>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*,.heic"
          aria-label="Selecionar arquivo de fatura em PDF, imagem ou print"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Main Content */}
        <main className="px-5 pt-6">
          {screenState === "empty" && (
            <section aria-label="Boas-vindas e envio de fatura">
              {/* Greeting */}
              <h1 className="text-[28px] sm:text-[30px] leading-[1.18] tracking-[-0.03em]">
                <span className="block font-medium text-[#161A18]">
                  Bom dia, {userName}.
                </span>
                <span className="block font-normal text-[#4B514D] mt-1">
                  Descubra quanto está escapando das suas assinaturas.
                </span>
              </h1>

              {/* Card NOVA ANÁLISE / Envie uma fatura */}
              <div className="mt-6 rounded-[28px] invoice-card-gradient p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#485250]">
                      NOVA ANÁLISE
                    </p>
                    <h2 className="text-[22px] leading-tight tracking-[-0.02em] font-medium text-[#1F2725] mt-1">
                      Envie uma fatura
                    </h2>
                  </div>
                  <ShieldCheckIcon className="w-[21px] h-[21px] text-[#485250] mt-0.5 shrink-0" />
                </div>

                {/* Drag-and-drop + selector dropzone */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Área para arrastar ou selecionar fatura em PDF, imagem ou print"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`mt-5 w-full rounded-[20px] bg-white py-8 px-5 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] ${
                    isDragging
                      ? "border-[#181B19] bg-[#F8F7F3]"
                      : "border-[#D5D3CC] hover:border-[#485250]"
                  }`}
                >
                  <UploadIcon className="w-[22px] h-[22px] text-[#485250] mb-2.5" />
                  <span className="text-[15.5px] font-semibold text-[#1F2725]">
                    Arraste sua fatura ou toque para escolher
                  </span>
                  <span className="text-[13.5px] text-[#4E5450] mt-1">
                    Aceita PDF, imagem ou print do app do banco
                  </span>
                </div>

                {/* Solid dark full-width CTA button */}
                <button
                  type="button"
                  aria-label="Enviar fatura para análise"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 w-full min-h-[52px] rounded-[16px] bg-[#181B19] hover:bg-[#272B28] text-white py-3.5 px-5 flex items-center justify-center gap-2.5 text-center transition-all active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] cursor-pointer shadow-[0_4px_14px_rgba(24,27,25,0.18)]"
                >
                  <UploadIcon className="w-[20px] h-[20px] text-white shrink-0" />
                  <span className="text-[15.5px] font-semibold tracking-[-0.01em]">
                    Enviar fatura
                  </span>
                </button>

                <p className="text-[12.5px] leading-[1.45] text-[#4A504C] text-center max-w-[310px] mx-auto mt-4">
                  Seus dados são mascarados e não vendemos informações.
                </p>
              </div>

              {/* 3 Benefits List */}
              <ul
                aria-label="Benefícios da análise de fatura"
                className="mt-7 space-y-3.5 px-1"
              >
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 w-[22px] h-[22px] rounded-full bg-[#E3EDE8] text-[#285A44] flex items-center justify-center shrink-0"
                    >
                      <CheckIcon className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[15px] text-[#2F3531] leading-snug font-medium">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {screenState === "analyzing" && (
            <section aria-label="Análise da fatura em andamento" className="pt-2">
              {!analysisError ? (
                <div className="rounded-[28px] bg-[#F0EFEA] p-6">
                  {/* Scanner Document Illustration */}
                  <div className="mx-auto w-[124px] h-[148px] rounded-[20px] bg-white border border-[#E2E0D8] shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-4">
                    <DocumentScannerIcon className="w-12 h-12 text-[#3B6B56]" />
                    <div
                      aria-hidden="true"
                      className="w-full mt-3 space-y-1.5 px-2"
                    >
                      <div className="h-1.5 w-3/4 rounded-full bg-[#E5E3DD]" />
                      <div className="h-1.5 w-full rounded-full bg-[#E5E3DD]" />
                      <div className="h-1.5 w-2/3 rounded-full bg-[#E5E3DD]" />
                    </div>
                    {/* Animated Scanner Beam (respects prefers-reduced-motion) */}
                    <div
                      aria-hidden="true"
                      className="scanner-line absolute left-0 right-0 h-[3px] bg-[#3B6B56] shadow-[0_0_12px_2px_rgba(59,107,86,0.45)]"
                    />
                  </div>

                  <div className="text-center mt-5">
                    <h1 className="text-[22px] font-medium tracking-[-0.02em] text-[#161A18]">
                      Analisando sua fatura
                    </h1>
                    {selectedFileName && (
                      <p className="text-[13.5px] text-[#4E5450] mt-1 truncate max-w-[280px] mx-auto">
                        {selectedFileName}
                      </p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[13px] font-medium text-[#4A504C] mb-2">
                      <span id="analysis-progress-label">
                        Progresso da leitura
                      </span>
                      <span className="tabular-nums">{analysisProgress}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-labelledby="analysis-progress-label"
                      aria-valuenow={analysisProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-[5px] w-full rounded-full bg-[#D8D6CF] overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-[#181B19] transition-all duration-200"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist by real event stages */}
                  <ul
                    aria-label="Etapas do processamento"
                    className="mt-6 space-y-3 border-t border-[#E2E0D8] pt-5"
                  >
                    {ANALYSIS_STEPS.map((step) => {
                      const isCompleted = completedStages.includes(step.id);
                      const isCurrent =
                        currentStage === step.id && !isCompleted;

                      return (
                        <li
                          key={step.id}
                          className="flex items-center gap-3 text-[14.5px]"
                        >
                          <span
                            aria-hidden="true"
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isCompleted
                                ? "bg-[#181B19] text-white"
                                : isCurrent
                                  ? "border-2 border-[#181B19] bg-white text-[#181B19]"
                                  : "border border-[#C5C3BC] bg-[#FAF9F6] text-transparent"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckIcon className="w-3.5 h-3.5" />
                            ) : isCurrent ? (
                              <span className="w-2 h-2 rounded-full bg-[#181B19]" />
                            ) : null}
                          </span>
                          <span
                            className={
                              isCompleted || isCurrent
                                ? "font-medium text-[#161A18]"
                                : "text-[#4E5450]"
                            }
                          >
                            {step.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                /* Error Handling State */
                <div
                  role="alert"
                  className="rounded-[28px] bg-[#F0EFEA] p-6 text-center"
                >
                  <div className="mx-auto w-[52px] h-[52px] rounded-full bg-[#F9E6E4] text-[#B42318] flex items-center justify-center">
                    <AlertCircleIcon className="w-7 h-7" />
                  </div>

                  <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#161A18] mt-4">
                    Não conseguimos ler esta fatura
                  </h1>

                  <p className="text-[14.5px] text-[#4A504C] mt-2 leading-relaxed">
                    {analysisError}
                  </p>

                  <div className="mt-4 rounded-[18px] bg-white p-4 text-left border border-[#E2E0D8]">
                    <p className="text-[13px] font-semibold text-[#181C1A]">
                      Orientação de formato:
                    </p>
                    <ul className="mt-1.5 text-[13px] text-[#4A504C] space-y-1 list-disc list-inside">
                      <li>Envie o PDF original baixado no app do banco</li>
                      <li>
                        Ou envie print/foto nítida (PNG, JPG ou WebP) da lista
                        de lançamentos
                      </li>
                      <li>
                        Evite arquivos protegidos por senha ou corrompidos
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    aria-label="Tentar de novo com outro arquivo de fatura"
                    onClick={() => {
                      setAnalysisError(null);
                      setScreenState("empty");
                    }}
                    className="mt-5 w-full min-h-[50px] rounded-[16px] bg-[#181B19] hover:bg-[#272B28] text-white font-semibold text-[15px] py-3.5 px-5 flex items-center justify-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] cursor-pointer"
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
            </section>
          )}

          {screenState === "result" && (
            <section aria-label="Resultado da análise">
              <p className="text-[15px] text-[#4B514D]">
                {charges.length} cobranças para revisar.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
