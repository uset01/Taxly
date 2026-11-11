"use client";

import { type ComponentType, type SVGProps, useEffect, useRef, useState } from "react";
import {
  AppearanceIcon,
  BellIcon,
  CheckIcon,
  CloseIcon,
  CreditCardIcon,
  HelpCircleIcon,
  HistoryIcon,
  LogOutIcon,
  ShareDownloadIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
} from "@/components/icons";
import type { BillingPlanId } from "@/components/PaywallScreen";

export type AppearanceMode = "light" | "dark" | "system";

type ProfileSheetId =
  | "notifications"
  | "privacy"
  | "subscription"
  | "help"
  | "appearance"
  | null;

interface ProfileMenuProps {
  isSubscribed: boolean;
  activePlan: BillingPlanId;
  appearanceMode: AppearanceMode;
  onChangeAppearance: (mode: AppearanceMode) => void;
  onSendAnotherInvoice: () => void;
  onOpenHistory: () => void;
  onOpenPaywall: () => void;
  onCancelSubscription: () => void;
  onExportAnalyses: () => void;
  onDeleteData: () => void;
  onSignOut: () => void;
}

interface MenuItemConfig {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  action: () => void;
}

export function ProfileMenu({
  isSubscribed,
  activePlan,
  appearanceMode,
  onChangeAppearance,
  onSendAnotherInvoice,
  onOpenHistory,
  onOpenPaywall,
  onCancelSubscription,
  onExportAnalyses,
  onDeleteData,
  onSignOut,
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<ProfileSheetId>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [notifyNewCharges, setNotifyNewCharges] = useState(true);
  const [notifyPriceChanges, setNotifyPriceChanges] = useState(true);

  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen && !activeSheet) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setActiveSheet(null);
        setIsConfirmingDelete(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, activeSheet]);

  const closeMenuAndRun = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  const mainMenuItems: MenuItemConfig[] = [
    {
      id: "notifications",
      label: "Notificações",
      icon: BellIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("notifications")),
    },
    {
      id: "send-invoice",
      label: "Enviar outra fatura",
      icon: UploadIcon,
      action: () => closeMenuAndRun(onSendAnotherInvoice),
    },
    {
      id: "privacy",
      label: "Política de privacidade",
      icon: ShieldCheckIcon,
      action: () =>
        closeMenuAndRun(() => {
          setIsConfirmingDelete(false);
          setActiveSheet("privacy");
        }),
    },
    {
      id: "history",
      label: "Histórico de faturas",
      icon: HistoryIcon,
      action: () => closeMenuAndRun(onOpenHistory),
    },
    {
      id: "subscription",
      label: "Gerenciar subscrição",
      icon: CreditCardIcon,
      action: () =>
        closeMenuAndRun(() => {
          if (isSubscribed) {
            setActiveSheet("subscription");
          } else {
            onOpenPaywall();
          }
        }),
    },
    {
      id: "export",
      label: "Exportar minhas análises",
      icon: ShareDownloadIcon,
      action: () => closeMenuAndRun(onExportAnalyses),
    },
    {
      id: "help",
      label: "Central de ajuda",
      icon: HelpCircleIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("help")),
    },
    {
      id: "appearance",
      label: "Aparência",
      icon: AppearanceIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("appearance")),
    },
  ];

  const sheetTitleMap: Record<Exclude<ProfileSheetId, null>, string> = {
    notifications: "Notificações",
    privacy: "Política de privacidade",
    subscription: "Gerenciar subscrição",
    help: "Central de ajuda",
    appearance: "Aparência",
  };

  return (
    <>
      <div ref={menuContainerRef} className="relative">
        <button
          type="button"
          aria-label="Abrir perfil e opções da conta"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-8 h-8 rounded-full bg-[#F5F5F5] border border-[#EAEAEA] flex items-center justify-center text-[#52525B] hover:text-[#111111] hover:bg-[#EBEBEB] active:bg-[#E2E2E2] transition-colors cursor-pointer"
        >
          <UserIcon className="w-[17px] h-[17px]" />
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Menu do perfil"
            className="absolute right-0 mt-2 w-[264px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-[20px] bg-white border border-[#EAEAEA] p-1.5 z-50"
          >
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={item.action}
                  className="w-full min-h-[42px] px-3.5 py-2 rounded-[12px] text-left text-[14px] font-medium text-[#171717] hover:bg-[#F5F5F5] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4 text-[#6B7280] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <hr className="my-1 border-t border-[#F0F0F0]" />

            <button
              type="button"
              role="menuitem"
              onClick={() => closeMenuAndRun(onSignOut)}
              className="w-full min-h-[42px] px-3.5 py-2 rounded-[12px] text-left text-[14px] font-medium text-[#6B7280] hover:bg-[#F5F5F5] hover:text-[#171717] flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LogOutIcon className="w-4 h-4 text-[#6B7280] shrink-0" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal leve das configurações do menu do perfil */}
      {activeSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-sheet-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4"
          onClick={() => {
            setActiveSheet(null);
            setIsConfirmingDelete(false);
          }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] bg-white border border-[#EAEAEA] p-5 sm:p-6 max-h-[85vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="profile-sheet-title"
                className="text-[18px] font-bold tracking-[-0.02em] text-[#1A1A1A]"
              >
                {sheetTitleMap[activeSheet]}
              </h2>
              <button
                type="button"
                aria-label="Fechar janela"
                onClick={() => {
                  setActiveSheet(null);
                  setIsConfirmingDelete(false);
                }}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#52525B] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {activeSheet === "notifications" && (
              <div className="mt-4 space-y-3">
                {[
                  {
                    id: "new-charges",
                    title: "Novas cobranças detectadas",
                    desc: "Avise quando surgir uma assinatura ou cobrança repetida.",
                    checked: notifyNewCharges,
                    toggle: () => setNotifyNewCharges((v) => !v),
                  },
                  {
                    id: "price-changes",
                    title: "Alertas de reajuste",
                    desc: "Notificar quando o valor de um serviço aumentar.",
                    checked: notifyPriceChanges,
                    toggle: () => setNotifyPriceChanges((v) => !v),
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    role="switch"
                    aria-checked={opt.checked}
                    onClick={opt.toggle}
                    className="w-full rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-[14.5px] font-semibold text-[#1A1A1A]">
                        {opt.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-[#6B7280]">
                        {opt.desc}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                        opt.checked
                          ? "bg-[#00C853] justify-end"
                          : "bg-[#D4D4D8] justify-start"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white block" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {activeSheet === "privacy" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[16px] bg-[#FAFAFA] border border-[#EAEAEA] p-4 space-y-2 text-[13.5px] leading-relaxed text-[#52525B]">
                  <p>
                    <strong className="font-semibold text-[#1A1A1A]">
                      Mascaramento automático:
                    </strong>{" "}
                    CPF, número de cartão e dados bancários são mascarados antes
                    da leitura de cobranças.
                  </p>
                  <p>
                    <strong className="font-semibold text-[#1A1A1A]">
                      Zero venda de dados:
                    </strong>{" "}
                    não vendemos nem compartilhamos suas faturas com terceiros
                    (LGPD).
                  </p>
                </div>

                {!isConfirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[14px] bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#B42318] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Apagar meus dados deste dispositivo</span>
                  </button>
                ) : (
                  <div className="rounded-[16px] border border-[#F3D1CE] bg-[#FDF2F2] p-4">
                    <p className="text-[13.5px] font-semibold text-[#1A1A1A]">
                      Confirmar exclusão local?
                    </p>
                    <p className="mt-1 text-[12.5px] text-[#6B7280]">
                      Remove o histórico de cobranças resolvidas e análises
                      salvas neste navegador.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 min-h-[40px] rounded-[12px] bg-white border border-[#EAEAEA] text-[13px] font-semibold text-[#1A1A1A] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsConfirmingDelete(false);
                          setActiveSheet(null);
                          onDeleteData();
                        }}
                        className="flex-1 min-h-[40px] rounded-[12px] bg-[#B42318] text-[13px] font-semibold text-white cursor-pointer"
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSheet === "subscription" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[16px] bg-[#FAFAFA] border-2 border-[#00C853] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-[#1A1A1A]">
                      {activePlan === "annual"
                        ? "Plano Anual"
                        : "Plano Mensal"}
                    </span>
                    <span className="rounded-full bg-[#00C853]/15 text-[#00C853] px-2.5 py-0.5 text-[12px] font-semibold">
                      Ativo
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[#6B7280]">
                    {activePlan === "annual"
                      ? "R$ 119,90/ano · Análises ilimitadas liberadas"
                      : "R$ 19,90/mês · Análises ilimitadas liberadas"}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheet(null);
                      onOpenPaywall();
                    }}
                    className="w-full min-h-[46px] rounded-[14px] bg-[#1A1A1A] hover:bg-[#333333] text-white text-[14px] font-semibold transition-colors cursor-pointer"
                  >
                    Alterar plano
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheet(null);
                      onCancelSubscription();
                    }}
                    className="w-full min-h-[42px] rounded-[14px] text-[13.5px] font-medium text-[#6B7280] hover:text-[#1A1A1A] underline underline-offset-4 cursor-pointer"
                  >
                    Cancelar subscrição
                  </button>
                </div>
              </div>
            )}

            {activeSheet === "help" && (
              <div className="mt-4 space-y-3 text-[13.5px]">
                {[
                  {
                    q: "Quais arquivos posso enviar?",
                    a: "PDF original do banco, capturas de tela ou fotos nítidas (PNG, JPG, WebP ou HEIC).",
                  },
                  {
                    q: "Como cancelo uma cobrança encontrada?",
                    a: "No resultado completo, toque em 'Como cancelar' para ver o passo a passo e copiar a mensagem pronta.",
                  },
                  {
                    q: "Precisa falar com o suporte?",
                    a: "Envie um e-mail para suporte@taxly.app e respondemos em até 1 dia útil.",
                  },
                ].map((faq) => (
                  <div
                    key={faq.q}
                    className="rounded-[14px] bg-[#FAFAFA] border border-[#EAEAEA] p-3.5"
                  >
                    <p className="font-semibold text-[#1A1A1A]">{faq.q}</p>
                    <p className="mt-1 text-[#6B7280] leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {activeSheet === "appearance" && (
              <div
                role="radiogroup"
                aria-label="Selecionar aparência do aplicativo"
                className="mt-4 space-y-2.5"
              >
                {(
                  [
                    { id: "light", label: "Claro", desc: "Fundo branco minimalista (padrão)" },
                    { id: "dark", label: "Escuro", desc: "Interface escura para ambientes com pouca luz" },
                    { id: "system", label: "Automático (sistema)", desc: "Segue a preferência do seu dispositivo" },
                  ] as const
                ).map((option) => {
                  const isSelected = appearanceMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onChangeAppearance(option.id)}
                      className={`w-full rounded-[16px] p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "border-2 border-[#00C853] bg-[#FAFAFA]"
                          : "border-2 border-[#E5E7EB] bg-white hover:border-[#D4D4D8]"
                      }`}
                    >
                      <div>
                        <p className="text-[14.5px] font-semibold text-[#1A1A1A]">
                          {option.label}
                        </p>
                        <p className="text-[12.5px] text-[#6B7280]">
                          {option.desc}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-[#00C853] text-white"
                            : "border-2 border-[#D4D4D8]"
                        }`}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

