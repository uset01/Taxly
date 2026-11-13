"use client";

import { useState } from "react";
import { ArrowLeftIcon, CloseIcon, DocumentScannerIcon, UploadIcon } from "@/components/icons";

interface ConnectBankScreenProps {
  onBack: () => void;
  onSelectManualFile: () => void;
}

interface BankItem {
  id: string;
  name: string;
  tag: string;
  brandColor: string;
  textColor: string;
  accentBg: string;
  shortName: string;
}

const SUPPORTED_BANKS: BankItem[] = [
  {
    id: "itau",
    name: "Itaú Unibanco",
    tag: "Itaú",
    brandColor: "#EC7000",
    textColor: "#FFFFFF",
    accentBg: "bg-[#EC7000]",
    shortName: "Itaú",
  },
  {
    id: "nubank",
    name: "Nubank",
    tag: "Nu",
    brandColor: "#820AD1",
    textColor: "#FFFFFF",
    accentBg: "bg-[#820AD1]",
    shortName: "Nubank",
  },
  {
    id: "bradesco",
    name: "Bradesco",
    tag: "Bradesco",
    brandColor: "#CC092F",
    textColor: "#FFFFFF",
    accentBg: "bg-[#CC092F]",
    shortName: "Bradesco",
  },
  {
    id: "santander",
    name: "Santander",
    tag: "Santander",
    brandColor: "#EC0000",
    textColor: "#FFFFFF",
    accentBg: "bg-[#EC0000]",
    shortName: "Santander",
  },
  {
    id: "inter",
    name: "Banco Inter",
    tag: "Inter",
    brandColor: "#FF7A00",
    textColor: "#FFFFFF",
    accentBg: "bg-[#FF7A00]",
    shortName: "Inter",
  },
  {
    id: "c6",
    name: "C6 Bank",
    tag: "C6",
    brandColor: "#242424",
    textColor: "#FFFFFF",
    accentBg: "bg-[#242424]",
    shortName: "C6 Bank",
  },
  {
    id: "other",
    name: "Outro banco",
    tag: "Outro",
    brandColor: "#52525B",
    textColor: "#FFFFFF",
    accentBg: "bg-[#52525B]",
    shortName: "Outro banco",
  },
];

export function ConnectBankScreen({
  onBack,
  onSelectManualFile,
}: ConnectBankScreenProps) {
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null);

  return (
    <section
      aria-label="Conexão com bancos e importação guiada"
      style={{ paddingBottom: "7rem" }}
      className="pt-1 text-left pb-28 relative min-h-screen"
    >
      {/* Header com botão de voltar */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar para a tela inicial"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[#FAFAFA] dark:bg-[#1C1C1E] border border-[#E5E7EB] dark:border-[#2C2C2E] hover:bg-[#F0F0F0] active:bg-[#E5E5E5] text-[#1A1A1A] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-[0.05em]">
          Conexão bancária
        </span>
      </header>

      <div className="mt-4">
        <h1 className="text-[28px] sm:text-[32px] leading-[1.12] tracking-[-0.03em] font-extrabold text-[#111111] dark:text-[#FAFAFA]">
          Traga sua fatura sem procurar arquivo
        </h1>
        <p className="mt-2 text-[14px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
          Selecione sua instituição financeira abaixo. Ajudamos você a puxar os
          dados em 3 passos simples, 100% criptografado e seguro.
        </p>
      </div>

      {/* Grade de Bancos */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {SUPPORTED_BANKS.map((bank) => (
          <button
            key={bank.id}
            type="button"
            onClick={() => setSelectedBank(bank)}
            className="group rounded-[20px] bg-[#FAFAFA] dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2A2A2A] hover:border-[#00C853] p-4 flex flex-col items-start justify-between min-h-[110px] text-left transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <div
              className={`w-10 h-10 rounded-[12px] flex items-center justify-center font-bold text-[14px] shadow-xs ${bank.accentBg}`}
              style={{ color: bank.textColor }}
            >
              {bank.tag.slice(0, 3)}
            </div>
            <div>
              <p className="text-[14.5px] font-bold text-[#111111] dark:text-[#FAFAFA] leading-tight">
                {bank.name}
              </p>
              <p className="text-[11.5px] text-[#00C853] font-medium mt-0.5">
                Conectar extrato →
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Botão fixo no rodapé */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] px-6">
        <button
          type="button"
          onClick={onSelectManualFile}
          className="w-full min-h-[50px] rounded-[16px] bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer hover:opacity-90 active:scale-[0.99]"
        >
          <UploadIcon className="w-4 h-4" />
          <span>Escolher arquivo manualmente</span>
        </button>
      </div>

      {/* Modal "Como conectar" com 3 passos em print simulado */}
      {selectedBank && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="connect-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedBank(null)}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] bg-white dark:bg-[#18181A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-6 max-h-[88vh] overflow-y-auto text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] dark:border-[#27272A]">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-[8px] flex items-center justify-center font-bold text-[11px] ${selectedBank.accentBg}`}
                  style={{ color: selectedBank.textColor }}
                >
                  {selectedBank.tag.slice(0, 3)}
                </div>
                <h2
                  id="connect-modal-title"
                  className="text-[17px] font-bold text-[#111111] dark:text-[#FAFAFA]"
                >
                  Como conectar o {selectedBank.shortName}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setSelectedBank(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] dark:bg-[#27272A] text-[#6B7280] flex items-center justify-center cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Print Simulado / Wireframe de Guia */}
            <div className="mt-4 rounded-[18px] bg-[#F5F5F5] dark:bg-[#202022] p-4 border border-[#EAEAEA] dark:border-[#2C2C2E]">
              <div className="mx-auto w-[220px] rounded-[18px] bg-white dark:bg-[#141414] border border-[#E0E0E0] dark:border-[#2D2D2D] p-3 shadow-sm">
                <div className="flex items-center justify-between pb-2 border-b border-[#F0F0F0] dark:border-[#262626]">
                  <span className="text-[11px] font-bold text-[#111111] dark:text-[#FAFAFA]">
                    App {selectedBank.shortName}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#00C853]" />
                </div>
                <div className="py-3 space-y-1.5 text-center">
                  <div className="h-2 w-3/4 bg-[#E5E5E5] dark:bg-[#333] rounded-full mx-auto" />
                  <div className="h-2 w-1/2 bg-[#E5E5E5] dark:bg-[#333] rounded-full mx-auto" />
                  <div className="mt-2.5 p-2 rounded-[10px] bg-[#E8F8EE] dark:bg-[#062414] border border-[#00C853]/30 text-[10.5px] font-bold text-[#008A39] dark:text-[#22C55E]">
                    [ ⎙ Exportar Extrato (PDF) ]
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Passos Guiados */}
            <ol className="mt-5 space-y-3.5">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#111111] dark:text-[#FAFAFA]">
                    Abra o app do {selectedBank.shortName}
                  </p>
                  <p className="text-[12.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                    Vá até a aba de Extrato bancário ou Fatura fechada.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#111111] dark:bg-white text-white dark:text-[#111111] text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#111111] dark:text-[#FAFAFA]">
                    Exporte em PDF ou tire um print
                  </p>
                  <p className="text-[12.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                    Toque no botão de compartilhar/exportar do app.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#00C853] text-black text-[12px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <p className="text-[13.5px] font-semibold text-[#111111] dark:text-[#FAFAFA]">
                    Envie aqui para a IA auditar
                  </p>
                  <p className="text-[12.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                    O Taxly analisa e mascarará seus dados na mesma hora.
                  </p>
                </div>
              </li>
            </ol>

            {/* Ação final guiada */}
            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedBank(null);
                  onSelectManualFile();
                }}
                className="w-full min-h-[48px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <DocumentScannerIcon className="w-4 h-4" />
                <span>Enviar arquivo do {selectedBank.shortName}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedBank(null)}
                className="w-full py-2 text-center text-[13px] font-medium text-[#6B7280] hover:text-[#111111] cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
