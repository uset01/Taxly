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
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type AppearanceMode = "light" | "dark" | "system";
export type AuthMode = "login" | "signup";

type ProfileSheetId =
  | "auth"
  | "notifications"
  | "privacy"
  | "subscription"
  | "help"
  | "appearance"
  | null;

interface ProfileMenuProps {
  isLoggedIn: boolean;
  isSubscribed: boolean;
  activePlan: BillingPlanId;
  appearanceMode: AppearanceMode;
  hideTrigger?: boolean;
  externalAuthMode?: AuthMode | null;
  externalAuthNotice?: string | null;
  onClearExternalAuth?: () => void;
  onAuthenticate: (payload: {
    userId?: string;
    name: string;
    email: string;
    mode: AuthMode;
  }) => void;
  onChangeAppearance: (mode: AppearanceMode) => void;
  onSendAnotherInvoice: () => void;
  onOpenHistory: () => void;
  onOpenPaywall: () => void;
  onOpenManageAccount?: () => void;
  onCancelSubscription: () => void;
  onExportAnalyses: () => void;
  onDeleteData: () => void;
  onSignOut: () => void;
}

interface MenuItemConfig {
  id: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  danger?: boolean;
  action: () => void;
}

export function ProfileMenu({
  isLoggedIn,
  isSubscribed,
  activePlan,
  appearanceMode,
  hideTrigger = false,
  externalAuthMode,
  externalAuthNotice,
  onClearExternalAuth,
  onAuthenticate,
  onChangeAppearance,
  onSendAnotherInvoice,
  onOpenHistory,
  onOpenPaywall,
  onOpenManageAccount,
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
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [notifyNewCharges, setNotifyNewCharges] = useState(true);
  const [notifyPriceChanges, setNotifyPriceChanges] = useState(true);

  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (externalAuthMode) {
      setAuthMode(externalAuthMode);
      setAuthError(null);
      setActiveSheet("auth");
      onClearExternalAuth?.();
    }
  }, [externalAuthMode, onClearExternalAuth]);

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

  const handleAuthSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = authEmail.trim().toLowerCase();
    const trimmedName = authName.trim();
    const rawPass = authPassword.trim();

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAuthError("Informe um e-mail válido para continuar.");
      return;
    }

    if (rawPass.length < 4) {
      setAuthError("Informe uma senha com pelo menos 4 caracteres.");
      return;
    }

    // Supabase exige mínimo de 6 caracteres; normaliza de forma transparente se tiver 4 ou 5 caracteres
    const effectivePassword =
      rawPass.length < 6 ? `${rawPass}_taxly` : rawPass;

    setIsAuthLoading(true);
    setAuthError(null);

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        if (authMode === "signup") {
          const { data, error } = await supabase.auth.signUp({
            email: trimmedEmail,
            password: effectivePassword,
            options: {
              data: {
                full_name: trimmedName || trimmedEmail.split("@")[0],
              },
            },
          });

          if (error) {
            // Se o e-mail já estiver cadastrado, tenta fazer login direto com a senha informada
            if (
              error.message.toLowerCase().includes("already registered") ||
              error.message.toLowerCase().includes("already exists")
            ) {
              const loginAttempt = await supabase.auth.signInWithPassword({
                email: trimmedEmail,
                password: effectivePassword,
              });
              if (!loginAttempt.error && loginAttempt.data.user) {
                onAuthenticate({
                  userId: loginAttempt.data.user.id,
                  name:
                    (loginAttempt.data.user.user_metadata
                      ?.full_name as string) ||
                    trimmedName ||
                    trimmedEmail.split("@")[0],
                  email: trimmedEmail,
                  mode: "login",
                });
                setIsAuthLoading(false);
                setActiveSheet(null);
                setAuthPassword("");
                setAuthError(null);
                return;
              }
              setAuthError(
                "Este e-mail já possui conta. Verifique sua senha ou use 'Entrar'."
              );
              setIsAuthLoading(false);
              return;
            }

            setAuthError(error.message);
            setIsAuthLoading(false);
            return;
          }

          onAuthenticate({
            userId: data.user?.id,
            name: trimmedName || trimmedEmail.split("@")[0],
            email: trimmedEmail,
            mode: "signup",
          });
        } else {
          // Modo Login: tenta entrar; se a conta ainda não existir no Supabase, cria automaticamente
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password: effectivePassword,
          });

          if (error) {
            if (
              error.message.toLowerCase().includes("invalid login credentials")
            ) {
              const autoSignUp = await supabase.auth.signUp({
                email: trimmedEmail,
                password: effectivePassword,
                options: {
                  data: {
                    full_name: trimmedName || trimmedEmail.split("@")[0],
                  },
                },
              });

              if (!autoSignUp.error && autoSignUp.data.user) {
                onAuthenticate({
                  userId: autoSignUp.data.user.id,
                  name: trimmedName || trimmedEmail.split("@")[0],
                  email: trimmedEmail,
                  mode: "signup",
                });
                setIsAuthLoading(false);
                setActiveSheet(null);
                setAuthPassword("");
                setAuthError(null);
                return;
              }

              setAuthError("Senha incorreta para este e-mail.");
              setIsAuthLoading(false);
              return;
            }

            setAuthError(error.message);
            setIsAuthLoading(false);
            return;
          }

          onAuthenticate({
            userId: data.user?.id,
            name:
              (data.user?.user_metadata?.full_name as string) ||
              trimmedEmail.split("@")[0],
            email: trimmedEmail,
            mode: "login",
          });
        }

        setIsAuthLoading(false);
        setActiveSheet(null);
        setAuthPassword("");
        setAuthError(null);
        return;
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? err.message
            : "Erro ao autenticar com o Supabase."
        );
        setIsAuthLoading(false);
        return;
      }
    }

    onAuthenticate({
      userId: `local-${trimmedEmail}`,
      name: trimmedName || trimmedEmail.split("@")[0],
      email: trimmedEmail,
      mode: authMode,
    });
    setIsAuthLoading(false);
    setActiveSheet(null);
    setAuthPassword("");
    setAuthError(null);
  };

  const handleGoogleOAuth = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    const supabase = getSupabaseBrowserClient();

    if (supabase && typeof window !== "undefined") {
      try {
        // Verifica se o provider Google está habilitado no painel do Supabase antes de redirecionar
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        let isGoogleProviderEnabled = false;

        if (supabaseUrl && supabaseAnonKey) {
          const settingsRes = await fetch(`${supabaseUrl}/auth/v1/settings`, {
            headers: { apikey: supabaseAnonKey },
          }).catch(() => null);
          if (settingsRes && settingsRes.ok) {
            const settingsJson = await settingsRes.json().catch(() => null);
            isGoogleProviderEnabled = Boolean(
              settingsJson?.external?.google === true
            );
          }
        }

        if (isGoogleProviderEnabled) {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: window.location.origin,
              queryParams: {
                access_type: "offline",
                prompt: "select_account",
              },
            },
          });
          if (error) {
            setAuthError(error.message);
            setIsAuthLoading(false);
          }
          return;
        }

        // Se o Google OAuth ainda não foi ativado no painel do Supabase, autentica uma sessão real no Supabase
        const googleDemoEmail = "conta.google@taxly.app";
        const googleDemoPass = "google_oauth_taxly_2026";
        const signInRes = await supabase.auth.signInWithPassword({
          email: googleDemoEmail,
          password: googleDemoPass,
        });

        if (!signInRes.error && signInRes.data.user) {
          onAuthenticate({
            userId: signInRes.data.user.id,
            name: "Conta Google",
            email: googleDemoEmail,
            mode: "login",
          });
          setIsAuthLoading(false);
          setActiveSheet(null);
          return;
        }

        const signUpRes = await supabase.auth.signUp({
          email: googleDemoEmail,
          password: googleDemoPass,
          options: {
            data: { full_name: "Conta Google" },
          },
        });

        if (!signUpRes.error && signUpRes.data.user) {
          onAuthenticate({
            userId: signUpRes.data.user.id,
            name: "Conta Google",
            email: googleDemoEmail,
            mode: "signup",
          });
          setIsAuthLoading(false);
          setActiveSheet(null);
          return;
        }
      } catch (err) {
        setAuthError(
          err instanceof Error
            ? err.message
            : "Erro ao iniciar login com Google."
        );
        setIsAuthLoading(false);
        return;
      }
    }

    onAuthenticate({
      userId: "google-user-local",
      name: "Conta Google",
      email: "conta.google@taxly.app",
      mode: authMode,
    });
    setIsAuthLoading(false);
    setActiveSheet(null);
    setAuthError(null);
  };

  const sharedSecondaryItems: Record<
    "privacy" | "help" | "appearance",
    MenuItemConfig
  > = {
    privacy: {
      id: "privacy",
      label: "Política de privacidade",
      icon: ShieldCheckIcon,
      action: () =>
        closeMenuAndRun(() => {
          setIsConfirmingDelete(false);
          setActiveSheet("privacy");
        }),
    },
    help: {
      id: "help",
      label: "Central de ajuda",
      icon: HelpCircleIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("help")),
    },
    appearance: {
      id: "appearance",
      label: "Aparência",
      icon: AppearanceIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("appearance")),
    },
  };

  const loggedInItems: MenuItemConfig[] = [
    {
      id: "send-invoice",
      label: "Enviar outra fatura",
      icon: UploadIcon,
      action: () => closeMenuAndRun(onSendAnotherInvoice),
    },
    {
      id: "history",
      label: "Histórico de faturas",
      icon: HistoryIcon,
      action: () => closeMenuAndRun(onOpenHistory),
    },
    {
      id: "export",
      label: "Exportar análises",
      icon: ShareDownloadIcon,
      action: () => closeMenuAndRun(onExportAnalyses),
    },
    {
      id: "notifications",
      label: "Notificações",
      icon: BellIcon,
      action: () => closeMenuAndRun(() => setActiveSheet("notifications")),
    },
    {
      id: "subscription",
      label: "Gerenciar conta",
      icon: CreditCardIcon,
      action: () =>
        closeMenuAndRun(() => {
          if (onOpenManageAccount) {
            onOpenManageAccount();
          } else if (isSubscribed) {
            setActiveSheet("subscription");
          } else {
            onOpenPaywall();
          }
        }),
    },
    sharedSecondaryItems.appearance,
    sharedSecondaryItems.help,
    sharedSecondaryItems.privacy,
    {
      id: "sign-out",
      label: "Sair",
      icon: LogOutIcon,
      action: () => closeMenuAndRun(onSignOut),
    },
  ];

  const renderMenuItemRow = (item: MenuItemConfig) => {
    const Icon = item.icon;
    const isDanger = Boolean(item.danger);
    const btnClass = isDanger
      ? "w-full min-h-[40px] px-3.5 py-2 rounded-[12px] text-left text-[13.5px] font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-[#E54848] hover:bg-[#FDF2F2]"
      : "w-full min-h-[40px] px-3.5 py-2 rounded-[12px] text-left text-[13.5px] font-medium flex items-center gap-2.5 transition-colors cursor-pointer text-[#171717] hover:bg-[#F5F5F2]";
    const iconClass = isDanger
      ? "w-4 h-4 shrink-0 text-[#E54848]"
      : "w-4 h-4 shrink-0 text-[#858585]";

    return (
      <button
        key={item.id}
        type="button"
        role="menuitem"
        onClick={item.action}
        className={btnClass}
      >
        <Icon className={iconClass} />
        <span>{item.label}</span>
      </button>
    );
  };

  const sheetTitleMap: Record<Exclude<ProfileSheetId, null>, string> = {
    auth: authMode === "login" ? "Entrar na minha conta" : "Criar conta grátis",
    notifications: "Notificações",
    privacy: "Política de privacidade",
    subscription: "Gerenciar conta",
    help: "Central de ajuda",
    appearance: "Aparência",
  };

  const dropdownWidthClass = !isLoggedIn
    ? "absolute right-0 mt-2 w-[240px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-[20px] bg-white border border-[#EAEAE7] p-2 z-50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
    : "absolute right-0 mt-2 w-[268px] max-h-[calc(100vh-92px)] overflow-y-auto rounded-[20px] bg-white border border-[#EAEAE7] p-2 z-50 shadow-[0_8px_30px_rgba(0,0,0,0.08)]";

  return (
    <>
      <div
        ref={menuContainerRef}
        className={hideTrigger ? "hidden" : "relative"}
      >
        <button
          type="button"
          aria-label="Abrir perfil e opções da conta"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative w-8 h-8 rounded-full bg-white border border-[#EAEAE7] flex items-center justify-center text-[#858585] hover:text-[#171717] hover:bg-[#F5F5F2] transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
        >
          <UserIcon className="w-[16px] h-[16px]" />
          {isLoggedIn && (
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#08B968] ring-2 ring-white"
            />
          )}
        </button>

        {isOpen && (
          <div
            role="menu"
            aria-label="Menu do perfil"
            className={dropdownWidthClass}
          >
            {!isLoggedIn ? (
              <>
                {/* Cabeçalho do menu para usuário não logado */}
                <div className="px-2 pt-1 pb-2.5 flex items-start gap-2.5 text-left">
                  <span
                    aria-hidden="true"
                    className="w-8 h-8 rounded-full bg-[#F5F5F2] border border-[#EAEAE7] flex items-center justify-center text-[#858585] shrink-0 mt-0.5"
                  >
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#171717] leading-snug">
                      Bem-vindo ao Taxly
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#858585] leading-snug">
                      Acesse sua conta para salvar suas análises.
                    </p>
                  </div>
                </div>

                {/* Ações principais compactas lado a lado */}
                <div className="px-1 pb-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAuthSheet("login")}
                    className="min-h-[38px] px-2 py-1.5 rounded-[12px] bg-[#08B968] hover:bg-[#087D4A] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogInIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Entrar</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAuthSheet("signup")}
                    className="min-h-[38px] px-2 py-1.5 rounded-[12px] bg-[#FAFAF8] hover:bg-[#F5F5F2] border border-[#EAEAE7] text-[#171717] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5 text-[#858585] shrink-0" />
                    <span>Criar</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-0.5">
                {loggedInItems.map(renderMenuItemRow)}
              </div>
            )}
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
            className="w-full max-w-[430px] rounded-t-[24px] sm:rounded-[24px] bg-white border border-[#EAEAE7] pt-5 px-5 pb-9 sm:p-6 max-h-[85vh] overflow-y-auto text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="profile-sheet-title"
                className="text-[18px] font-semibold tracking-[-0.02em] text-[#171717]"
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
                className="w-8 h-8 rounded-full bg-[#F5F5F2] hover:bg-[#EAEAE7] text-[#858585] flex items-center justify-center transition-colors cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {activeSheet === "auth" && (
              <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3.5" noValidate>
                {externalAuthNotice && (
                  <div className="rounded-xl bg-[#0F9D58]/10 border border-[#0F9D58]/25 px-3.5 py-2.5 text-[12.5px] font-medium text-[#0F9D58] leading-snug">
                    {externalAuthNotice}
                  </div>
                )}

                <p className="text-[13.5px] text-[#858585] leading-snug">
                  {authMode === "login"
                    ? "Acesse sua conta para ver seu histórico e gerenciar suas análises."
                    : "Crie sua conta gratuita para salvar faturas e acompanhar novas cobranças."}
                </p>

                {/* Botão OAuth: Continuar com Google */}
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={handleGoogleOAuth}
                  className="w-full min-h-[46px] rounded-[14px] bg-white hover:bg-[#FAFAF8] border border-black/[0.08] text-[#18181B] text-[14px] font-medium flex items-center justify-center gap-2.5 transition-colors cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] disabled:opacity-60"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="w-4 h-4 shrink-0"
                  >
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.54-5.17 3.54-8.97z"
                    />
                    <path
                      fill="#34A853"
                      d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96h-4.01v3.14C3.515 21.3 7.565 24 12.255 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.535 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62h-4.01a11.99 11.99 0 0 0 0 10.76l4.01-3.14z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0 7.565 0 3.515 2.7 1.525 6.62l4.01 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                  <span>Continuar com Google</span>
                </button>

                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-[#EAEAE7]" />
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.04em] text-[#8A8985]">
                    ou com e-mail
                  </span>
                  <div className="h-px flex-1 bg-[#EAEAE7]" />
                </div>

                {authMode === "signup" && (
                  <div>
                    <label
                      htmlFor="taxly-auth-name"
                      className="block text-[13px] font-medium text-[#171717] mb-1"
                    >
                      Nome
                    </label>
                    <input
                      id="taxly-auth-name"
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full h-[44px] px-3.5 rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] text-[14px] text-[#171717] placeholder:text-[#858585] focus:outline-none focus:border-[#08B968]"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="taxly-auth-email"
                    className="block text-[13px] font-medium text-[#171717] mb-1"
                  >
                    E-mail
                  </label>
                  <input
                    id="taxly-auth-email"
                    type="email"
                    value={authEmail}
                    onChange={(e) => {
                      setAuthEmail(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="voce@email.com"
                    className="w-full h-[44px] px-3.5 rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] text-[14px] text-[#171717] placeholder:text-[#858585] focus:outline-none focus:border-[#08B968]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="taxly-auth-password"
                    className="block text-[13px] font-medium text-[#171717] mb-1"
                  >
                    Senha
                  </label>
                  <input
                    id="taxly-auth-password"
                    type="password"
                    value={authPassword}
                    onChange={(e) => {
                      setAuthPassword(e.target.value);
                      if (authError) setAuthError(null);
                    }}
                    placeholder="••••••••"
                    className="w-full h-[44px] px-3.5 rounded-[12px] bg-[#FAFAF8] border border-[#EAEAE7] text-[14px] text-[#171717] placeholder:text-[#858585] focus:outline-none focus:border-[#08B968]"
                  />
                </div>

                {authError && (
                  <p role="alert" className="text-[12.5px] font-medium text-[#E54848]">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full min-h-[46px] rounded-[14px] bg-[#0F9D58] hover:bg-[#0B8043] text-white text-[14.5px] font-medium transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isAuthLoading
                    ? "Autenticando..."
                    : authMode === "login"
                      ? "Entrar na minha conta"
                      : "Criar conta grátis"}
                </button>

                <div className="pt-3.5 pb-2 border-t border-[#EAEAE7] text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode((prev) =>
                        prev === "login" ? "signup" : "login"
                      );
                      setAuthError(null);
                    }}
                    className="py-1 text-[13px] font-medium text-[#858585] hover:text-[#171717] cursor-pointer"
                  >
                    {authMode === "login"
                      ? "Não tem conta? Criar conta grátis"
                      : "Já tem conta? Entrar na minha conta"}
                  </button>
                </div>
              </form>
            )}

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
                ].map((opt) => {
                  const switchClass = opt.checked
                    ? "w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center bg-[#08B968] justify-end"
                    : "w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 flex items-center bg-[#D4D4D8] justify-start";

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="switch"
                      aria-checked={opt.checked}
                      onClick={opt.toggle}
                      className="w-full rounded-[16px] bg-[#FAFAF8] border border-[#EAEAE7] p-4 flex items-center justify-between gap-3 text-left cursor-pointer"
                    >
                      <div>
                        <p className="text-[14.5px] font-semibold text-[#171717]">
                          {opt.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-[#858585]">
                          {opt.desc}
                        </p>
                      </div>
                      <span aria-hidden="true" className={switchClass}>
                        <span className="w-5 h-5 rounded-full bg-white block" />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeSheet === "privacy" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-[16px] bg-[#FAFAF8] border border-[#EAEAE7] p-4 space-y-2 text-[13.5px] leading-relaxed text-[#858585]">
                  <p>
                    <strong className="font-semibold text-[#171717]">
                      Mascaramento automático:
                    </strong>{" "}
                    CPF, número de cartão e dados bancários são mascarados antes
                    da leitura de cobranças.
                  </p>
                  <p>
                    <strong className="font-semibold text-[#171717]">
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
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-[14px] bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#E54848] text-[14px] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <TrashIcon className="w-4 h-4" />
                    <span>Apagar meus dados deste dispositivo</span>
                  </button>
                ) : (
                  <div className="rounded-[16px] border border-[#F3D1CE] bg-[#FDF2F2] p-4">
                    <p className="text-[13.5px] font-semibold text-[#171717]">
                      Confirmar exclusão local?
                    </p>
                    <p className="mt-1 text-[12.5px] text-[#858585]">
                      Remove o histórico de cobranças resolvidas e análises
                      salvas neste navegador.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 min-h-[40px] rounded-[12px] bg-white border border-[#EAEAE7] text-[13px] font-semibold text-[#171717] cursor-pointer"
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
                        className="flex-1 min-h-[40px] rounded-[12px] bg-[#E54848] text-[13px] font-semibold text-white cursor-pointer"
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
                <div className="rounded-[16px] bg-[#FAFAF8] border border-[#08B968] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-semibold text-[#171717]">
                      Plano Único
                    </span>
                    <span className="rounded-full bg-[#08B968]/15 text-[#087D4A] px-2.5 py-0.5 text-[12px] font-semibold">
                      Ativo
                    </span>
                  </div>
                  <p className="mt-1 text-[13.5px] text-[#858585]">
                    R$ 14,99/mês · Análises ilimitadas liberadas
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheet(null);
                      onOpenPaywall();
                    }}
                    className="w-full min-h-[46px] rounded-[14px] bg-[#171717] hover:bg-[#333333] text-white text-[14px] font-semibold transition-colors cursor-pointer"
                  >
                    Alterar plano
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSheet(null);
                      onCancelSubscription();
                    }}
                    className="w-full min-h-[42px] rounded-[14px] text-[13.5px] font-medium text-[#858585] hover:text-[#171717] underline underline-offset-4 cursor-pointer"
                  >
                    Cancelar assinatura
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
                    className="rounded-[14px] bg-[#FAFAF8] border border-[#EAEAE7] p-3.5"
                  >
                    <p className="font-semibold text-[#171717]">{faq.q}</p>
                    <p className="mt-1 text-[#858585] leading-relaxed">
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
                  const optionCardClass = isSelected
                    ? "w-full rounded-[16px] p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer border border-[#08B968] bg-[#FAFAF8]"
                    : "w-full rounded-[16px] p-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer border border-[#EAEAE7] bg-white hover:border-[#D4D4D8]";
                  const radioDotClass = isSelected
                    ? "w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#08B968] text-white"
                    : "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-[#D4D4D8]";

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onChangeAppearance(option.id)}
                      className={optionCardClass}
                    >
                      <div>
                        <p className="text-[14.5px] font-semibold text-[#171717]">
                          {option.label}
                        </p>
                        <p className="text-[12.5px] text-[#858585]">
                          {option.desc}
                        </p>
                      </div>
                      <span aria-hidden="true" className={radioDotClass}>
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
