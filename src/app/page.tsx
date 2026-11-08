"use client";

import { useRef, useState } from "react";
import {
  ChartBarIcon,
  ChevronRightIcon,
  CreditCardIcon,
  HomeIcon,
  ShieldCheckIcon,
  SparkleIcon,
  UploadIcon,
  UserIcon,
} from "@/components/icons";
import {
  INITIAL_CHARGES,
  calculateChargesSummary,
  formatBRL,
} from "@/data/charges";

type NavTab = "inicio" | "relatorio" | "assinaturas" | "perfil";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>("inicio");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showAllCharges, setShowAllCharges] = useState(false);
  const [charges, setCharges] = useState(INITIAL_CHARGES);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chargesListRef = useRef<HTMLElement>(null);

  const summary = calculateChargesSummary(charges);
  const displayedCharges = showAllCharges
    ? summary.reviewableCharges
    : summary.reviewableCharges.slice(0, 3);
  const displayedSum = Number(
    displayedCharges.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );
  const isPartialList = displayedSum !== summary.totalPossibleSavings;

  const handleViewAllCharges = () => {
    setShowAllCharges(true);
    chargesListRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleToggleReviewed = (id: string) => {
    setCharges((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, reviewed: !item.reviewed } : item
      )
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file.name);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] text-[#161A18] flex justify-center">
      {/* Mobile-first App Container */}
      <div className="w-full max-w-[440px] min-h-screen bg-[#F8F7F3] safe-bottom-padding relative">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 bg-[#F8F7F3]/95 backdrop-blur-md border-b border-[#EAE8E2] px-5 py-2.5 flex items-center justify-between">
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
            aria-label="Abrir perfil de Davi (DM)"
            className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] rounded-full bg-[#1B1D1B] text-white text-[13px] font-bold tracking-wide flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
          >
            DM
          </button>
        </header>

        {/* Main Content */}
        <main>
          {/* Greeting Hero */}
          <section className="px-5 pt-4 pb-3.5">
            <h1 className="text-[24px] sm:text-[26px] leading-[1.2] tracking-[-0.03em]">
              <span className="block font-medium text-[#161A18]">
                Bom dia, Davi.
              </span>
              <span className="block font-normal text-[#4B514D] mt-0.5">
                {summary.totalPossibleSavings > 0
                  ? `Encontramos R$ ${formatBRL(summary.totalPossibleSavings)} para você recuperar.`
                  : "Envie uma fatura para começar."}
              </span>
            </h1>
          </section>

          {/* Card 1: Possível economia */}
          <section className="px-5">
            <div className="rounded-[24px] bg-[#F0EFEA] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#4A504C]">
                  Possível economia
                </span>
                <button
                  type="button"
                  aria-label="Ver detalhes da possível economia"
                  onClick={handleViewAllCharges}
                  className="min-h-[44px] px-2 -mr-2 text-[13.5px] font-medium text-[#3F4541] flex items-center gap-1 hover:text-[#161A18] transition-colors cursor-pointer"
                >
                  <span>Ver detalhes</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[#4A504C]" />
                </button>
              </div>

              <div className="mt-1.5">
                <p className="text-[38px] sm:text-[42px] leading-[1.05] tracking-[-0.035em] font-medium text-[#141F1B] tabular-nums">
                  R$ {formatBRL(summary.totalPossibleSavings)}
                </p>
                <p className="text-[13.5px] text-[#4E5450] mt-1">
                  por mês
                  {isPartialList && (
                    <span>
                      {" "}
                      • Baseado em {summary.totalReviewableCount} cobranças
                    </span>
                  )}
                </p>
              </div>

              {summary.totalReviewableCount > 0 && (
                <div className="mt-4 pt-1">
                  <div className="flex items-center justify-between text-[12.5px] font-medium text-[#4E5450] mb-2">
                    <span id="progress-label">
                      {summary.reviewedCount} de {summary.totalReviewableCount}{" "}
                      cobranças revisadas
                    </span>
                    <span className="tabular-nums">
                      {summary.progressPercent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-labelledby="progress-label"
                    aria-valuenow={summary.reviewedCount}
                    aria-valuemin={0}
                    aria-valuemax={summary.totalReviewableCount}
                    className="h-[4px] w-full rounded-full bg-[#D5D3CC] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-[#181B19] transition-all"
                      style={{ width: `${summary.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Card 2: Nova análise - Envie uma fatura */}
          <section className="px-5 mt-3.5">
            <div className="rounded-[24px] invoice-card-gradient p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#485250]">
                    NOVA ANÁLISE
                  </p>
                  <h2 className="text-[20px] leading-tight tracking-[-0.02em] font-medium text-[#1F2725] mt-1">
                    Envie uma fatura
                  </h2>
                </div>
                <ShieldCheckIcon className="w-[20px] h-[20px] text-[#485250] mt-0.5 shrink-0" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                aria-label="Selecionar arquivo de fatura em PDF, imagem ou print"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                aria-label="Enviar fatura em PDF, imagem ou print"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full min-h-[50px] rounded-[16px] bg-[#181B19] hover:bg-[#262A27] text-white py-3.5 px-5 flex items-center justify-center gap-2.5 text-center transition-all active:scale-[0.99] cursor-pointer shadow-[0_4px_14px_rgba(24,27,25,0.18)]"
              >
                <UploadIcon className="w-[20px] h-[20px] text-white shrink-0" />
                <span className="text-[15.5px] font-semibold tracking-[-0.01em]">
                  {selectedFile ? `Fatura: ${selectedFile}` : "Enviar fatura"}
                </span>
              </button>

              <p className="text-[12.5px] leading-[1.4] text-[#4A504C] text-center max-w-[295px] mx-auto mt-3.5">
                Seus dados são processados com segurança e nunca são
                armazenados.
              </p>
            </div>
          </section>

          {/* Section 3: Cobranças recentes - Vale a pena revisar */}
          <section ref={chargesListRef} className="px-5 mt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#4E5450]">
                COBRANÇAS RECENTES
              </p>
              <div className="mt-1 flex items-center justify-between">
                <h2 className="text-[22px] sm:text-[23px] tracking-[-0.025em] font-medium text-[#161A18]">
                  Vale a pena revisar
                </h2>
                <button
                  type="button"
                  aria-label={
                    showAllCharges
                      ? "Mostrar resumo de cobranças para revisar"
                      : `Ver todas as ${summary.totalReviewableCount} cobranças para revisar`
                  }
                  onClick={() => setShowAllCharges((prev) => !prev)}
                  className="min-h-[44px] px-2 -mr-2 text-[13.5px] font-medium text-[#434945] flex items-center gap-1 hover:text-[#161A18] transition-colors cursor-pointer"
                >
                  <span>
                    {showAllCharges
                      ? "Mostrar resumo"
                      : `Ver todas (${summary.totalReviewableCount})`}
                  </span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[#4E5450]" />
                </button>
              </div>
            </div>

            {/* Subscription List */}
            <div className="mt-2 divide-y divide-[#E4E2DC] border-b border-[#E4E2DC]">
              {displayedCharges.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`Revisar cobrança ${item.name}, ${item.factSubtitle}, valor mensal R$ ${formatBRL(item.amount)}${item.reviewed ? ", já revisada" : ""}`}
                  onClick={() => handleToggleReviewed(item.id)}
                  className="w-full min-h-[68px] py-3.5 flex items-center justify-between text-left group hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      aria-hidden="true"
                      className={`w-[44px] h-[44px] rounded-full ${item.bgColor} text-white font-bold text-[15px] flex items-center justify-center shrink-0`}
                    >
                      {item.initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] font-semibold text-[#181C1A] leading-snug">
                          {item.name}
                        </p>
                        {item.reviewed && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E2ECE7] text-[#264D3B]">
                            Revisada
                          </span>
                        )}
                      </div>
                      <p className="text-[13.5px] text-[#4E5450] mt-0.5">
                        {item.factSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[16px] font-semibold text-[#181C1A] leading-snug tabular-nums">
                        R$ {formatBRL(item.amount)}
                      </p>
                      <p className="text-[13px] text-[#4E5450] mt-0.5">/mês</p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-[#4E5450] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            {/* Review Callout Block */}
            <div className="pt-6">
              <SparkleIcon className="w-[20px] h-[20px] text-[#3B6B56] mb-3.5" />
              <p className="text-[15px] leading-relaxed text-[#3F4541]">
                <strong className="font-semibold text-[#181C1A]">
                  {summary.pendingReviewCount} assinaturas
                </strong>{" "}
                para você revisar.
              </p>
              <button
                type="button"
                aria-label={`Revisar ${summary.pendingReviewCount} assinaturas pendentes`}
                onClick={handleViewAllCharges}
                className="mt-2 min-h-[44px] px-2 -ml-2 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[#2F3531] hover:text-[#161A18] transition-colors cursor-pointer"
              >
                <span>Revisar</span>
                <ChevronRightIcon className="w-4 h-4 text-[#4A504C]" />
              </button>
            </div>

            <hr className="border-t border-[#E4E2DC] my-5" />

            {/* Full Report CTA Row */}
            <button
              type="button"
              aria-label="Abrir relatório completo e ver possível economia"
              onClick={handleViewAllCharges}
              className="w-full min-h-[56px] flex items-center justify-between py-2 text-left group cursor-pointer"
            >
              <div>
                <p className="text-[16px] font-semibold text-[#181C1A]">
                  Relatório completo
                </p>
                <p className="text-[13.5px] text-[#4E5450] mt-0.5">
                  Veja onde você pode economizar
                </p>
              </div>
              <ChevronRightIcon className="w-[18px] h-[18px] text-[#4A504C] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>
        </main>

        {/* Floating Bottom Navigation Bar */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[416px] bg-[#1E2022] rounded-[24px] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.24)] flex items-center justify-between"
        >
          <button
            type="button"
            aria-label="Início"
            aria-current={activeTab === "inicio" ? "page" : undefined}
            onClick={() => setActiveTab("inicio")}
            className={`flex-1 min-h-[52px] py-2 px-2 rounded-[18px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === "inicio"
                ? "bg-[#353835] text-white font-bold"
                : "text-[#C8CCCE] hover:text-white font-medium"
            }`}
          >
            <HomeIcon className="w-[20px] h-[20px]" />
            <span className="text-[11.5px] leading-none">Início</span>
          </button>

          <button
            type="button"
            aria-label="Relatório"
            aria-current={activeTab === "relatorio" ? "page" : undefined}
            onClick={() => setActiveTab("relatorio")}
            className={`flex-1 min-h-[52px] py-2 px-2 rounded-[18px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === "relatorio"
                ? "bg-[#353835] text-white font-bold"
                : "text-[#C8CCCE] hover:text-white font-medium"
            }`}
          >
            <ChartBarIcon className="w-[20px] h-[20px]" />
            <span className="text-[11.5px] leading-none">Relatório</span>
          </button>

          <button
            type="button"
            aria-label="Assinaturas"
            aria-current={activeTab === "assinaturas" ? "page" : undefined}
            onClick={() => setActiveTab("assinaturas")}
            className={`flex-1 min-h-[52px] py-2 px-2 rounded-[18px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === "assinaturas"
                ? "bg-[#353835] text-white font-bold"
                : "text-[#C8CCCE] hover:text-white font-medium"
            }`}
          >
            <CreditCardIcon className="w-[20px] h-[20px]" />
            <span className="text-[11.5px] leading-none">Assinaturas</span>
          </button>

          <button
            type="button"
            aria-label="Perfil"
            aria-current={activeTab === "perfil" ? "page" : undefined}
            onClick={() => setActiveTab("perfil")}
            className={`flex-1 min-h-[52px] py-2 px-2 rounded-[18px] flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${
              activeTab === "perfil"
                ? "bg-[#353835] text-white font-bold"
                : "text-[#C8CCCE] hover:text-white font-medium"
            }`}
          >
            <UserIcon className="w-[20px] h-[20px]" />
            <span className="text-[11.5px] leading-none">Perfil</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
