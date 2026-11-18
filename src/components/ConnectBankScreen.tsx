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
      className="pt-1 text-left pb-20 relative"
    >
      {/* Header com botão de voltar */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Voltar para a tela inicial"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#EAEAE7] dark:border-[#2C2C2E] hover:bg-[#F5F5F2] active:scale-[0.98] text-[#171717] dark:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
          <span className="text-[12px] font-medium text-[#858585] uppercase tracking-[0.06em]">
            Conexão bancária
          </span>
      </header>

      <div className="mt-4">
          <h1 className="text-[26px] sm:text-[28px] leading-[1.15] tracking-[-0.025em] font-semibold text-[#171717] dark:text-[#FAFAFA]">
            Traga sua fatura sem procurar arquivo
          </h1>
            <p className="mt-2 text-[14px] text-[#858585] dark:text-[#A1A1AA] leading-relaxed">
              Selecione sua instituição financeira abaixo. Ajudamos você a puxar os
              dados em 3 passos simples, 100% criptografado e seguro.
            </p>
          </div>

          {/* Grade de Bancos */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {SUPPORTED_BANKS.map((bank) => (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => setSelectedBank(bank)}
                  className="group rounded-[16px] bg-white dark:bg-[#1A1A1A] border border-[#EAEAE7] dark:border-[#2A2A2A] hover:border-[#08B968]/40 p-4 flex flex-col items-start justify-between min-h-[106px] text-left transition-all cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] active:scale-[0.98]"
                >
                  <div
                    className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-semibold text-[13px] ${bank.accentBg}`}
                    style={{ color: bank.textColor }}
                  >
                    {bank.tag.slice(0, 3)}
                  </div>
                  <div>
                      <p className="text-[14px] font-medium text-[#171717] dark:text-[#FAFAFA] leading-tight">
                        {bank.name}
                      </p>
                        <p className="text-[11.5px] text-[#087D4A] dark:text-[#08B968] font-medium mt-0.5">
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
                      className="w-full min-h-[50px] rounded-[14px] bg-[#171717] dark:bg-white text-white dark:text-[#171717] font-medium text-[14px] px-5 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:opacity-90 active:scale-[0.99]"
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
                      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
                      onClick={() => setSelectedBank(null)}
                    >
                      <div
                        className="w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] bg-white dark:bg-[#18181A] border border-[#EAEAE7] dark:border-[#2A2A2A] p-6 max-h-[88vh] overflow-y-auto text-left shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                          <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAE7] dark:border-[#27272A]">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-[8px] flex items-center justify-center font-semibold text-[11px] ${selectedBank.accentBg}`}
                                style={{ color: selectedBank.textColor }}
                              >
                                {selectedBank.tag.slice(0, 3)}
                              </div>
                              <h2
                                id="connect-modal-title"
                                className="text-[16px] font-semibold text-[#171717] dark:text-[#FAFAFA]"
                              >
                                Como conectar o {selectedBank.shortName}
                              </h2>
                            </div>

                            <button
                              type="button"
                              aria-label="Fechar"
                              onClick={() => setSelectedBank(null)}
                              className="w-8 h-8 rounded-full bg-[#F5F5F2] dark:bg-[#27272A] text-[#858585] flex items-center justify-center cursor-pointer"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Print Simulado / Wireframe de Guia */}
                                  <div className="mt-4 rounded-[16px] bg-[#F5F5F2] dark:bg-[#202022] p-4 border border-[#EAEAE7] dark:border-[#2C2C2E]">
                                    <div className="mx-auto w-[220px] rounded-[14px] bg-white dark:bg-[#141414] border border-[#EAEAE7] dark:border-[#2D2D2D] p-3">
                                      <div className="flex items-center justify-between pb-2 border-b border-[#EAEAE7] dark:border-[#262626]">
                                        <span className="text-[11px] font-semibold text-[#171717] dark:text-[#FAFAFA]">
                                          App {selectedBank.shortName}
                                        </span>
                                        <span className="w-2 h-2 rounded-full bg-[#08B968]" />
                                      </div>
                                      <div className="py-3 space-y-1.5 text-center">
                                          <div className="h-2 w-3/4 bg-[#EAEAE7] dark:bg-[#333] rounded-full mx-auto" />
                                          <div className="h-2 w-1/2 bg-[#EAEAE7] dark:bg-[#333] rounded-full mx-auto" />
                                          <div className="mt-2.5 p-2 rounded-[10px] bg-[#08B968]/10 border border-[#08B968]/25 text-[10.5px] font-medium text-[#087D4A] dark:text-[#08B968]">
                                            Exportar Extrato (PDF)
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* 3 Passos Guiados */}
                                    <ol className="mt-5 space-y-3.5">
                                      <li className="flex items-start gap-3">
                                          <span className="w-6 h-6 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[11.5px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                                            1
                                          </span>
                                          <div>
                                              <p className="text-[13.5px] font-medium text-[#171717] dark:text-[#FAFAFA]">
                                                Abra o app do {selectedBank.shortName}
                                              </p>
                                                <p className="text-[12.5px] text-[#858585] dark:text-[#A1A1AA]">
                                                  Vá até a aba de Extrato bancário ou Fatura fechada.
                                                </p>
                                              </div>
                                            </li>

                                            <li className="flex items-start gap-3">
                                                <span className="w-6 h-6 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[11.5px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                                                  2
                                                </span>
                                                <div>
                                                    <p className="text-[13.5px] font-medium text-[#171717] dark:text-[#FAFAFA]">
                                                      Exporte em PDF ou tire um print
                                                    </p>
                                                      <p className="text-[12.5px] text-[#858585] dark:text-[#A1A1AA]">
                                                        Toque no botão de compartilhar/exportar do app.
                                                      </p>
                                                    </div>
                                                  </li>

                                                  <li className="flex items-start gap-3">
                                                      <span className="w-6 h-6 rounded-full bg-[#08B968] text-white text-[11.5px] font-medium flex items-center justify-center shrink-0 mt-0.5">
                                                        3
                                                      </span>
                                                      <div>
                                                          <p className="text-[13.5px] font-medium text-[#171717] dark:text-[#FAFAFA]">
                                                            Envie aqui para a IA auditar
                                                          </p>
                                                            <p className="text-[12.5px] text-[#858585] dark:text-[#A1A1AA]">
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
                                                          className="w-full min-h-[48px] rounded-[14px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[14.5px] px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                          <DocumentScannerIcon className="w-4 h-4" />
                                                          <span>Enviar arquivo do {selectedBank.shortName}</span>
                                                        </button>

                                                        <button
                                                          type="button"
                                                          onClick={() => setSelectedBank(null)}
                                                          className="w-full py-2 text-center text-[13px] font-normal text-[#858585] hover:text-[#171717] cursor-pointer"
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
