"use client";

import {
  type ComponentType,
  type FormEvent,
  type SVGProps,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppearanceIcon,
  BellIcon,
  CheckIcon,
  CloseIcon,
  CreditCardIcon,
  HelpCircleIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  ShareDownloadIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
  UserPlusIcon,
} from "@/components/icons";
import type { BillingPlanId } from "@/components/PaywallScreen";

export type AppearanceMode = "light" | "dark" | "system";
export type AuthMode = "login" | "signup";

type ProfileSheetId =
  | "auth"
  | "notifications"
  | "privacy"
  | "subscription"
  | "cancelFlow"
  | "help"
  | "appearance"
  | "referral"
  | "categories"
  | "language"
  | "terms"
  | "support"
  | "rateApp"
  | "about"
  | null;

interface ProfileMenuProps {
  isLoggedIn: boolean;
  isSubscribed: boolean;
  activePlan: BillingPlanId;
  appearanceMode: AppearanceMode;
  onAuthenticate: (payload: {
    name: string;
    email: string;
    mode: AuthMode;
  }) => void;
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
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  danger?: boolean;
  action: () => void;
}

export function ProfileMenu({
  isLoggedIn,
  isSubscribed,
  activePlan,
  appearanceMode,
  onAuthenticate,
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
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // States de cancelamento em 4 telas (a, b, c, d)
  const [cancelStep, setCancelStep] = useState<"offer" | "reason" | "confirm" | "completed">("offer");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [discountApplied, setDiscountApplied] = useState(false);

  // Notificações
  const [notifyNewCharges, setNotifyNewCharges] = useState(true);
  const [notifyPriceChanges, setNotifyPriceChanges] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

  const openAuthSheet = (mode: AuthMode) => {
    closeMenuAndRun(() => {
      setAuthMode(mode);
      setAuthError(null);
      setActiveSheet("auth");
    });
  };

  const handleAuthSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = authEmail.trim();
    const trimmedName = authName.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAuthError("Informe um e-mail válido para continuar.");
      return;
    }

    if (authPassword.trim().length < 4) {
      setAuthError("A senha precisa ter pelo menos 4 caracteres.");
      return;
    }

    onAuthenticate({
      name: trimmedName || trimmedEmail.split("@")[0],
      email: trimmedEmail,
      mode: authMode,
    });
    setActiveSheet(null);
    setAuthError(null);
    setAuthPassword("");
  };

  // Grupos do menu logado com a ordem estrita da Tarefa 8
  const loggedInGroups: MenuItemConfig[][] = [
    // Grupo 1: Notificações, Enviar outra fatura, Histórico, Categorias, Exportar
    [
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
        id: "history",
        label: "Histórico de faturas enviadas",
        icon: HistoryIcon,
        action: () => closeMenuAndRun(onOpenHistory),
      },
      {
        id: "categories",
        label: "Categorias e apelidos",
        action: () => closeMenuAndRun(() => setActiveSheet("categories")),
      },
      {
        id: "export",
        label: "Exportar minhas análises",
        icon: ShareDownloadIcon,
        action: () => closeMenuAndRun(onExportAnalyses),
      },
    ],
    // Grupo 2: Indique um amigo, Idioma e região, Aparência
    [
      {
        id: "referral",
        label: "Indique um amigo — ganhe 1 mês",
        action: () => closeMenuAndRun(() => setActiveSheet("referral")),
      },
      {
        id: "language",
        label: "Idioma e região",
        action: () => closeMenuAndRun(() => setActiveSheet("language")),
      },
      {
        id: "appearance",
        label: "Aparência",
        icon: AppearanceIcon,
        action: () => closeMenuAndRun(() => setActiveSheet("appearance")),
      },
    ],
    // Grupo 3: Privacidade, Termos, Ajuda, Suporte
    [
      {
        id: "privacy",
        label: "Política de privacidade",
        icon: ShieldCheckIcon,
        action: () => closeMenuAndRun(() => setActiveSheet("privacy")),
      },
      {
        id: "terms",
        label: "Termos de uso",
        action: () => closeMenuAndRun(() => setActiveSheet("terms")),
      },
      {
        id: "help",
        label: "Central de ajuda",
        icon: HelpCircleIcon,
        action: () => closeMenuAndRun(() => setActiveSheet("help")),
      },
      {
        id: "support",
        label: "Fale com o suporte",
        action: () => closeMenuAndRun(() => setActiveSheet("support")),
      },
    ],
    // Grupo 4: Gerenciar subscrição (item isolado entre divisórias)
    [
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
    ],
    // Grupo 5: Avaliar o app, Sobre / versão do app
    [
      {
        id: "rate",
        label: "Avaliar o app na loja",
        action: () => closeMenuAndRun(() => setActiveSheet("rateApp")),
      },
      {
        id: "about",
        label: "Sobre / versão do app",
        action: () => closeMenuAndRun(() => setActiveSheet("about")),
      },
    ],
    // Grupo 6: Apagar minha conta (vermelho suave, contraste AA)
    [
      {
        id: "delete-account",
        label: "Apagar minha conta",
        icon: TrashIcon,
        danger: true,
        action: () =>
          closeMenuAndRun(() => {
            setIsConfirmingDelete(true);
            setActiveSheet("privacy");
          }),
      },
    ],
    // Grupo 7: Sair da conta (texto cinza)
    [
      {
        id: "sign-out",
        label: "Sair da conta",
        icon: LogOutIcon,
        action: () => closeMenuAndRun(onSignOut),
      },
    ],
  ];

  const renderMenuItemRow = (item: MenuItemConfig) => {
    const Icon = item.icon;
    const isDanger = Boolean(item.danger);

    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        onClick={item.action}
        className={`w-full min-h-[38px] px-3 py-2 rounded-[10px] text-left text-[13.5px] font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
          isDanger
            ? "text-[#DC2626] dark:text-[#F87171] hover:bg-[#FEF2F2] dark:hover:bg-[#381111]"
            : item.id === "sign-out"
              ? "text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]"
              : "text-[#171717] dark:text-[#FAFAFA] hover:bg-[#F5F5F5] dark:hover:bg-[#262626]"
        }`}
      >
        {Icon && (
          <Icon
            className={`w-4 h-4 shrink-0 ${
              isDanger
                ? "text-[#DC2626] dark:text-[#F87171]"
                : "text-[#6B7280] dark:text-[#9CA3AF]"
            }`}
          />
        )}
        <span className="truncate">{item.label}</span>
      </button>
    );
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
          className="relative w-8 h-8 rounded-full bg-[#F5F5F5] dark:bg-[#262626] border border-[#EAEAEA] dark:border-[#333] flex items-center justify-center text-[#52525B] dark:text-[#A1A1AA] hover:text-[#111111] dark:hover:text-white transition-colors cursor-pointer"
        >
          <UserIcon className="w-[17px] h-[17px]" />
          {isLoggedIn && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00C853] ring-2 ring-white dark:ring-[#121214]"
            />
          )}
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Menu do perfil"
            className={`absolute right-0 mt-2 ${
              !isLoggedIn ? "w-[260px]" : "w-[290px]"
            } max-h-[calc(100vh-92px)] overflow-y-auto rounded-[20px] bg-white dark:bg-[#1A1A1A] border border-[#EAEAEA] dark:border-[#2D2D2D] p-2 z-50 shadow-xl`}
          >
            {!isLoggedIn ? (
              /* Versão Deslogada do Menu */
              <div className="space-y-1">
                {/* Avatar Visitante */}
                <div className="px-3 pt-2 pb-2.5 flex items-center gap-2.5 border-b border-[#F0F0F0] dark:border-[#2A2A2A]">
                  <span
                    aria-hidden="true"
                    className="w-9 h-9 rounded-full bg-[#F5F5F5] dark:bg-[#2A2A2A] border border-[#EAEAEA] dark:border-[#333] flex items-center justify-center text-[#52525B] dark:text-[#A1A1AA] shrink-0"
                  >
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-[#1A1A1A] dark:text-white leading-tight">
                      Visitante
                    </p>
                    <p className="text-[11.5px] text-[#6B7280] dark:text-[#9CA3AF]">
                      Sem conta conectada
                    </p>
                  </div>
                </div>

                {/* Botão verde Criar Conta no topo */}
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => openAuthSheet("signup")}
                    className="w-full min-h-[40px] rounded-[12px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white text-[13.5px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <UserPlusIcon className="w-4 h-4" />
                    <span>Criar conta</span>
                  </button>
                </div>

                <hr className="my-1 border-t border-[#F0F0F0] dark:border-[#2A2A2A]" />

                {/* Lista deslogada */}
                <div className="space-y-0.5">
                  {[
                    { id: "help", label: "Central de ajuda", action: () => closeMenuAndRun(() => setActiveSheet("help")) },
                    { id: "privacy", label: "Política de privacidade", action: () => closeMenuAndRun(() => setActiveSheet("privacy")) },
                    { id: "terms", label: "Termos de uso", action: () => closeMenuAndRun(() => setActiveSheet("terms")) },
                    { id: "language", label: "Idioma e região", action: () => closeMenuAndRun(() => setActiveSheet("language")) },
                    { id: "appearance", label: "Aparência", action: () => closeMenuAndRun(() => setActiveSheet("appearance")) },
                    { id: "rate", label: "Avaliar o app na loja", action: () => closeMenuAndRun(() => setActiveSheet("rateApp")) },
                    { id: "about", label: "Sobre / versão do app", action: () => closeMenuAndRun(() => setActiveSheet("about")) },
                  ].map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={it.action}
                      className="w-full px-3 py-2 text-left text-[13.5px] text-[#171717] dark:text-[#E4E4E7] hover:bg-[#F5F5F5] dark:hover:bg-[#262626] rounded-[8px] transition-colors cursor-pointer"
                    >
                      {it.label}
                    </button>
                  ))}
                </div>

                <hr className="my-1 border-t border-[#F0F0F0] dark:border-[#2A2A2A]" />

                {/* Link Entrar em cinza no fim */}
                <button
                  type="button"
                  onClick={() => openAuthSheet("login")}
                  className="w-full px-3 py-2 text-left text-[13.5px] font-medium text-[#6B7280] dark:text-[#9CA3AF] hover:text-[#111111] dark:hover:text-white rounded-[8px] transition-colors cursor-pointer flex items-center gap-2"
                >
                  <LogInIcon className="w-4 h-4" />
                  <span>Entrar</span>
                </button>
              </div>
            ) : (
              /* Versão Logada com Ordem Estrita de Grupos e Divisórias */
              <div className="space-y-1">
                {/* [avatar + nome + e-mail] */}
                <div className="px-3 pt-2 pb-2.5 flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="w-10 h-10 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center font-bold text-[15px] shrink-0"
                  >
                    {authName ? authName.charAt(0).toUpperCase() : "U"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-[#1A1A1A] dark:text-white truncate">
                      {authName || "Usuário Taxly"}
                    </p>
                    <p className="text-[12px] text-[#6B7280] dark:text-[#9CA3AF] truncate">
                      {authEmail || "usuario@taxly.app"}
                    </p>
                  </div>
                </div>

                {/* Divisórias finas entre cada grupo */}
                {loggedInGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <hr className="my-1 border-t border-[#F0F0F0] dark:border-[#2A2A2A]" />
                    <div className="space-y-0.5">{group.map(renderMenuItemRow)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL / SHEET PRINCIPAL */}
      {activeSheet && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
          onClick={() => {
            setActiveSheet(null);
            setIsConfirmingDelete(false);
          }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] bg-white dark:bg-[#18181A] border border-[#EAEAEA] dark:border-[#2A2A2A] p-5 sm:p-6 max-h-[88vh] overflow-y-auto text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da janela com título e fechar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0F0] dark:border-[#27272A]">
              <h2 className="text-[18px] font-bold text-[#1A1A1A] dark:text-white">
                {activeSheet === "auth"
                  ? authMode === "login"
                    ? "Entrar na minha conta"
                    : "Criar conta grátis"
                  : activeSheet === "subscription"
                    ? "Seu plano"
                    : activeSheet === "cancelFlow"
                      ? cancelStep === "offer"
                        ? "Oferta especial"
                        : cancelStep === "reason"
                          ? "Motivo do cancelamento"
                          : cancelStep === "confirm"
                            ? "Confirmar cancelamento"
                            : "Cancelamento agendado"
                      : activeSheet === "notifications"
                        ? "Notificações"
                        : activeSheet === "appearance"
                          ? "Aparência"
                          : activeSheet === "privacy"
                            ? "Privacidade e dados"
                            : activeSheet === "referral"
                              ? "Indique e ganhe"
                              : activeSheet === "categories"
                                ? "Categorias e apelidos"
                                : activeSheet === "language"
                                  ? "Idioma e região"
                                  : activeSheet === "terms"
                                    ? "Termos de uso"
                                    : activeSheet === "support"
                                      ? "Fale com o suporte"
                                      : activeSheet === "rateApp"
                                        ? "Avaliar o Taxly"
                                        : "Sobre o Taxly"}
              </h2>

              <button
                type="button"
                aria-label="Fechar janela"
                onClick={() => {
                  setActiveSheet(null);
                  setIsConfirmingDelete(false);
                }}
                className="w-8 h-8 rounded-full bg-[#F5F5F5] dark:bg-[#27272A] hover:bg-[#EAEAEA] text-[#52525B] dark:text-[#A1A1AA] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* CONTEÚDO: TELA "SEU PLANO" */}
            {activeSheet === "subscription" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[18px] bg-[#FAFAFA] dark:bg-[#202022] border-2 border-[#00C853] p-4 text-left">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[16px] font-bold text-[#1A1A1A] dark:text-white">
                        {activePlan === "annual" ? "Plano Anual" : "Plano Mensal"}
                      </p>
                      <p className="text-[13.5px] text-[#00A844] dark:text-[#22C55E] font-semibold mt-0.5">
                        {discountApplied
                          ? "R$ 20,93/mês (30% OFF aplicado)"
                          : activePlan === "annual"
                            ? "R$ 179,90/ano"
                            : "R$ 29,90/mês"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#00C853]/15 text-[#00C853] px-3 py-1 text-[12px] font-bold">
                      Ativo ✓
                    </span>
                  </div>

                  <ul className="mt-3.5 pt-3 border-t border-[#EAEAEA] dark:border-[#2C2C2E] space-y-1.5 text-[12.5px] text-[#4B5563] dark:text-[#A1A1AA]">
                    <li className="flex items-center gap-1.5">
                      <span className="text-[#00C853]">✓</span> Auditorias ilimitadas de extratos e faturas
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-[#00C853]">✓</span> Alertas instantâneos de duplicidades e aumentos
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="text-[#00C853]">✓</span> Passo a passo guiado para solicitar estorno
                    </li>
                  </ul>
                </div>

                {/* Botão verde Continuar com o Premium */}
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                >
                  Continuar com o Premium
                </button>

                {/* Link cinza Quero cancelar no rodapé */}
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCancelStep("offer");
                      setActiveSheet("cancelFlow");
                    }}
                    className="text-[13px] text-[#8E8E93] hover:text-[#DC2626] underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    Quero cancelar
                  </button>
                </div>
              </div>
            )}

            {/* FLUXO DE CANCELAMENTO EM 4 TELAS (a, b, c, d) */}
            {activeSheet === "cancelFlow" && (
              <div className="mt-4">
                {/* (a) Oferta 30% off por 3 meses */}
                {cancelStep === "offer" && (
                  <div className="space-y-4">
                    <div className="rounded-[18px] bg-[#E8F8EE] dark:bg-[#062414] border border-[#B9E9C8] dark:border-[#0F4A2C] p-4 text-left">
                      <p className="text-[15px] font-bold text-[#008A39] dark:text-[#22C55E]">
                        Oferta exclusiva de retenção
                      </p>
                      <p className="text-[13.5px] text-[#14422A] dark:text-[#A7F3D0] mt-1 leading-snug">
                        Fique protegido com <strong>30% de desconto</strong> nos próximos 3 meses.
                      </p>
                      <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-[24px] font-extrabold text-[#008A39] dark:text-[#22C55E]">
                          R$ 20,93
                        </span>
                        <span className="text-[13px] text-[#6B7280] line-through">
                          R$ 29,90/mês
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDiscountApplied(true);
                        setActiveSheet("subscription");
                      }}
                      className="w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] text-white font-semibold text-[15px] flex items-center justify-center cursor-pointer shadow-md"
                    >
                      Aceitar desconto
                    </button>

                    <button
                      type="button"
                      onClick={() => setCancelStep("reason")}
                      className="w-full py-2 text-center text-[13px] text-[#8E8E93] hover:text-[#111111] dark:hover:text-white underline cursor-pointer"
                    >
                      Continuar cancelando
                    </button>
                  </div>
                )}

                {/* (b) Motivo da saída com checkboxes */}
                {cancelStep === "reason" && (
                  <div className="space-y-4">
                    <p className="text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                      Por favor, selecione os motivos para podermos melhorar:
                    </p>

                    <div className="space-y-2">
                      {[
                        "Achei o valor de R$ 29,90 alto",
                        "Não encontrei mais cobranças neste mês",
                        "Só precisava auditar uma fatura específica",
                        "Vou utilizar outro método de controle",
                        "Problemas técnicos no aplicativo",
                      ].map((reason) => (
                        <label
                          key={reason}
                          className="flex items-center gap-3 p-3 rounded-[12px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#EAEAEA] dark:border-[#2C2C2E] cursor-pointer text-[13.5px] text-[#111111] dark:text-white"
                        >
                          <input
                            type="checkbox"
                            checked={selectedReasons.includes(reason)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedReasons([...selectedReasons, reason]);
                              } else {
                                setSelectedReasons(selectedReasons.filter((r) => r !== reason));
                              }
                            }}
                            className="w-4 h-4 rounded text-[#00C853] accent-[#00C853]"
                          />
                          <span>{reason}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setCancelStep("confirm")}
                      className="w-full min-h-[48px] rounded-[16px] bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold text-[14.5px] flex items-center justify-center cursor-pointer"
                    >
                      Avançar
                    </button>
                  </div>
                )}

                {/* (c) Confirmação com aviso do que se perde */}
                {cancelStep === "confirm" && (
                  <div className="space-y-4">
                    <div className="rounded-[16px] bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] p-4 text-left">
                      <p className="text-[14px] font-bold text-[#DC2626] dark:text-[#F87171]">
                        Atenção: você perderá estes benefícios
                      </p>
                      <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-[#991B1B] dark:text-[#FCA5A5]">
                        <li>✕ Alertas em tempo real de novas assinaturas e tarifas</li>
                        <li>✕ Monitoramento contínuo de cobranças duplicadas</li>
                        <li>✕ Passo a passo guiado para solicitar estorno ao banco</li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      className="w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] text-white font-semibold text-[15px] flex items-center justify-center cursor-pointer shadow-md"
                    >
                      Manter meu plano
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onCancelSubscription();
                        setCancelStep("completed");
                      }}
                      className="w-full py-2 text-center text-[13px] text-[#DC2626] hover:underline cursor-pointer font-medium"
                    >
                      Sim, cancelar
                    </button>
                  </div>
                )}

                {/* (d) Tela final: Cancelamento agendado ✓ */}
                {cancelStep === "completed" && (
                  <div className="space-y-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-[#E8F8EE] dark:bg-[#062414] text-[#00C853] flex items-center justify-center mx-auto text-[26px]">
                      ✓
                    </div>
                    <p className="text-[17px] font-bold text-[#111111] dark:text-white">
                      Cancelamento agendado ✓
                    </p>
                    <p className="text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
                      Seu plano permanecerá ativo até o fim do período já pago. Nenhuma nova cobrança será realizada.
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        onOpenPaywall();
                        setActiveSheet(null);
                      }}
                      className="w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] text-white font-semibold text-[15px] flex items-center justify-center cursor-pointer shadow-md"
                    >
                      Reativar agora
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* CONTEÚDO: AUTH (LOGIN / CRIAR CONTA) */}
            {activeSheet === "auth" && (
              <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3.5" noValidate>
                <p className="text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA] leading-snug">
                  {authMode === "login"
                    ? "Acesse sua conta para ver seu histórico e gerenciar suas análises."
                    : "Crie sua conta para salvar faturas e acompanhar novas cobranças."}
                </p>

                {authMode === "signup" && (
                  <div>
                    <label className="block text-[13px] font-medium text-[#1A1A1A] dark:text-white mb-1">
                      Nome
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Ex: Mariana Silva"
                      className="w-full h-[46px] rounded-[14px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#E5E5E5] dark:border-[#333] px-3.5 text-[14px] text-[#111111] dark:text-white focus:outline-none focus:border-[#00C853]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] dark:text-white mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full h-[46px] rounded-[14px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#E5E5E5] dark:border-[#333] px-3.5 text-[14px] text-[#111111] dark:text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-[#1A1A1A] dark:text-white mb-1">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full h-[46px] rounded-[14px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#E5E5E5] dark:border-[#333] px-3.5 text-[14px] text-[#111111] dark:text-white focus:outline-none focus:border-[#00C853]"
                  />
                </div>

                {authError && (
                  <p className="text-[13px] text-[#DC2626] font-medium">{authError}</p>
                )}

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] text-white font-semibold text-[15px] transition-colors cursor-pointer"
                >
                  {authMode === "login" ? "Entrar" : "Criar conta"}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "signup" : "login");
                      setAuthError(null);
                    }}
                    className="text-[13px] text-[#6B7280] dark:text-[#A1A1AA] hover:text-[#00C853] underline cursor-pointer"
                  >
                    {authMode === "login"
                      ? "Não tem conta? Cadastre-se grátis"
                      : "Já tem conta? Clique para entrar"}
                  </button>
                </div>
              </form>
            )}

            {/* CONTEÚDO: NOTIFICAÇÕES */}
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
                    className="w-full rounded-[16px] bg-[#FAFAFA] dark:bg-[#202022] border border-[#EAEAEA] dark:border-[#2C2C2E] p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div>
                      <p className="text-[14.5px] font-semibold text-[#1A1A1A] dark:text-white">
                        {opt.title}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                        {opt.desc}
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center ${
                        opt.checked
                          ? "bg-[#00C853] justify-end"
                          : "bg-[#D4D4D8] dark:bg-[#444] justify-start"
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-white block" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* CONTEÚDO: APARÊNCIA */}
            {activeSheet === "appearance" && (
              <div className="mt-4 space-y-2">
                {[
                  { id: "system", label: "Padrão do sistema" },
                  { id: "light", label: "Modo Claro" },
                  { id: "dark", label: "Modo Escuro" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onChangeAppearance(mode.id as AppearanceMode)}
                    className={`w-full p-3.5 rounded-[14px] border text-left text-[14px] font-medium flex items-center justify-between cursor-pointer ${
                      appearanceMode === mode.id
                        ? "border-[#00C853] bg-[#E8F8EE] dark:bg-[#062414] text-[#008A39] dark:text-[#22C55E]"
                        : "border-[#EAEAEA] dark:border-[#2C2C2E] bg-[#FAFAFA] dark:bg-[#202022] text-[#111111] dark:text-white"
                    }`}
                  >
                    <span>{mode.label}</span>
                    {appearanceMode === mode.id && <CheckIcon className="w-4 h-4 text-[#00C853]" />}
                  </button>
                ))}
              </div>
            )}

            {/* CONTEÚDO: PRIVACIDADE / APAGAR DADOS */}
            {activeSheet === "privacy" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[16px] bg-[#FAFAFA] dark:bg-[#202022] border border-[#EAEAEA] dark:border-[#2C2C2E] p-4 space-y-2 text-[13.5px] leading-relaxed text-[#52525B] dark:text-[#A1A1AA]">
                  <p>
                    <strong className="font-semibold text-[#1A1A1A] dark:text-white">
                      Mascaramento automático:
                    </strong>{" "}
                    CPF, número de cartão e dados bancários são mascarados antes da leitura de cobranças.
                  </p>
                  <p>
                    <strong className="font-semibold text-[#1A1A1A] dark:text-white">
                      Zero venda de dados:
                    </strong>{" "}
                    não vendemos nem compartilhamos suas faturas com terceiros (LGPD).
                  </p>
                </div>

                {isConfirmingDelete ? (
                  <div className="rounded-[16px] border border-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#2A1212] p-4">
                    <p className="text-[13.5px] font-bold text-[#DC2626] dark:text-[#F87171]">
                      Confirmar exclusão de dados e conta?
                    </p>
                    <p className="mt-1 text-[12.5px] text-[#7F1D1D] dark:text-[#FCA5A5]">
                      Remove o histórico de cobranças e análises salvas permanentemente.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 min-h-[40px] rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[#EAEAEA] dark:border-[#333] text-[13px] font-semibold text-[#1A1A1A] dark:text-white cursor-pointer"
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
                        className="flex-1 min-h-[40px] rounded-[12px] bg-[#DC2626] text-[13px] font-semibold text-white cursor-pointer"
                      >
                        Apagar definitivamente
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[14px] bg-[#FEF2F2] dark:bg-[#2A1212] border border-[#FCA5A5] dark:border-[#5C1D1D] text-[#DC2626] dark:text-[#F87171] text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Apagar meus dados e análises</span>
                  </button>
                )}
              </div>
            )}

            {/* CONTEÚDO: INDIQUE E GANHE */}
            {activeSheet === "referral" && (
              <div className="mt-4 space-y-3.5 text-center">
                <div className="w-12 h-12 rounded-full bg-[#00C853]/15 text-[#00C853] flex items-center justify-center mx-auto text-[22px]">
                  🎁
                </div>
                <h3 className="text-[16px] font-bold text-[#1A1A1A] dark:text-white">
                  Ganhe 1 mês grátis para cada amigo
                </h3>
                <p className="text-[13px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
                  Envie seu link de indicação. Quando seu amigo analisar o primeiro extrato, você ganha 30 dias de Taxly Premium gratuito.
                </p>
                <div className="p-3 rounded-[12px] bg-[#F5F5F5] dark:bg-[#202022] font-mono text-[12px] text-[#111111] dark:text-white border border-[#EAEAEA] dark:border-[#333]">
                  https://taxly.app/convite?ref=user_taxly
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSheet(null)}
                  className="w-full min-h-[44px] rounded-[14px] bg-[#00C853] text-white font-semibold text-[14px] cursor-pointer"
                >
                  Copiar link de convite
                </button>
              </div>
            )}

            {/* CONTEÚDO: DEMAIS ITENS DE INFORMAÇÃO */}
            {(activeSheet === "categories" ||
              activeSheet === "language" ||
              activeSheet === "terms" ||
              activeSheet === "help" ||
              activeSheet === "support" ||
              activeSheet === "rateApp" ||
              activeSheet === "about") && (
              <div className="mt-4 space-y-3 text-left">
                {activeSheet === "categories" && (
                  <p className="text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
                    Personalize os nomes de cobranças recorrentes detectadas para organizá-las no seu cofre.
                  </p>
                )}
                {activeSheet === "language" && (
                  <div className="p-3.5 rounded-[14px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#EAEAEA] dark:border-[#333] flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#111111] dark:text-white">Português (Brasil)</span>
                    <CheckIcon className="w-4 h-4 text-[#00C853]" />
                  </div>
                )}
                {activeSheet === "terms" && (
                  <p className="text-[13px] text-[#6B7280] dark:text-[#A1A1AA] leading-relaxed">
                    O Taxly atua exclusivamente como assistente de auditoria de extratos e faturas para pessoas físicas e jurídicas. Seus documentos são processados de forma privada.
                  </p>
                )}
                {activeSheet === "help" && (
                  <div className="space-y-2 text-[13px]">
                    <div className="p-3 rounded-[12px] bg-[#F5F5F5] dark:bg-[#202022] border border-[#EAEAEA] dark:border-[#333]">
                      <p className="font-semibold text-[#111111] dark:text-white">Como recuperar cobranças indevidas?</p>
                      <p className="text-[#6B7280] dark:text-[#A1A1AA] mt-1">O Taxly fornece o texto exato para solicitar estorno no chat do seu banco.</p>
                    </div>
                  </div>
                )}
                {activeSheet === "support" && (
                  <div className="space-y-3 text-center">
                    <p className="text-[13.5px] text-[#6B7280] dark:text-[#A1A1AA]">
                      Precisa de ajuda com uma cobrança ou análise?
                    </p>
                    <a
                      href="mailto:suporte@taxly.app"
                      className="inline-block py-2.5 px-4 rounded-[12px] bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-semibold text-[13.5px]"
                    >
                      suporte@taxly.app
                    </a>
                  </div>
                )}
                {activeSheet === "rateApp" && (
                  <div className="text-center space-y-3 py-2">
                    <div className="flex justify-center gap-1 text-[22px] text-[#F59E0B]">
                      ★★★★★
                    </div>
                    <p className="text-[13.5px] text-[#111111] dark:text-white font-medium">
                      Gostou de economizar com o Taxly?
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveSheet(null)}
                      className="w-full min-h-[44px] rounded-[14px] bg-[#00C853] text-white font-semibold text-[14px]"
                    >
                      Avaliar na loja
                    </button>
                  </div>
                )}
                {activeSheet === "about" && (
                  <div className="space-y-2 text-[13px] text-[#6B7280] dark:text-[#A1A1AA]">
                    <p><strong className="text-[#111111] dark:text-white">Taxly Auditoria Bancária</strong></p>
                    <p>Versão 2.4.0 (Build 2026.11)</p>
                    <p>Desenvolvido para proteger os extratos de todos os brasileiros.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
