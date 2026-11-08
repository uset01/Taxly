"use client";

import { useRef, useState } from "react";
import {
  ChartBarIcon,
  ChevronRightIcon,
  GlobeIcon,
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
  const [charges] = useState(INITIAL_CHARGES);
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
            <div className="w-[38px] h-[38px] rounded-[12px] bg-[#FAF9F6] border border-[#E5E3DD] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center text-[#181B19]">
              <ShieldCheckIcon className="w-[19px] h-[19px]" />
            </div>
            <span className="text-[18px] tracking-[-0.025em] leading-none select-none">
              <strong className="font-semibold text-[#181B19]">Vazamento</strong>
              <span className="font-medium text-[#52856F]">Zero</span>
            </span>
          </div>

          <button
            type="button"
            aria-label="Perfil do usuário DM"
            className="w-[44px] h-[44px] rounded-full bg-[#1B1D1B] text-white text-[13px] font-bold tracking-wide flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
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
              <span className="block font-normal text-[#9B9E99] mt-0.5">
                Suas finanças estão mais leves hoje.
              </span>
            </h1>
          </section>

          {/* Card 1: Economia encontrada */}
          <section className="px-5">
            <div className="rounded-[24px] bg-[#F0EFEA] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#7A7E79]">
                  Economia encontrada
                </span>
                <button
                  type="button"
                  onClick={handleViewAllCharges}
                  className="text-[13.5px] font-medium text-[#5A5F5B] flex items-center gap-1 hover:text-[#161A18] transition-colors cursor-pointer"
                >
                  <span>Ver detalhes</span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[#7A7E79]" />
                </button>
              </div>

              <div className="mt-2.5">
                <p className="text-[38px] sm:text-[42px] leading-[1.05] tracking-[-0.035em] font-medium text-[#141F1B] tabular-nums">
                  R$ {formatBRL(summary.totalPossibleSavings)}
                </p>
                <p className="text-[13.5px] text-[#8E918C] mt-1">
                  por mês
                  {isPartialList && (
                    <span>
                      {" "}
                      • Baseado em {summary.totalReviewableCount} cobranças
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4 pt-1">
                <p className="text-[12.5px] text-[#8E918C] mb-2">
                  Potencial identificado nas suas assinaturas
                </p>
                <div className="h-[3.5px] w-full rounded-full bg-[#DFDDD7] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#181B19] transition-all"
                    style={{ width: `${summary.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Nova análise - Envie uma fatura */}
          <section className="px-5 mt-3.5">
            <div className="rounded-[24px] invoice-card-gradient p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#6F7876]">
                    NOVA ANÁLISE
                  </p>
                  <h2 className="text-[20px] leading-tight tracking-[-0.02em] font-medium text-[#363F3D] mt-1">
                    Envie uma fatura
                  </h2>
                </div>
                <ShieldCheckIcon className="w-[20px] h-[20px] text-[#5C6561] mt-0.5 shrink-0" />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full min-h-[52px] rounded-[16px] bg-[#181B19] hover:bg-[#262A27] text-white py-3.5 px-5 flex items-center justify-center gap-2.5 text-center transition-all active:scale-[0.99] cursor-pointer shadow-[0_4px_14px_rgba(24,27,25,0.18)]"
              >
                <UploadIcon className="w-[20px] h-[20px] text-white shrink-0" />
                <span className="text-[15.5px] font-semibold tracking-[-0.01em]">
                  {selectedFile ? `Fatura: ${selectedFile}` : "Enviar fatura"}
                </span>
              </button>

              <p className="text-[12.5px] leading-[1.4] text-[#878B86] text-center max-w-[290px] mx-auto mt-3.5">
                Seus dados são processados com segurança e nunca são
                armazenados.
              </p>
            </div>
          </section>

          {/* Section 3: Cobranças recentes - Vale a pena revisar */}
          <section ref={chargesListRef} className="px-5 mt-8">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#8C8F8A]">
                COBRANÇAS RECENTES
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <h2 className="text-[22px] sm:text-[23px] tracking-[-0.025em] font-medium text-[#161A18]">
                  Vale a pena revisar
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAllCharges((prev) => !prev)}
                  className="text-[13.5px] font-medium text-[#626763] flex items-center gap-1 hover:text-[#161A18] transition-colors cursor-pointer"
                >
                  <span>
                    {showAllCharges
                      ? "Mostrar resumo"
                      : `Ver todas (${summary.totalReviewableCount})`}
                  </span>
                  <ChevronRightIcon className="w-3.5 h-3.5 text-[#7A7E79]" />
                </button>
              </div>
            </div>

            {/* Subscription List */}
            <div className="mt-3 divide-y divide-[#EAE8E2] border-b border-[#EAE8E2]">
              {displayedCharges.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full py-4 flex items-center justify-between text-left group hover:opacity-85 transition-opacity cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-[42px] h-[42px] rounded-full ${item.bgColor} text-white font-bold text-[15px] flex items-center justify-center shrink-0`}
                    >
                      {item.initial}
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-[#181C1A] leading-snug">
                        {item.name}
                      </p>
                      <p className="text-[13.5px] text-[#949792] mt-0.5">
                        {item.factSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[16px] font-semibold text-[#181C1A] leading-snug tabular-nums">
                        R$ {formatBRL(item.amount)}
                      </p>
                      <p className="text-[13px] text-[#949792] mt-0.5">/mês</p>
                    </div>
                    <ChevronRightIcon className="w-4 h-4 text-[#8E918C] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>

            {/* Low-usage Insight Block */}
            <div className="pt-6">
              <SparkleIcon className="w-[20px] h-[20px] text-[#638D7B] mb-4" />
              <p className="text-[15px] leading-relaxed text-[#5D625D]">
                <strong className="font-semibold text-[#181C1A]">
                  3 serviços
                </strong>{" "}
                tiveram pouco ou nenhum uso neste mês.
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[#4A504C] hover:text-[#161A18] transition-colors cursor-pointer"
              >
                <span>Revisar</span>
                <ChevronRightIcon className="w-4 h-4 text-[#6E736E]" />
              </button>
            </div>

            <hr className="border-t border-[#EAE8E2] my-6" />

            {/* Full Report CTA Row */}
            <button
              type="button"
              className="w-full flex items-center justify-between py-1 text-left group cursor-pointer"
            >
              <div>
                <p className="text-[16px] font-semibold text-[#181C1A]">
                  Relatório completo
                </p>
                <p className="text-[13.5px] text-[#949792] mt-0.5">
                  Veja onde você pode economizar
                </p>
              </div>
              <ChevronRightIcon className="w-[18px] h-[18px] text-[#606560] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </section>
        </main>

        {/* Floating Bottom Navigation Bar */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[290px] bg-[#1E2022] rounded-[22px] px-6 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.22)] flex items-center justify-between"
        >
          <button
            type="button"
            aria-label="Início"
            onClick={() => setActiveTab("inicio")}
            className={`p-1.5 transition-colors cursor-pointer ${
              activeTab === "inicio"
                ? "text-white"
                : "text-[#C8CCCE] hover:text-white"
            }`}
          >
            <HomeIcon className="w-[23px] h-[23px]" />
          </button>

          <button
            type="button"
            aria-label="Relatório"
            onClick={() => setActiveTab("relatorio")}
            className={`p-1.5 transition-colors cursor-pointer ${
              activeTab === "relatorio"
                ? "text-white"
                : "text-[#C8CCCE] hover:text-white"
            }`}
          >
            <ChartBarIcon className="w-[23px] h-[23px]" />
          </button>

          <button
            type="button"
            aria-label="Assinaturas"
            onClick={() => setActiveTab("assinaturas")}
            className={`p-1.5 transition-colors cursor-pointer ${
              activeTab === "assinaturas"
                ? "text-white"
                : "text-[#C8CCCE] hover:text-white"
            }`}
          >
            <GlobeIcon className="w-[23px] h-[23px]" />
          </button>

          <button
            type="button"
            aria-label="Perfil"
            onClick={() => setActiveTab("perfil")}
            className={`p-1.5 transition-colors cursor-pointer ${
              activeTab === "perfil"
                ? "text-white"
                : "text-[#C8CCCE] hover:text-white"
            }`}
          >
            <UserIcon className="w-[23px] h-[23px]" />
          </button>
        </nav>
      </div>
    </div>
  );
}
