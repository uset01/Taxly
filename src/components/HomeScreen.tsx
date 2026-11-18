"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import {
  AlertCircleIcon,
  BarcodeIcon,
  CalculatorSumIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DocumentScannerIcon,
  HistoryIcon,
  HomeIcon,
  InvoiceDocIcon,
  PixIcon,
  PlusIcon,
  SearchIcon,
  ShareDownloadIcon,
  TrashIcon,
} from "@/components/icons";
import { PartialResultScreen } from "@/components/PartialResultScreen";
import { BillingPlanId, PaywallScreen } from "@/components/PaywallScreen";
import {
  AppearanceMode,
  AuthMode,
  ProfileMenu,
} from "@/components/ProfileMenu";
import { ResultScreen } from "@/components/ResultScreen";
import { LiveCounter } from "@/components/LiveCounter";
import { ConnectBankScreen } from "@/components/ConnectBankScreen";
import { LossQuizScreen } from "@/components/LossQuizScreen";
import { ManageAccountScreen } from "@/components/ManageAccountScreen";
import {
  Charge,
  UNLOCKED_PARTIAL_CHARGES,
  formatBRL,
} from "@/data/charges";
import {
  AnalysisStageId,
  InvoiceAnalysisError,
  analyzeInvoice,
} from "@/lib/analyze-invoice";
import {
  AnalysisSummaryData,
  DEFAULT_SAMPLE_ANALYSIS,
  analyzeDocumentContent,
} from "@/lib/detect-charges";
import {
  type AuditWithCharges,
  type UserProfile,
  fetchUserAuditsHistory,
  fetchUserProfile,
  getSupabaseBrowserClient,
  readLocalProfile,
  updateDetectedChargeResolved,
  uploadBillAndSaveAudit,
  writeLocalProfile,
} from "@/lib/supabase";

export type ScreenState =
  | "empty"
  | "analyzing"
  | "partialResult"
  | "paywall"
  | "result"
  | "connectBank"
  | "quiz"
  | "manageAccount";

const RESOLVED_STORAGE_KEY = "vazamentozero:resolved_charge_ids";

const BENEFITS = [
  {
    text: "Joga a fatura ou extrato e vê tudo numa lista limpa",
    Icon: InvoiceDocIcon,
  },
  {
    text: "Acha valores duplicados (mesmo valor, mesma data)",
    Icon: CopyIcon,
  },
  {
    text: "Soma quanto foi de tarifa este mês",
    Icon: CalculatorSumIcon,
  },
];

export type VaultReceiptType = "PIX" | "Boleto" | "Fatura";
export type VaultFilterCategory =
  | "Todos"
  | "PIX"
  | "Boletos"
  | "Faturas"
  | "Saúde/IR";

export interface VaultReceiptItem {
  id: string;
  receiver: string;
  date: string;
  tag: string;
  amount: number;
  type: VaultReceiptType;
  isHealthIR?: boolean;
  maskedDocument: string;
  institution: string;
  extractedText: string;
}

const VAULT_FILTER_PILLS: VaultFilterCategory[] = [
  "Todos",
  "PIX",
  "Boletos",
  "Faturas",
  "Saúde/IR",
];

const AVAILABLE_MODAL_TAGS = [
  "#Carro",
  "#Saúde",
  "#Moradia",
  "#Cartão",
  "#ImpostoDeRenda",
];

const INVOICE_LEAK_ALERTS = [
  "Assinatura esquecida: Streaming Vídeo (R$ 39,90/mês) - Cobrado há 8 meses seguidos.",
  "Cobrança duplicada: App de Entrega (R$ 44,90) duas vezes no dia 14 Out.",
  "Tarifa oculta: Seguro Fatura Protegida (R$ 19,90) - Cobrança opcional cancelável.",
];

const VAULT_STORAGE_KEY = "taxly:vault_receipts_v1";
const LAST_ANALYSIS_STORAGE_KEY = "taxly:last_analysis_v1";

const INITIAL_VAULT_RECEIPTS: VaultReceiptItem[] = [];

const BLURRED_TEASER_VAULT_ROWS = [
  {
    id: "blur-preview-1",
    type: "Fatura" as const,
    receiver: "Auditoria Mensal · Cartão Principal",
    date: "Mês anterior",
    tag: "#Cartão",
    amount: "R$ 189,90",
  },
  {
    id: "blur-preview-2",
    type: "PIX" as const,
    receiver: "Comprovante PIX · Saúde & Dedutível",
    date: "Histórico IR",
    tag: "#Saúde",
    amount: "R$ 420,00",
  },
  {
    id: "blur-preview-3",
    type: "Boleto" as const,
    receiver: "Comparativo de Reajuste Recorrente",
    date: "Monitoramento",
    tag: "#Moradia",
    amount: "R$ 890,50",
  },
];

function formatTodayShortPtBr(): string {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = months[now.getMonth()] || "Nov";
  const year = now.getFullYear();
  return `${day} ${month} ${year}`;
}

const ANALYSIS_STEPS: { id: AnalysisStageId; label: string }[] = [
  { id: "reading", label: "Lendo documento…" },
  { id: "masking", label: "Mascarando seus dados…" },
  { id: "identifying", label: "Identificando assinaturas…" },
  { id: "duplicates", label: "Procurando duplicadas e taxas…" },
];

export function HomeScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("empty");
  const [activeTab, setActiveTab] = useState<"home" | "vault">("home");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [currentStage, setCurrentStage] = useState<AnalysisStageId>("reading");
  const [completedStages, setCompletedStages] = useState<AnalysisStageId[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [auditLevel, setAuditLevel] = useState<number>(1);

  // States do Cofre de Comprovantes
  const [vaultReceipts, setVaultReceipts] = useState<VaultReceiptItem[]>(
    INITIAL_VAULT_RECEIPTS
  );
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [activeVaultCategory, setActiveVaultCategory] =
    useState<VaultFilterCategory>("Todos");
  const [downloadedReceiptId, setDownloadedReceiptId] = useState<string | null>(
    null
  );
  const [isCardScanning, setIsCardScanning] = useState(false);
  const [selectedModalReceiptId, setSelectedModalReceiptId] = useState<
    string | null
  >(null);
  const [modalSharedFeedback, setModalSharedFeedback] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [auditsHistory, setAuditsHistory] = useState<AuditWithCharges[]>([]);
  const [lastUploadedFile, setLastUploadedFile] = useState<File | null>(null);
  const [resolvedChargeIds, setResolvedChargeIds] = useState<string[]>([]);
  const [externalAuthMode, setExternalAuthMode] = useState<AuthMode | null>(
    null
  );
  const [externalAuthNotice, setExternalAuthNotice] = useState<string | null>(
    null
  );
  const [pendingCheckoutPlan, setPendingCheckoutPlan] =
    useState<BillingPlanId | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [returnScreenState, setReturnScreenState] =
    useState<ScreenState>("empty");
  const [activePlan, setActivePlan] = useState<BillingPlanId>("monthly");
  const [paywallAnnualValue, setPaywallAnnualValue] = useState<number>(2172);
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("light");
  const [systemDark, setSystemDark] = useState(false);
  const [hasSessionAnalysis, setHasSessionAnalysis] = useState(false);
  const [currentAnalysisData, setCurrentAnalysisData] =
    useState<AnalysisSummaryData>(DEFAULT_SAMPLE_ANALYSIS);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModalReceipt =
    vaultReceipts.find((item) => item.id === selectedModalReceiptId) ?? null;

  // Hidrata sessão do Supabase Auth, perfil (`profiles.plan_status`), histórico (`audits`) e retorno do Stripe Checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawVault = window.localStorage.getItem(VAULT_STORAGE_KEY);
      if (rawVault) {
        const parsed = JSON.parse(rawVault);
        if (Array.isArray(parsed)) {
          setVaultReceipts(parsed);
        }
      }
      const rawLast = window.localStorage.getItem(LAST_ANALYSIS_STORAGE_KEY);
      if (rawLast) {
        const parsedLast = JSON.parse(rawLast) as AnalysisSummaryData;
        if (parsedLast && parsedLast.fileName) {
          setCurrentAnalysisData(parsedLast);
          setHasSessionAnalysis(true);
        }
      }
      const savedResolved = readResolvedIdsFromStorage();
      setResolvedChargeIds(savedResolved);
    } catch {
      // Ignora erro de storage
    }

    const loadAuthAndHistory = async () => {
      const supabase = getSupabaseBrowserClient();
      let currentProfile: UserProfile | null = readLocalProfile();

      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          currentProfile = await fetchUserProfile(
            session.user.id,
            session.user.email || "",
            (session.user.user_metadata?.full_name as string) || ""
          );
        }
      }

      const params = new URLSearchParams(window.location.search);
      const checkoutStatus = params.get("checkout");
      const checkoutSessionId = params.get("session_id");

      if (checkoutStatus === "success") {
        // Verifica a sessão diretamente na Stripe (/api/stripe/verify-session) e sincroniza customer/subscription no Supabase
        if (checkoutSessionId) {
          try {
            const verifyRes = await fetch("/api/stripe/verify-session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: checkoutSessionId,
                userId: currentProfile?.id,
              }),
            });
            const verifyJson = await verifyRes.json().catch(() => null);
            if (verifyJson?.verified && currentProfile) {
              currentProfile = {
                ...currentProfile,
                plan_status: "active",
                stripe_customer_id:
                  verifyJson.customerId || currentProfile.stripe_customer_id,
                stripe_subscription_id:
                  verifyJson.subscriptionId ||
                  currentProfile.stripe_subscription_id,
              };
            }
          } catch {
            // Continua ativação local/Supabase
          }
        }

        if (currentProfile) {
          currentProfile = { ...currentProfile, plan_status: "active" };
          writeLocalProfile(currentProfile);
          if (supabase) {
            await supabase
              .from("profiles")
              .update({
                plan_status: "active",
                stripe_customer_id: currentProfile.stripe_customer_id ?? null,
                stripe_subscription_id:
                  currentProfile.stripe_subscription_id ?? null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", currentProfile.id);
          }
        }
        setIsSubscribed(true);
        setScreenState("result");
        setStatusBanner(
          "Assinatura R$ 14,99/mês confirmada via Stripe! Todas as cobranças foram desbloqueadas."
        );
        window.setTimeout(() => setStatusBanner(null), 5000);
        window.history.replaceState({}, "", window.location.pathname);
      } else if (checkoutStatus === "canceled") {
        window.history.replaceState({}, "", window.location.pathname);
        const rawLastCheck = window.localStorage.getItem(
          LAST_ANALYSIS_STORAGE_KEY
        );
        if (rawLastCheck) {
          setScreenState("result");
        }
        setStatusBanner(
          "Pagamento não concluído. Sua auditoria continua disponível no modo gratuito."
        );
        window.setTimeout(() => setStatusBanner(null), 4500);
      }

      if (currentProfile) {
        setUserProfile(currentProfile);
        setIsLoggedIn(true);
        if (currentProfile.plan_status === "active") {
          setIsSubscribed(true);
        }
      }

      const history = await fetchUserAuditsHistory(currentProfile?.id);
      setAuditsHistory(history);
      if (history.length > 0) {
        setHasSessionAnalysis(true);
      }
    };

    void loadAuthAndHistory();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const prof = await fetchUserProfile(
          session.user.id,
          session.user.email || "",
          (session.user.user_metadata?.full_name as string) || ""
        );
        setUserProfile(prof);
        setIsLoggedIn(true);
        setIsSubscribed(prof.plan_status === "active");
        const history = await fetchUserAuditsHistory(prof.id);
        setAuditsHistory(history);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const persistVaultReceipts = (items: VaultReceiptItem[]) => {
    setVaultReceipts(items);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignora erro de storage
      }
    }
  };

  // Rola para o topo sempre que mudar de estado para evitar salto visual
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screenState]);

  useEffect(() => {
    if (appearanceMode !== "system" || typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [appearanceMode]);

  const readResolvedIdsFromStorage = (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RESOLVED_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const handleStartAnalysis = async (file: File) => {
    setSelectedFileName(file.name);
    setLastUploadedFile(file);
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
      const resolvedIds = readResolvedIdsFromStorage();
      const hydratedCharges: Charge[] = result.charges.map((charge) => ({
        ...charge,
        status: resolvedIds.includes(charge.id) ? "resolved" : charge.status,
      }));
      const analysis =
        result.analysisData ?? analyzeDocumentContent(file.name);
      setCurrentAnalysisData(analysis);
      setHasSessionAnalysis(true);
      setCharges(hydratedCharges);
      setAuditLevel((prev) => Math.min(3, prev + 1));

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            LAST_ANALYSIS_STORAGE_KEY,
            JSON.stringify(analysis)
          );
        } catch {
          // Ignora erro de storage
        }
      }

      // Salva o arquivo no bucket privado `bill-screenshots` (${user.id}/${timestamp}-${filename})
      // e grava automaticamente nas tabelas `audits` e `detected_charges`
      const effectiveUserId = userProfile?.id || "guest_user";
      const savedAudit = await uploadBillAndSaveAudit({
        userId: effectiveUserId,
        file,
        analysis,
      });

      setAuditsHistory((prev) => {
        const withoutDup = prev.filter((a) => a.id !== savedAudit.id);
        return [savedAudit, ...withoutDup];
      });

      // Salva/atualiza automaticamente o registro real da análise no histórico do Cofre
      const realAmount =
        analysis.totalRecurringSavings && analysis.totalRecurringSavings > 0
          ? analysis.totalRecurringSavings
          : analysis.totalAttention > 0
            ? analysis.totalAttention
            : (analysis.resumoCategorias?.pix ?? 0) +
              (analysis.resumoCategorias?.boletos ?? 0) +
              (analysis.resumoCategorias?.debitos ?? 0);

      const newReceipt: VaultReceiptItem = {
        id: `rec-${Date.now()}`,
        receiver: analysis.fileName || file.name,
        date: formatTodayShortPtBr(),
        tag: analysis.documentType === "extrato" ? "#Extrato" : "#Fatura",
        amount: Number(realAmount.toFixed(2)),
        type: analysis.documentType === "extrato" ? "PIX" : "Fatura",
        maskedDocument: "***.452.890-**",
        institution: analysis.detectedBank || "Auditoria Taxly",
        extractedText: `Auditoria real de ${analysis.fileName || file.name}`,
      };

      setVaultReceipts((prev) => {
        const filtered = prev.filter(
          (item) => item.receiver !== newReceipt.receiver
        );
        const updated = [newReceipt, ...filtered];
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(
              VAULT_STORAGE_KEY,
              JSON.stringify(updated)
            );
          } catch {
            // Ignora erro de storage
          }
        }
        return updated;
      });

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

  const handleSendAnotherInvoice = () => {
    setAnalysisError(null);
    setSelectedFileName(null);
    setActiveTab("home");
    setScreenState("empty");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleSaveResultToVault = () => {
    const formattedReceiver =
      currentAnalysisData.fileName || "Fatura Analisada";
    const realAmount =
      currentAnalysisData.totalRecurringSavings &&
      currentAnalysisData.totalRecurringSavings > 0
        ? currentAnalysisData.totalRecurringSavings
        : currentAnalysisData.totalAttention;

    const newReceipt: VaultReceiptItem = {
      id: `rec-${Date.now()}`,
      receiver: formattedReceiver,
      date: formatTodayShortPtBr(),
      tag: "#Fatura",
      amount: realAmount,
      type: "Fatura",
      maskedDocument: "***.452.890-**",
      institution: currentAnalysisData.detectedBank || "Taxly Vault",
      extractedText: `Documento salvo no cofre: ${formattedReceiver}`,
    };

    const filtered = vaultReceipts.filter(
      (item) => item.receiver !== formattedReceiver
    );
    persistVaultReceipts([newReceipt, ...filtered]);
    setStatusBanner("Análise salva no Cofre com sucesso!");
    window.setTimeout(() => setStatusBanner(null), 3500);
    setActiveTab("vault");
    setScreenState("empty");
  };

  const handleConfirmDeleteData = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(RESOLVED_STORAGE_KEY);
        window.localStorage.removeItem(VAULT_STORAGE_KEY);
        window.localStorage.removeItem(LAST_ANALYSIS_STORAGE_KEY);
      } catch {
        // Ignora erro de storage
      }
    }
    setVaultReceipts([]);
    setHasSessionAnalysis(false);
    setCurrentAnalysisData(DEFAULT_SAMPLE_ANALYSIS);
    setCharges([]);
    setIsSubscribed(false);
    setSelectedFileName(null);
    setAnalysisError(null);
    setScreenState("empty");
    setStatusBanner("Seus dados locais foram apagados com sucesso (LGPD).");
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const navigateToSubScreen = (target: ScreenState) => {
    if (
      screenState === "empty" ||
      screenState === "result" ||
      screenState === "partialResult"
    ) {
      setReturnScreenState(screenState);
    }
    setScreenState(target);
  };

  const startStripeCheckout = async (
    plan: BillingPlanId,
    activeUserProfile: UserProfile
  ) => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUserProfile.id,
          email: activeUserProfile.email,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.configured && data?.url && typeof window !== "undefined") {
        window.location.href = data.url;
        return;
      }
    } catch {
      // Fallback para ativação local caso as chaves da Stripe não respondam
    } finally {
      setIsCheckoutLoading(false);
    }

    const resolvedIds = readResolvedIdsFromStorage();
    const unlocked: Charge[] = UNLOCKED_PARTIAL_CHARGES.map((charge) => ({
      ...charge,
      status: resolvedIds.includes(charge.id) ? "resolved" : charge.status,
    }));
    const updatedProfile: UserProfile = {
      ...activeUserProfile,
      plan_status: "active",
    };
    setUserProfile(updatedProfile);
    writeLocalProfile(updatedProfile);
    setIsSubscribed(true);
    setActivePlan(plan);
    setCharges(unlocked);
    setActiveTab("home");
    setScreenState("result");
    setStatusBanner(
      `Plano ${plan === "annual" ? "Anual" : "Mensal"} (R$ 14,99/mês) ativado! Todas as cobranças foram desbloqueadas.`
    );
    window.setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleAuthenticate = async (payload: {
    userId?: string;
    name: string;
    email: string;
    mode: AuthMode;
  }) => {
    const uid = payload.userId || `user-${payload.email}`;
    const profile = await fetchUserProfile(uid, payload.email, payload.name);
    setUserProfile(profile);
    setIsLoggedIn(true);
    setIsSubscribed(profile.plan_status === "active");

    // Se o usuário já fez upload antes de logar, sincroniza o arquivo no bucket `bill-screenshots` e salva em `audits`/`detected_charges`
    if (hasSessionAnalysis && currentAnalysisData.fileName) {
      const syncedAudit = await uploadBillAndSaveAudit({
        userId: profile.id,
        file: lastUploadedFile,
        analysis: currentAnalysisData,
      });
      setAuditsHistory((prev) => {
        const filtered = prev.filter(
          (a) => a.file_name !== syncedAudit.file_name
        );
        return [syncedAudit, ...filtered];
      });
    } else {
      const history = await fetchUserAuditsHistory(profile.id);
      setAuditsHistory(history);
    }

    // Se o login foi solicitado antes de pagar/ir pro checkout, redireciona imediatamente para o Checkout da Stripe!
    if (pendingCheckoutPlan) {
      const planToCheckout = pendingCheckoutPlan;
      setPendingCheckoutPlan(null);
      setExternalAuthNotice(null);
      await startStripeCheckout(planToCheckout, profile);
      return;
    }

    setExternalAuthNotice(null);
    if (hasSessionAnalysis && currentAnalysisData.fileName) {
      setStatusBanner(
        "Conta conectada! Sua auditoria foi salva no Histórico de Faturas."
      );
      window.setTimeout(() => setStatusBanner(null), 4000);
    } else {
      setStatusBanner(null);
    }
  };

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    writeLocalProfile(null);
    setUserProfile(null);
    setIsLoggedIn(false);
    setIsSubscribed(false);
    setPendingCheckoutPlan(null);
    setExternalAuthNotice(null);
    setActiveTab("home");
    setScreenState("empty");
    setStatusBanner("Sessão encerrada.");
    window.setTimeout(() => setStatusBanner(null), 3500);
  };

  const handleContinueFree = () => {
    setActiveTab("home");
    setScreenState("empty");
    setStatusBanner(
      "Modo grátis ativo (1 análise por mês). Cobrança duplicada de R$ 14,90 registrada."
    );
    window.setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleSubscribePlan = async (plan: BillingPlanId) => {
    // Exige login/cadastro antes de pagar e ir para o checkout da Stripe
    if (!isLoggedIn || !userProfile) {
      setPendingCheckoutPlan(plan);
      setExternalAuthNotice(
        "Entre ou crie sua conta grátis para vincular sua assinatura antes de ir para o pagamento."
      );
      setExternalAuthMode("signup");
      return;
    }

    await startStripeCheckout(plan, userProfile);
  };

  const handleToggleChargeResolved = async (
    chargeId: string,
    nextResolved: boolean
  ) => {
    const nextIds = nextResolved
      ? Array.from(new Set([...resolvedChargeIds, chargeId]))
      : resolvedChargeIds.filter((id) => id !== chargeId);
    setResolvedChargeIds(nextIds);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          RESOLVED_STORAGE_KEY,
          JSON.stringify(nextIds)
        );
      } catch {
        // Ignora erro de storage
      }
    }
    await updateDetectedChargeResolved({
      chargeId,
      resolved: nextResolved,
    });
    setAuditsHistory((prev) =>
      prev.map((audit) => ({
        ...audit,
        detected_charges: audit.detected_charges.map((ch) =>
          ch.id === chargeId ? { ...ch, resolved: nextResolved } : ch
        ),
      }))
    );
  };

  const handleOpenSavedAudit = (audit: AuditWithCharges) => {
    const mappedAnalysis: AnalysisSummaryData = {
      documentType: "fatura",
      fileName: audit.file_name,
      detectedBank: audit.bank_name,
      tariffs: audit.detected_charges.map((c) => ({
        id: c.id,
        name: c.merchant_name,
        amount: c.monthly_amount,
      })),
      duplicates: [],
      categories: {
        pix: audit.pix_total,
        boletos: audit.boletos_total,
        debitos: audit.debitos_total,
      },
      totalAttention: audit.monthly_savings,
      isClean: audit.is_clean,
      totalRecurringSavings: audit.monthly_savings,
      totalTransacoes: audit.total_transactions,
      resumoCategorias: {
        pix: audit.pix_total,
        boletos: audit.boletos_total,
        debitos: audit.debitos_total,
      },
      itensOportunidade: audit.detected_charges.map((c) => ({
        categoria: c.category,
        nomeEstabelecimento: c.merchant_name,
        valorMensal: c.monthly_amount,
        data: c.charge_date,
      })),
    };
    const resolvedFromAudit = audit.detected_charges
      .filter((c) => c.resolved)
      .map((c) => c.id);
    if (resolvedFromAudit.length > 0) {
      setResolvedChargeIds((prev) =>
        Array.from(new Set([...prev, ...resolvedFromAudit]))
      );
    }
    setCurrentAnalysisData(mappedAnalysis);
    setHasSessionAnalysis(true);
    setScreenState("result");
  };

  const handleCancelSubscription = async () => {
    setIsSubscribed(false);
    if (userProfile) {
      const updated: UserProfile = { ...userProfile, plan_status: "free" };
      setUserProfile(updated);
      writeLocalProfile(updated);
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase
          .from("profiles")
          .update({
            plan_status: "free",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userProfile.id)
          .then(
            () => {},
            () => {}
          );
      }
    }
    setStatusBanner("Blindagem desativada. Plano grátis ativo.");
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleExportAnalyses = () => {
    if (typeof window !== "undefined") {
      const payload = {
        exportedAt: new Date().toISOString(),
        app: "taxly",
        charges,
        vaultReceipts,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "taxly-analises.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    setStatusBanner("Análises exportadas (taxly-analises.json).");
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleChangeAppearance = (mode: AppearanceMode) => {
    setAppearanceMode(mode);
    if (mode === "system" && typeof window !== "undefined") {
      setSystemDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  };

  // Filtro instantâneo (busca por nome, valor, data, CNPJ/texto oculto e tag + pílula de categoria)
  const normalizedQuery = vaultSearchQuery.trim().toLowerCase();
  const filteredVaultReceipts = vaultReceipts.filter((item) => {
    const matchesCategory =
      activeVaultCategory === "Todos" ||
      (activeVaultCategory === "PIX" && item.type === "PIX") ||
      (activeVaultCategory === "Boletos" && item.type === "Boleto") ||
      (activeVaultCategory === "Faturas" && item.type === "Fatura") ||
      (activeVaultCategory === "Saúde/IR" &&
        (item.isHealthIR ||
          item.tag.toLowerCase().includes("saúde") ||
          item.tag.toLowerCase().includes("saude") ||
          item.tag.toLowerCase().includes("ir")));

    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const formattedValue = formatBRL(item.amount).toLowerCase();
    const rawValue = String(item.amount).toLowerCase();
    const searchableContent = [
      item.receiver,
      item.date,
      item.tag,
      formattedValue,
      `r$ ${formattedValue}`,
      rawValue,
      item.type,
      item.extractedText,
    ]
      .join(" ")
      .toLowerCase();

    return searchableContent.includes(normalizedQuery);
  });

  const handleSimulatedVaultUpload = (file?: File) => {
    if (isCardScanning) return;
    setIsCardScanning(true);

    if (file) {
      window.setTimeout(() => {
        setIsCardScanning(false);
        void handleStartAnalysis(file);
      }, 400);
      return;
    }

    window.setTimeout(() => {
      setIsCardScanning(false);
      const analysis = analyzeDocumentContent("fatura_exemplo.pdf");
      setCurrentAnalysisData(analysis);
      setSelectedFileName("fatura_exemplo.pdf");
      setScreenState("result");
    }, 800);
  };

  const handleSelectModalTag = (id: string, newTag: string) => {
    const updated = vaultReceipts.map((item) =>
      item.id === id
        ? {
            ...item,
            tag: newTag,
            isHealthIR:
              newTag === "#Saúde" || newTag === "#ImpostoDeRenda",
          }
        : item
    );
    persistVaultReceipts(updated);
  };

  const handleDeleteFromVault = (id: string) => {
    const updated = vaultReceipts.filter((item) => item.id !== id);
    persistVaultReceipts(updated);
    setSelectedModalReceiptId(null);
  };

  const downloadReceiptSummaryFile = (item: VaultReceiptItem) => {
    if (typeof window === "undefined") return;
    const summaryLines = [
      "==========================================",
      "        TAXLY · COMPROVANTE BLINDADO      ",
      "==========================================",
      `Documento: ${item.receiver}`,
      `Tipo: ${item.type}`,
      `Data: ${item.date}`,
      `Categoria: ${item.tag}`,
      `Valor: R$ ${formatBRL(item.amount)}`,
      `Instituição: ${item.institution}`,
      `CPF/CNPJ Mascarado: ${item.maskedDocument}`,
      "------------------------------------------",
      item.extractedText,
      "==========================================",
    ].join("\n");

    const blob = new Blob([summaryLines], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = item.receiver
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .toLowerCase();
    link.href = url;
    link.download = `taxly-comprovante-${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleQuickDownload = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: VaultReceiptItem
  ) => {
    e.stopPropagation();
    downloadReceiptSummaryFile(item);
    setDownloadedReceiptId(item.id);
    window.setTimeout(() => {
      setDownloadedReceiptId((prev) => (prev === item.id ? null : prev));
    }, 2000);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSimulatedVaultUpload(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSimulatedVaultUpload(file);
    }
  };

  const totalVaultFilesCount = isSubscribed
    ? vaultReceipts.length
    : hasSessionAnalysis
      ? 1
      : 0;

  const recentSessionAmount =
    currentAnalysisData.totalRecurringSavings &&
    currentAnalysisData.totalRecurringSavings > 0
      ? currentAnalysisData.totalRecurringSavings
      : currentAnalysisData.totalAttention > 0
        ? currentAnalysisData.totalAttention
        : vaultReceipts[0]?.amount ?? 0;

  const totalRealVaultSavings = Number(
    (
      vaultReceipts.length > 0
        ? vaultReceipts.reduce((acc, item) => acc + item.amount, 0)
        : recentSessionAmount
    ).toFixed(2)
  );
  const isPaywallFlowScreen =
    screenState === "partialResult" ||
    screenState === "paywall" ||
    screenState === "connectBank" ||
    screenState === "quiz" ||
    screenState === "manageAccount";
  const isWarmBgScreen =
    screenState === "paywall" ||
    screenState === "manageAccount" ||
    (screenState === "result" && !hasSessionAnalysis);
  const resolvedTheme =
    appearanceMode === "dark" || (appearanceMode === "system" && systemDark)
      ? "dark"
      : "light";

  const mainPaddingClass = isPaywallFlowScreen
    ? "px-6 pt-3 pb-8"
    : "px-6 pt-3 pb-36";
  const appBgClass = isWarmBgScreen
    ? "taxly-app min-h-dvh w-full bg-[#F6F5F1] text-[#18181B] overflow-x-hidden"
    : "taxly-app min-h-dvh w-full bg-[#FAFAF8] text-[#171717] overflow-x-hidden";
  const innerBgClass = isWarmBgScreen
    ? "mx-auto w-full max-w-[430px] min-w-0 bg-[#F6F5F1] relative"
    : "mx-auto w-full max-w-[430px] min-w-0 bg-[#FAFAF8] relative";

  return (
    <div
      data-theme={resolvedTheme}
      className={appBgClass}
    >
      <div className={innerBgClass}>
        {/* Top Row: Logo taxly + Ícone de perfil */}
        <header className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 select-none">
            <img
              src="/taxly-logo.png"
              alt="Logo taxly"
              width={32}
              height={32}
              className="w-[32px] h-[32px] object-contain shrink-0"
            />
              <span className="text-[20px] font-semibold text-[#171717] tracking-[-0.03em] leading-none">
                taxly
              </span>
          </div>

          <ProfileMenu
            isLoggedIn={isLoggedIn}
            isSubscribed={isSubscribed}
            activePlan={activePlan}
            appearanceMode={appearanceMode}
            hideTrigger={isPaywallFlowScreen}
            externalAuthMode={externalAuthMode}
            externalAuthNotice={externalAuthNotice}
            onClearExternalAuth={() => setExternalAuthMode(null)}
            onAuthenticate={handleAuthenticate}
            onChangeAppearance={handleChangeAppearance}
            onSendAnotherInvoice={handleSendAnotherInvoice}
            onOpenHistory={() => {
              setScreenState("empty");
              setActiveTab("vault");
            }}
            onOpenPaywall={() => navigateToSubScreen("paywall")}
            onOpenManageAccount={() => navigateToSubScreen("manageAccount")}
            onCancelSubscription={handleCancelSubscription}
            onExportAnalyses={handleExportAnalyses}
            onDeleteData={handleConfirmDeleteData}
            onSignOut={handleSignOut}
          />
        </header>

        {statusBanner && screenState !== "result" && (
          <div
            role="status"
            className="mx-6 mt-2 rounded-[12px] bg-white border border-[#EAEAE7] shadow-[0_1px_2px_rgba(0,0,0,0.02)] px-4 py-2.5 text-[13px] font-medium text-[#171717] text-left"
          >
            {statusBanner}
          </div>
        )}

        <input
          id="vault-file-input"
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/*,.heic"
          aria-label="Selecionar arquivo de fatura em PDF, imagem ou print"
          onChange={handleFileInputChange}
          className="sr-only"
        />

        {/* Main Content */}
        <main className={mainPaddingClass}>
          {screenState === "empty" && activeTab === "home" && (
            <section aria-label="Boas-vindas e envio de fatura ou comprovante">
              {/* Headline, Subtítulo & Prova Social */}
              <div>
                  {/* Contador animado no topo */}
                  <div className="mb-4">
                    <LiveCounter />
                  </div>

                      <h1 className="text-[31px] sm:text-[34px] leading-[1.12] tracking-[-0.03em] font-semibold text-left break-words">
                        <span className="text-[#171717]">
                          Você pode estar pagando por algo que{" "}
                        </span>
                        <span className="text-[#858585]">não usa.</span>
                      </h1>

                        <p className="mt-2.5 text-[14.5px] leading-[1.5] text-[#858585] font-normal text-left">
                          Em média, encontramos R$ 340 escondidos por mês em extratos de brasileiros. Quanto você está deixando passar?
                        </p>
                      </div>

                      {/* Ação central de Upload: elegante, contida e sofisticada */}
                      {isCardScanning ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="mt-5 w-full rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] py-6 px-5 flex flex-col items-center justify-center text-center"
                        >
                            <div className="w-11 h-11 rounded-[12px] bg-[#08B968]/10 text-[#08B968] flex items-center justify-center mb-2.5 animate-pulse">
                              <DocumentScannerIcon className="w-5 h-5" />
                            </div>
                              <p className="text-[14.5px] font-semibold text-[#171717]">
                                Varrendo documento e mascarando dados sensíveis...
                              </p>
                                <div className="mt-3 w-44 h-1 rounded-full bg-[#F5F5F2] overflow-hidden">
                                  <div className="h-full w-2/3 rounded-full bg-[#08B968] animate-pulse" />
                                </div>
                              </div>
                              ) : (
                              <label
                                htmlFor="vault-file-input"
                                aria-label="Enviar arquivo em PDF, imagem ou print do banco"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`group mt-5 w-full rounded-[16px] py-5 px-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none bg-white border ${isDragging
                                    ? "border-[#08B968] bg-[#F5F5F2]"
                                    : "border-[#EAEAE7] hover:border-[#08B968]/40 active:scale-[0.995]"
                                  } shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)]`}
                              >
                                  <div className="cta-plus-button w-11 h-11 rounded-[12px] bg-[#08B968] text-white flex items-center justify-center mb-2.5 shadow-[0_2px_6px_rgba(8,185,104,0.22)]">
                                    <PlusIcon className="w-5 h-5" />
                                  </div>
                                    <span className="text-[16px] font-semibold tracking-[-0.02em] text-[#171717]">
                                      Enviar arquivo
                                    </span>
                                      <span className="text-[13px] text-[#858585] mt-0.5 font-normal">
                                        PDF, imagem ou print do banco
                                      </span>
                                        <span className="mt-3 pt-2.5 border-t border-[#EAEAE7] w-full text-[11.5px] text-[#858585] font-normal">
                                          Grátis · Sem cadastro no primeiro resultado
                                        </span>
                                      </label>
              )}

                                      {/* Botão secundário: Quiz interativo de cálculo de perda */}
                                      <button
                                        type="button"
                                        onClick={() => navigateToSubScreen("quiz")}
                                        className="mt-2.5 w-full min-h-[44px] rounded-[12px] bg-[#F5F5F2] hover:bg-[#EAEAE7]/70 text-[#171717] text-[11px] min-[350px]:text-[11.5px] min-[380px]:text-[12px] min-[410px]:text-[13px] font-medium px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 transition-colors cursor-pointer border border-[#EAEAE7] whitespace-nowrap"
                                      >
                                        <span className="whitespace-nowrap">Não tem a fatura em mãos? Calcule sua perda em 10s</span>
                                        <span className="text-[#08B968] font-semibold shrink-0">→</span>
                                      </button>

                                      {/* Checklist + Nota de Privacidade */}
                                      <ul
                                        aria-label="Benefícios da análise de fatura"
                                        className="mt-5 space-y-3"
                                      >
                                        {BENEFITS.map(({ text, Icon }) => (
                  <li key={text} className="flex items-center gap-3">
                    <Icon
                      aria-hidden="true"
                      className="w-[18px] h-[18px] text-[#08B968] shrink-0"
                    />
                    <span className="text-[14px] text-[#171717] leading-snug font-normal text-left">
                      {text}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-4 text-[12px] leading-normal text-[#858585] text-left">
                Seus dados são mascarados e{" "}
                <strong className="font-semibold text-[#171717]">
                  não vendemos
                </strong>{" "}
                informações.
              </p>
            </section>
                                        )}

                                        {/* Tela secundária: Meu Cofre */}
                                        {screenState === "empty" && activeTab === "vault" && (
                                          <section aria-label="Meu Cofre">
                                            {/* Header "Meu Cofre" */}
                                            <div className="flex items-center justify-between">
                                              <h1 className="text-[24px] leading-[1.15] tracking-[-0.025em] font-semibold text-[#18181B]">
                                                Meu Cofre
                                              </h1>
                                              <span className="text-[12px] font-medium text-[#8A8985] bg-white border border-black/[0.06] px-2.5 py-1 rounded-full tabular-nums">
                                                {totalVaultFilesCount}{" "}
                                                {totalVaultFilesCount === 1
                                                  ? "arquivo"
                                                  : "arquivos"}
                                              </span>
                                            </div>

                                            {/* Seção Histórico de Faturas (tabela `audits` do Supabase) */}
                                            {auditsHistory.length > 0 && (
                                              <div className="mt-4 rounded-2xl bg-white border border-black/[0.06] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                <div className="flex items-center justify-between mb-3">
                                                  <h2 className="text-[14px] font-medium text-[#18181B]">
                                                    Histórico de Faturas Auditadas
                                                  </h2>
                                                  <span className="text-[11px] font-medium text-[#0F9D58] bg-[#0F9D58]/10 px-2 py-0.5 rounded-full tabular-nums">
                                                    {auditsHistory.length}{" "}
                                                    {auditsHistory.length === 1
                                                      ? "auditoria salva"
                                                      : "auditorias salvas"}
                                                  </span>
                                                </div>

                                                <div className="divide-y divide-black/[0.06]">
                                                  {auditsHistory.map((audit) => (
                                                    <button
                                                      key={audit.id}
                                                      type="button"
                                                      onClick={() =>
                                                        handleOpenSavedAudit(
                                                          audit
                                                        )
                                                      }
                                                      className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-left hover:bg-[#F6F5F1]/60 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                                                    >
                                                      <div className="min-w-0 flex-1">
                                                        <p className="text-[13.5px] font-medium text-[#18181B] truncate">
                                                          {audit.bank_name} ·{" "}
                                                          {audit.reference_month}
                                                        </p>
                                                        <p className="mt-0.5 text-[11.5px] text-[#8A8985] truncate tabular-nums">
                                                          {audit.file_name} ·
                                                          Total R${" "}
                                                          {formatBRL(
                                                            audit.invoice_total
                                                          )}
                                                        </p>
                                                      </div>

                                                      <div className="text-right shrink-0">
                                                        <p className="text-[13.5px] font-semibold text-[#0F9D58] tabular-nums whitespace-nowrap">
                                                          R${" "}
                                                          {formatBRL(
                                                            audit.monthly_savings
                                                          )}
                                                          /mês
                                                        </p>
                                                        <p className="text-[11px] text-[#8A8985] tabular-nums whitespace-nowrap">
                                                          R${" "}
                                                          {formatBRL(
                                                            audit.annual_savings
                                                          )}
                                                          /ano
                                                        </p>
                                                      </div>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {!isSubscribed ? (
                                              /* ========================================================= */
                                              /* QUANDO !isPremium (Usuário Gratuito): Teaser com Cadeado   */
                                              /* ========================================================= */
                                              <div className="mt-4">
                                                {/* Se o usuário já realizou uma análise na sessão, exibe no topo o card real dessa análise recente com Lock no botão direito */}
                                                {hasSessionAnalysis && (
                                                  <div className="mb-3 rounded-2xl bg-white border border-black/[0.06] p-3.5 flex items-center justify-between gap-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                      <div className="w-8 h-8 rounded-[10px] bg-[#F6F5F1] border border-black/[0.06] text-[#18181B] flex items-center justify-center shrink-0">
                                                        <InvoiceDocIcon className="w-4 h-4" />
                                                      </div>

                                                      <div className="min-w-0 flex-1">
                                                        <p className="text-[14px] font-medium text-[#18181B] leading-tight truncate">
                                                          {currentAnalysisData.fileName ||
                                                            vaultReceipts[0]?.receiver ||
                                                            "Fatura analisada hoje"}
                                                        </p>
                                                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                          <span className="text-[11px] text-[#8A8985] whitespace-nowrap shrink-0 tabular-nums">
                                                            {formatTodayShortPtBr()}
                                                          </span>
                                                          <span className="whitespace-nowrap px-2 py-0.5 rounded-[6px] bg-[#F6F5F1] text-[11px] font-medium text-[#8A8985] shrink-0">
                                                            #Recente
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                      <span className="text-[14px] font-medium text-[#18181B] tabular-nums whitespace-nowrap">
                                                        R$ {formatBRL(recentSessionAmount)}
                                                      </span>
                                                      <button
                                                        type="button"
                                                        aria-label="Desbloquear comprovante no Cofre"
                                                        onClick={() =>
                                                          navigateToSubScreen("paywall")
                                                        }
                                                        className="w-8 h-8 rounded-[8px] bg-[#F6F5F1] hover:bg-black/[0.05] border border-black/[0.06] text-[#0F9D58] flex items-center justify-center transition-colors cursor-pointer"
                                                      >
                                                        <Lock
                                                          size={14}
                                                          strokeWidth={1.5}
                                                        />
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 3 linhas de prévia com blur-[5px] select-none sobrepostas por card translúcido central */}
                                                <div className="relative">
                                                  <div
                                                    aria-hidden="true"
                                                    className="rounded-2xl bg-white border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden filter blur-[5px] select-none pointer-events-none"
                                                  >
                                                    {BLURRED_TEASER_VAULT_ROWS.map(
                                                      (preview) => (
                                                        <div
                                                          key={preview.id}
                                                          className="min-h-[68px] px-3.5 py-3.5 flex items-center justify-between gap-2"
                                                        >
                                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className="w-8 h-8 rounded-[10px] bg-[#F6F5F1] border border-black/[0.06] text-[#18181B] flex items-center justify-center shrink-0">
                                                              {preview.type ===
                                                                "PIX" && (
                                                                <PixIcon className="w-4 h-4" />
                                                              )}
                                                              {preview.type ===
                                                                "Boleto" && (
                                                                <BarcodeIcon className="w-4 h-4" />
                                                              )}
                                                              {preview.type ===
                                                                "Fatura" && (
                                                                <InvoiceDocIcon className="w-4 h-4" />
                                                              )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                              <p className="text-[14px] font-medium text-[#18181B] truncate">
                                                                {preview.receiver}
                                                              </p>
                                                              <div className="mt-1 flex items-center gap-1.5">
                                                                <span className="text-[11px] text-[#8A8985]">
                                                                  {preview.date}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-[6px] bg-[#F6F5F1] text-[11px] font-medium text-[#8A8985]">
                                                                  {preview.tag}
                                                                </span>
                                                              </div>
                                                            </div>
                                                          </div>
                                                          <span className="text-[14px] font-medium text-[#18181B] tabular-nums">
                                                            {preview.amount}
                                                          </span>
                                                        </div>
                                                      )
                                                    )}
                                                  </div>

                                                  {/* Card translúcido central sobreposto */}
                                                  <div className="mt-[-185px] relative z-10 mx-2 bg-[#F6F5F1]/90 backdrop-blur-md border border-black/[0.08] rounded-2xl p-5 text-center shadow-[0_8px_28px_rgba(0,0,0,0.06)]">
                                                    <div className="mx-auto w-10 h-10 rounded-full bg-white border border-black/[0.06] flex items-center justify-center text-[#0F9D58]">
                                                      <Lock
                                                        size={18}
                                                        strokeWidth={1.5}
                                                      />
                                                    </div>

                                                    <h2 className="mt-3 text-[17px] leading-snug tracking-[-0.02em] font-medium text-[#18181B]">
                                                      Seu Cofre de Blindagem está bloqueado
                                                    </h2>

                                                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#52525B]">
                                                      Salve suas auditorias, compare faturas mês a mês contra aumentos ocultos e organize comprovantes PIX e de IR em um só lugar.
                                                    </p>

                                                    {hasSessionAnalysis ? (
                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          navigateToSubScreen(
                                                            "paywall"
                                                          )
                                                        }
                                                        className="mt-4 w-full py-3 px-4 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white text-[14px] font-medium tracking-[-0.02em] tabular-nums transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
                                                      >
                                                        Ativar Meu Cofre · R$ 14,99/mês
                                                      </button>
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={
                                                          handleSendAnotherInvoice
                                                        }
                                                        className="mt-4 w-full py-3 px-4 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white text-[14px] font-medium tracking-[-0.02em] transition-all cursor-pointer shadow-[0_2px_10px_rgba(15,157,88,0.18)]"
                                                      >
                                                        Analisar minha 1ª fatura grátis
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              /* ========================================================= */
                                              /* QUANDO isPremium === true (Assinante): Dados Reais        */
                                              /* ========================================================= */
                                              <>
                                                {/* Valor total real economizado/monitorado */}
                                                <div className="mt-4 rounded-2xl bg-white border border-black/[0.06] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                  <p className="text-[12px] font-medium uppercase tracking-[0.04em] text-[#8A8985] leading-snug">
                                                    Total economizado / monitorado
                                                  </p>
                                                  <div className="mt-1.5 flex items-baseline gap-1.5">
                                                    <span className="text-[32px] font-medium tracking-[-0.035em] text-[#18181B] tabular-nums leading-none">
                                                      R$ {formatBRL(totalRealVaultSavings)}/mês
                                                    </span>
                                                  </div>
                                                </div>

                                                {/* Barra de busca minimalista */}
                                                <div className="mt-4 relative">
                                                  <SearchIcon className="w-[16px] h-[16px] text-[#8A8985] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                  <input
                                                    ref={searchInputRef}
                                                    type="search"
                                                    value={vaultSearchQuery}
                                                    onChange={(e) =>
                                                      setVaultSearchQuery(
                                                        e.target.value
                                                      )
                                                    }
                                                    aria-label="Buscar comprovantes no cofre"
                                                    placeholder="Buscar por nome, valor ou #tag..."
                                                    className="w-full h-[42px] pl-10 pr-3.5 rounded-xl bg-white border border-black/[0.06] text-[13.5px] text-[#18181B] placeholder:text-[#8A8985] focus:outline-none focus:border-[#18181B] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors"
                                                  />
                                                </div>

                                                {/* Pílulas de filtro rápido */}
                                                <div
                                                  role="tablist"
                                                  aria-label="Filtrar comprovantes por categoria"
                                                  className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1"
                                                >
                                                  {VAULT_FILTER_PILLS.map(
                                                    (pill) => {
                                                      const isActive =
                                                        activeVaultCategory ===
                                                        pill;
                                                      const pillBtnClass =
                                                        isActive
                                                          ? "px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors shrink-0 cursor-pointer bg-[#18181B] text-white font-medium"
                                                          : "px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors shrink-0 cursor-pointer bg-[#F6F5F1] text-[#8A8985] hover:text-[#18181B] border border-black/[0.06] font-normal";
                                                      return (
                                                        <button
                                                          key={pill}
                                                          type="button"
                                                          role="tab"
                                                          aria-selected={
                                                            isActive
                                                          }
                                                          onClick={() =>
                                                            setActiveVaultCategory(
                                                              pill
                                                            )
                                                          }
                                                          className={
                                                            pillBtnClass
                                                          }
                                                        >
                                                          {pill}
                                                        </button>
                                                      );
                                                    }
                                                  )}
                                                </div>

                                                {/* Lista Real de Arquivos Salvos no Cofre */}
                                                <div className="mt-4">
                                                  {filteredVaultReceipts.length >
                                                  0 ? (
                                                    <div className="rounded-2xl bg-white border border-black/[0.06] divide-y divide-black/[0.06] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                                      {filteredVaultReceipts.map(
                                                        (item) => {
                                                          const isDownloaded =
                                                            downloadedReceiptId ===
                                                            item.id;

                                                          return (
                                                            <div
                                                              key={item.id}
                                                              role="button"
                                                              tabIndex={0}
                                                              aria-label={`Abrir detalhes de ${item.receiver}, ${item.date}, valor R$ ${formatBRL(item.amount)}`}
                                                              onClick={() => {
                                                                setModalSharedFeedback(
                                                                  false
                                                                );
                                                                setSelectedModalReceiptId(
                                                                  item.id
                                                                );
                                                              }}
                                                              onKeyDown={(
                                                                e
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                    "Enter" ||
                                                                  e.key === " "
                                                                ) {
                                                                  e.preventDefault();
                                                                  setModalSharedFeedback(
                                                                    false
                                                                  );
                                                                  setSelectedModalReceiptId(
                                                                    item.id
                                                                  );
                                                                }
                                                              }}
                                                              className="min-h-[64px] bg-white hover:bg-[#FAFAF8] active:bg-[#F5F5F2] px-3.5 py-3 flex items-center justify-between gap-2 transition-colors cursor-pointer select-none"
                                                            >
                                                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                                <div
                                                                  aria-label={`Tipo: ${item.type}`}
                                                                  title={
                                                                    item.type
                                                                  }
                                                                  className="w-8 h-8 rounded-[10px] bg-[#F6F5F1] border border-black/[0.06] text-[#18181B] flex items-center justify-center shrink-0"
                                                                >
                                                                  {item.type ===
                                                                    "PIX" && (
                                                                    <PixIcon className="w-4 h-4" />
                                                                  )}
                                                                  {item.type ===
                                                                    "Boleto" && (
                                                                    <BarcodeIcon className="w-4 h-4" />
                                                                  )}
                                                                  {item.type ===
                                                                    "Fatura" && (
                                                                    <InvoiceDocIcon className="w-4 h-4" />
                                                                  )}
                                                                </div>

                                                                <div className="min-w-0 flex-1">
                                                                  <p className="text-[14px] font-medium text-[#18181B] leading-tight truncate">
                                                                    {
                                                                      item.receiver
                                                                    }
                                                                  </p>
                                                                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-[11px] text-[#8A8985] whitespace-nowrap shrink-0 tabular-nums">
                                                                      {
                                                                        item.date
                                                                      }
                                                                    </span>
                                                                    <span className="whitespace-nowrap px-2 py-0.5 rounded-[6px] bg-[#F6F5F1] text-[11px] font-medium text-[#8A8985] shrink-0">
                                                                      {item.tag}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              </div>

                                                              <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-[14px] font-medium text-[#18181B] tabular-nums whitespace-nowrap">
                                                                  R${" "}
                                                                  {formatBRL(
                                                                    item.amount
                                                                  )}
                                                                </span>
                                                                <button
                                                                  type="button"
                                                                  aria-label={`Baixar ou compartilhar comprovante original de ${item.receiver}`}
                                                                  title="Baixar/compartilhar comprovante original"
                                                                  onClick={(
                                                                    e
                                                                  ) =>
                                                                    handleQuickDownload(
                                                                      e,
                                                                      item
                                                                    )
                                                                  }
                                                                  className="w-8 h-8 rounded-[8px] bg-[#F6F5F1] hover:bg-black/[0.05] border border-black/[0.06] text-[#18181B] flex items-center justify-center transition-colors cursor-pointer"
                                                                >
                                                                  {isDownloaded ? (
                                                                    <CheckIcon className="w-3.5 h-3.5 text-[#0F9D58]" />
                                                                  ) : (
                                                                    <ShareDownloadIcon className="w-3.5 h-3.5" />
                                                                  )}
                                                                </button>
                                                              </div>
                                                            </div>
                                                          );
                                                        }
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="rounded-2xl bg-white border border-black/[0.06] py-8 px-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                                      <p className="text-[13.5px] text-[#8A8985]">
                                                        Nenhum comprovante salvo ainda. Envie uma fatura ou extrato para iniciar seu histórico.
                                                      </p>
                                                      <button
                                                        type="button"
                                                        onClick={
                                                          handleSendAnotherInvoice
                                                        }
                                                        className="mt-4 py-2.5 px-4 rounded-xl bg-[#0F9D58] hover:bg-[#0B8043] text-white text-[13.5px] font-medium transition-colors cursor-pointer"
                                                      >
                                                        Enviar fatura ou comprovante
                                                      </button>
                                                    </div>
                                                  )}
                                                </div>
                                              </>
                                            )}
                                          </section>
          )}

                                                            {screenState === "analyzing" && (
                                                              <section
                                                                aria-label="Análise da fatura em andamento"
                                                                className="pt-2"
                                                              >
                                                                {!analysisError ? (
                                                                    <div className="rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] p-6">
                                                                      {/* Scanner Document Illustration */}
                                                                        <div className="mx-auto w-[116px] h-[140px] rounded-[14px] bg-[#FAFAF8] border border-[#EAEAE7] relative overflow-hidden flex flex-col items-center justify-center p-4">
                                                                          <DocumentScannerIcon className="w-10 h-10 text-[#08B968]" />
                                                                          <div
                                                                            aria-hidden="true"
                                                                            className="w-full mt-3 space-y-1.5 px-2"
                                                                          >
                                                                            <div className="h-1.5 w-3/4 rounded-full bg-[#EAEAE7]" />
                                                                            <div className="h-1.5 w-full rounded-full bg-[#EAEAE7]" />
                                                                            <div className="h-1.5 w-2/3 rounded-full bg-[#EAEAE7]" />
                                                                          </div>
                                                                          {/* Animated Scanner Beam (respects prefers-reduced-motion) */}
                                                                          <div
                                                                            aria-hidden="true"
                                                                            className="scanner-line absolute left-0 right-0 h-[2px] bg-[#08B968] shadow-[0_0_10px_1px_rgba(8,185,104,0.4)]"
                                                                          />
                                                                        </div>

                                                                        <div className="text-center mt-5">
                                                                            <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-[#171717]">
                                                                              Analisando sua fatura
                                                                            </h1>
                                                                            {selectedFileName && (
                                                                                <p className="text-[13px] text-[#858585] mt-1 truncate max-w-[280px] mx-auto">
                                                                                  {selectedFileName}
                                                                                </p>
                    )}
                                                                              </div>

                  {/* Progress bar */}
                                                                            <div className="mt-5">
                                                                                <div className="flex items-center justify-between text-[12.5px] font-medium text-[#858585] mb-2">
                                                                                  <span id="analysis-progress-label">
                                                                                    Progresso da leitura
                                                                                  </span>
                                                                                  <span className="tabular-nums font-semibold text-[#171717]">{analysisProgress}%</span>
                                                                                </div>
                                                                                <div
                                                                                  role="progressbar"
                                                                                  aria-labelledby="analysis-progress-label"
                                                                                  aria-valuenow={analysisProgress}
                                                                                  aria-valuemin={0}
                                                                                  aria-valuemax={100}
                                                                                  className="h-1.5 w-full rounded-full bg-[#F5F5F2] overflow-hidden"
                                                                                >
                                                                                  <div
                                                                                    className="h-full rounded-full bg-[#08B968] transition-all duration-200"
                                                                                    style={{ width: `${analysisProgress}%` }}
                                                                                  />
                                                                                </div>
                                                                              </div>

                                                                              {/* Checklist by real event stages */}
                                                                              <ul
                                                                                aria-label="Etapas do processamento"
                                                                                className="mt-6 space-y-3 border-t border-[#EAEAE7] pt-5"
                                                                              >
                                                                                {ANALYSIS_STEPS.map((step) => {
                                                                                  const isCompleted = completedStages.includes(step.id);
                                                                                  const isCurrent =
                                                                                    currentStage === step.id && !isCompleted;

                                                                                  return (
                        <li
                          key={step.id}
                          className="flex items-center gap-3 text-[13.5px]"
                        >
                          <span
                            aria-hidden="true"
                            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isCompleted
                                ? "bg-[#08B968] text-white"
                                : isCurrent
                                  ? "border-2 border-[#08B968] bg-white text-[#08B968]"
                                  : "border border-[#EAEAE7] bg-[#F5F5F2] text-transparent"
                            }`}
                          >
                            {isCompleted ? (
                              <CheckIcon className="w-3 h-3" />
                            ) : isCurrent ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#08B968]" />
                            ) : null}
                          </span>
                          <span
                            className={
                              isCompleted || isCurrent
                                ? "font-medium text-[#171717]"
                                : "text-[#858585]"
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
                                                                          className="rounded-[16px] bg-white border border-[#EAEAE7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-6 text-center"
                                                                        >
                                                                            <div className="mx-auto w-12 h-12 rounded-full bg-[#E54848]/10 text-[#E54848] flex items-center justify-center">
                                                                              <AlertCircleIcon className="w-6 h-6" />
                                                                            </div>

                                                                              <h1 className="text-[20px] font-semibold tracking-[-0.025em] text-[#171717] mt-4">
                                                                                Documento não reconhecido
                                                                              </h1>

                                                                                <p className="text-[14px] text-[#858585] mt-2 leading-relaxed">
                                                                                  {analysisError}
                                                                                </p>

                                                                                    <div className="mt-4 rounded-[12px] bg-[#F5F5F2] p-4 text-left border border-[#EAEAE7]">
                                                                                      <p className="text-[13px] font-semibold text-[#171717]">
                                                                                        O Taxly analisa exclusivamente:
                                                                                      </p>
                                                                                        <ul className="mt-1.5 text-[13px] text-[#858585] space-y-1 list-disc list-inside">
                                                                                          <li>Extrato de conta bancária (PDF ou foto/print oficial)</li>
                                                                                          <li>Fatura fechada de cartão de crédito</li>
                                                                                          <li>Comprovante oficial de transferência bancária ou PIX</li>
                                                                                        </ul>
                                                                                    </div>

                                                                                    <button
                                                                                      type="button"
                                                                                      aria-label="Anexar documento verdadeiro do banco"
                                                                                      onClick={() => {
                                                                                        setAnalysisError(null);
                                                                                        setScreenState("empty");
                                                                                        if (fileInputRef.current) {
                                                                                          fileInputRef.current.click();
                                                                                        }
                                                                                      }}
                                                                                      className="mt-5 w-full min-h-[48px] rounded-[12px] bg-[#08B968] hover:bg-[#087D4A] text-white font-semibold text-[14.5px] py-3 px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                                                    >
                                                                                      Anexar documento verdadeiro
                                                                                    </button>
                                                                                </div>
              )}
                                                                              </section>
          )}

                                                                              {screenState === "connectBank" && (
                                                                                <ConnectBankScreen
                                                                                  onBack={() => setScreenState("empty")}
                                                                                  onSelectManualFile={() => {
                                                                                    setScreenState("empty");
                                                                                    if (fileInputRef.current) {
                                                                                      fileInputRef.current.value = "";
                                                                                      fileInputRef.current.click();
                                                                                    }
                                                                                  }}
                                                                                />
                                                                              )}

                                                                              {screenState === "quiz" && (
                                                                                <LossQuizScreen
                                                                                  onBack={() => setScreenState(returnScreenState)}
                                                                                  onActivateSubscription={(_price, annualVal) => {
                                                                                    if (annualVal && annualVal > 0) {
                                                                                      setPaywallAnnualValue(annualVal);
                                                                                    }
                                                                                    void handleSubscribePlan("monthly");
                                                                                  }}
                                                                                  onSendManualFile={() => {
                                                                                    setScreenState("empty");
                                                                                    if (fileInputRef.current) {
                                                                                      fileInputRef.current.value = "";
                                                                                      fileInputRef.current.click();
                                                                                    }
                                                                                  }}
                                                                                />
                                                                              )}

                                                                              {screenState === "partialResult" && (
                                                                                <PartialResultScreen
                                                                                  onUnlock={() => {
                                                                                    setPaywallAnnualValue(2172);
                                                                                    navigateToSubScreen("paywall");
                                                                                  }}
                                                                                  onContinueFree={handleContinueFree}
                                                                                />
                                                                              )}

                                                                              {screenState === "paywall" && (
                                                                                <PaywallScreen
                                                                                  onBack={() => setScreenState(returnScreenState)}
                                                                                  onSubscribe={handleSubscribePlan}
                                                                                  annualValue={paywallAnnualValue}
                                                                                  isLoading={isCheckoutLoading}
                                                                                />
                                                                              )}

                                                                              {screenState === "manageAccount" && (
                                                                                <ManageAccountScreen
                                                                                  onBack={() => setScreenState(returnScreenState)}
                                                                                  onSendNewInvoice={handleSendAnotherInvoice}
                                                                                  onPauseSubscription={() => {
                                                                                    setIsSubscribed(true);
                                                                                    setScreenState("empty");
                                                                                    setActiveTab("home");
                                                                                    setStatusBanner(
                                                                                      "Assinatura pausada por 30 dias grátis! Seu Cofre e tarifa travada de R$ 14,99/mês seguem protegidos."
                                                                                    );
                                                                                    window.setTimeout(() => setStatusBanner(null), 5000);
                                                                                  }}
                                                                                  onConfirmDeactivate={() => {
                                                                                    void handleCancelSubscription();
                                                                                    setScreenState("empty");
                                                                                    setActiveTab("home");
                                                                                  }}
                                                                                />
                                                                              )}

                                                                              {screenState === "result" && (
                                                                                <ResultScreen
                                                                                  data={currentAnalysisData}
                                                                                  hasAnalysis={hasSessionAnalysis}
                                                                                  isSubscribed={isSubscribed}
                                                                                  isLoggedIn={isLoggedIn}
                                                                                  auditLevel={auditLevel}
                                                                                  resolvedChargeIds={resolvedChargeIds}
                                                                                  onToggleChargeResolved={handleToggleChargeResolved}
                                                                                  onRequestSignup={() => setExternalAuthMode("signup")}
                                                                                  onSaveToVault={handleSaveResultToVault}
                                                                                  onSendAnotherFile={handleSendAnotherInvoice}
                                                                                  onTriggerFilePicker={() => {
                                                                                    if (fileInputRef.current) {
                                                                                      fileInputRef.current.value = "";
                                                                                      fileInputRef.current.click();
                                                                                    }
                                                                                  }}
                                                                                  onOpenQuiz={() => navigateToSubScreen("quiz")}
                                                                                  onUnlockEconomyReport={() => {
                                                                                    const monthlyVal =
                                                                                      currentAnalysisData.totalRecurringSavings &&
                                                                                      currentAnalysisData.totalRecurringSavings > 0
                                                                                        ? currentAnalysisData.totalRecurringSavings
                                                                                        : currentAnalysisData.totalAttention > 0
                                                                                          ? currentAnalysisData.totalAttention
                                                                                          : 181;
                                                                                    setPaywallAnnualValue(
                                                                                      Number((monthlyVal * 12).toFixed(2))
                                                                                    );
                                                                                    navigateToSubScreen("paywall");
                                                                                  }}
                                                                                />
                                                                              )}
                                                                            </main>

                                                                            {/* Navegação Inferior: Fundo branco, formato compacto, ícones monocromáticos, indicador discreto */}
                                                                            {!isPaywallFlowScreen && (
                                                                              <nav
                                                                                aria-label="Navegação principal"
                                                                                style={{ position: "fixed" }}
                                                                                className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 rounded-full bg-white/95 backdrop-blur-md p-1.5 border border-[#EAEAE7] shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center gap-1.5"
                                                                              >
                                                                                {/* 1. Início */}
                                                                                <button
                                                                                  type="button"
                                                                                  aria-label="Início"
                                                                                  onClick={() => {
                                                                                    setScreenState("empty");
                                                                                    setActiveTab("home");
                                                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                                                  }}
                                                                                  className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${screenState === "empty" && activeTab === "home"
                                                                                        ? "bg-[#F5F5F2] text-[#171717]"
                                                                                        : "bg-transparent hover:bg-[#FAFAF8] text-[#858585] hover:text-[#171717]"
                                                                                    }`}
                                                                                >
                                                                                  <HomeIcon className="w-5 h-5" />
                                                                                </button>

                                                                                {/* 2. Histórico */}
                                                                                <button
                                                                                  type="button"
                                                                                  aria-label="Histórico"
                                                                                  onClick={() => {
                                                                                    setScreenState("empty");
                                                                                    setActiveTab("vault");
                                                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                                                  }}
                                                                                  className={`w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${screenState === "empty" && activeTab === "vault"
                                                                                        ? "bg-[#F5F5F2] text-[#171717]"
                                                                                        : "bg-transparent hover:bg-[#FAFAF8] text-[#858585] hover:text-[#171717]"
                                                                                    }`}
                                                                                >
                                                                                  <HistoryIcon className="w-5 h-5" />
                                                                                </button>

                                                                                {/* 3. Análises */}
                                                                                <button
                                                                                  type="button"
                                                                                  aria-label="Análises"
                                                                                  onClick={() => {
                                                                                    setScreenState("result");
                                                                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                                                                  }}
                                                                                  className={
                                                                                    screenState === "result"
                                                                                      ? "relative w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors cursor-pointer bg-[#F5F5F2] text-[#171717]"
                                                                                      : "relative w-[42px] h-[42px] rounded-full flex items-center justify-center transition-colors cursor-pointer bg-transparent hover:bg-[#FAFAF8] text-[#858585] hover:text-[#171717]"
                                                                                  }
                                                                                >
                                                                                  <DocumentScannerIcon className="w-5 h-5" />
                                                                                  {hasSessionAnalysis && (
                                                                                    <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#0F9D58] text-[9px] font-semibold text-white flex items-center justify-center leading-none">
                                                                                      1
                                                                                    </span>
                                                                                  )}
                                                                                </button>
                                                                              </nav>
                                                                            )}

                                                                            {/* Modal / Bottom Sheet de Detalhes do Documento */}
                                                                            {selectedModalReceipt && (
                                                                              <div
                                                                                role="dialog"
                                                                                aria-modal="true"
                                                                                aria-labelledby="modal-receipt-title"
                                                                                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-0 sm:p-4"
                                                                                onClick={() => setSelectedModalReceiptId(null)}
                                                                              >
                                                                                <div
                                                                                  className="w-full max-w-[430px] rounded-t-[24px] sm:rounded-[20px] bg-white border border-[#EAEAE7] p-5 sm:p-6 shadow-[0_-12px_36px_rgba(0,0,0,0.12)] max-h-[90vh] overflow-y-auto"
                                                                                  onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                  {/* Cabeçalho do Modal */}
                                                                                  <div className="flex items-start justify-between gap-3">
                                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                                        <div className="w-11 h-11 rounded-[12px] bg-[#F5F5F2] border border-[#EAEAE7] text-[#171717] flex items-center justify-center shrink-0">
                                                                                          {selectedModalReceipt.type === "PIX" && (
                                                                                            <PixIcon className="w-5 h-5" />
                                                                                          )}
                                                                                          {selectedModalReceipt.type === "Boleto" && (
                                                                                            <BarcodeIcon className="w-5 h-5" />
                                                                                          )}
                                                                                          {selectedModalReceipt.type === "Fatura" && (
                                                                                            <InvoiceDocIcon className="w-5 h-5" />
                                                                                          )}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[#858585]">
                                                                                              {selectedModalReceipt.type} • {selectedModalReceipt.date}
                                                                                            </span>
                                                                                            <h3
                                                                                              id="modal-receipt-title"
                                                                                              className="text-[17px] font-semibold text-[#171717] leading-snug truncate"
                                                                                            >
                                                                                              {selectedModalReceipt.receiver}
                                                                                            </h3>
                                                                                        </div>
                                                                                      </div>

                                                                                      <button
                                                                                        type="button"
                                                                                        aria-label="Fechar detalhes do documento"
                                                                                        onClick={() => setSelectedModalReceiptId(null)}
                                                                                        className="w-9 h-9 rounded-full bg-[#F5F5F2] border border-[#EAEAE7] text-[#858585] hover:text-[#171717] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                                                                                      >
                                                                                        <CloseIcon className="w-4 h-4" />
                                                                                      </button>
                                                                                    </div>

                                                                                    {/* Valor Total em destaque */}
                                                                                        <div className="mt-4 rounded-[14px] bg-[#FAFAF8] border border-[#EAEAE7] px-4 py-3.5 flex items-center justify-between">
                                                                                          <span className="text-[13px] font-normal text-[#858585]">
                                                                                            Valor total do documento
                                                                                          </span>
                                                                                            <span className="text-[22px] font-semibold text-[#171717] tabular-nums tracking-[-0.02em]">
                                                                                              R$ {formatBRL(selectedModalReceipt.amount)}
                                                                                            </span>
                                                                                        </div>

                                                                                        {/* Edição de Tag com pequenas pílulas */}
                                                                                        <div className="mt-4">
                                                                                            <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[#858585] mb-2">
                                                                                              ETIQUETA / CATEGORIA
                                                                                            </p>
                                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                              {AVAILABLE_MODAL_TAGS.map((tagOption) => {
                                                                                                const isSelectedTag =
                                                                                                  selectedModalReceipt.tag.toLowerCase() ===
                                                                                                  tagOption.toLowerCase();
                                                                                                return (
                                                                                                  <button
                                                                                                    key={tagOption}
                                                                                                    type="button"
                                                                                                    onClick={() =>
                                                                                                      handleSelectModalTag(
                                                                                                        selectedModalReceipt.id,
                                                                                                        tagOption
                                                                                                      )
                                                                                                    }
                                                                                                    className={`px-3 py-1.5 rounded-full text-[12px] transition-colors cursor-pointer ${isSelectedTag
                                                                                                        ? "bg-[#171717] text-white font-medium border border-[#171717]"
                                                                                                        : "bg-[#F5F5F2] text-[#858585] border border-[#EAEAE7] hover:text-[#171717]"
                                                                                                      }`}
                                                                                                  >
                                                                                                    {tagOption}
                                                                                                  </button>
                                                                                                );
                                                                                              })}
                                                                                            </div>
                                                                                        </div>

                                                                                        {/* Condicional para FATURAS vs PIX/BOLETOS */}
                                                                                        {selectedModalReceipt.type === "Fatura" ? (
                                                                                          <div className="mt-5">
                                                                                              <p className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[#E54848] mb-2.5">
                                                                                                ALERTAS E VAZAMENTOS ENCONTRADOS
                                                                                              </p>
                                                                                              <div className="space-y-2">
                                                                                                {(currentAnalysisData.itensOportunidade &&
                                                                                                currentAnalysisData.itensOportunidade.length > 0
                                                                                                  ? currentAnalysisData.itensOportunidade.map(
                                                                                                      (op) =>
                                                                                                        `${op.categoria}: ${op.nomeEstabelecimento} (R$ ${formatBRL(
                                                                                                          op.valorMensal
                                                                                                        )}/mês · ${op.data})`
                                                                                                    )
                                                                                                  : INVOICE_LEAK_ALERTS
                                                                                                ).map((alertText, idx) => (
                                                                                                  <div
                                                                                                    key={idx}
                                                                                                    className="rounded-[12px] bg-[#E54848]/[0.06] border border-[#E54848]/20 p-3.5 flex items-start gap-2.5"
                                                                                                  >
                                                                                                      <AlertCircleIcon className="w-4 h-4 text-[#E54848] shrink-0 mt-0.5" />
                                                                                                      <p className="text-[13px] leading-snug text-[#171717] font-normal">
                                                                                                        {alertText}
                                                                                                      </p>
                                                                                                  </div>
                                                                                                ))}
                                                                                              </div>
                                                                                          </div>
                                                                                        ) : (
                                                                                          <div className="mt-5">
                                                                                              <p className="text-[11px] uppercase tracking-[0.06em] font-medium text-[#858585] mb-2.5">
                                                                                                Dados do Comprovante Validado
                                                                                              </p>
                                                                                                <div className="rounded-[14px] bg-[#FAFAF8] border border-[#EAEAE7] p-4 space-y-2.5 text-[13px]">
                                                                                                  <div className="flex items-center justify-between gap-2">
                                                                                                      <span className="text-[#858585]">Destinatário</span>
                                                                                                      <span className="font-semibold text-[#171717] text-right">
                                                                                                        {selectedModalReceipt.receiver}
                                                                                                      </span>
                                                                                                  </div>
                                                                                                  <div className="flex items-center justify-between gap-2">
                                                                                                      <span className="text-[#858585]">CPF/CNPJ mascarado</span>
                                                                                                      <span className="font-mono text-[12.5px] text-[#171717]">
                                                                                                        {selectedModalReceipt.maskedDocument}
                                                                                                      </span>
                                                                                                  </div>
                                                                                                  <div className="flex items-center justify-between gap-2">
                                                                                                      <span className="text-[#858585]">Instituição</span>
                                                                                                      <span className="font-medium text-[#171717] text-right">
                                                                                                        {selectedModalReceipt.institution}
                                                                                                      </span>
                                                                                                  </div>
                                                                                                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EAEAE7]">
                                                                                                        <span className="text-[#858585]">Status</span>
                                                                                                        <span className="font-semibold text-[#171717]">
                                                                                                          Nenhuma cobrança indevida.
                                                                                                        </span>
                                                                                                      </div>

                                                                                                      {(selectedModalReceipt.tag === "#Saúde" ||
                                                                                                        selectedModalReceipt.tag === "#ImpostoDeRenda") && (
                                                                                                              <div className="mt-2 pt-2 border-t border-[#EAEAE7] flex items-center justify-between">
                                                                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#08B968]/10 text-[#087D4A] text-[12px] font-medium w-full justify-center">
                                                                                                                  <CheckIcon className="w-3.5 h-3.5" />
                                                                                                                  <span>Elegível para dedução IRPF</span>
                                                                                                                </span>
                                                                                                              </div>
                      )}
                                                                                                          </div>
                </div>
              )}

                                                                                                  {/* Rodapé do Modal (Ações) */}
                                                                                                  <div className="mt-6 space-y-2">
                                                                                                    <button
                                                                                                      type="button"
                                                                                                      onClick={() => {
                                                                                                        downloadReceiptSummaryFile(
                                                                                                          selectedModalReceipt
                                                                                                        );
                                                                                                        setModalSharedFeedback(true);
                                                                                                        window.setTimeout(() => setModalSharedFeedback(false), 2200);
                                                                                                      }}
                                                                                                      className="w-full min-h-[46px] rounded-[12px] bg-[#171717] hover:bg-[#262626] text-white text-[14px] font-semibold py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                                                                                    >
                                                                                                      <ShareDownloadIcon className="w-4 h-4" />
                                                                                                      <span>
                                                                                                        {modalSharedFeedback
                                                                                                            ? "Comprovante pronto"
                                                                                                            : "Baixar / Compartilhar Comprovante"}
                                                                                                      </span>
                                                                                                    </button>

                                                                                                    <button
                                                                                                      type="button"
                                                                                                      onClick={() => handleDeleteFromVault(selectedModalReceipt.id)}
                                                                                                      className="w-full min-h-[40px] rounded-[12px] bg-transparent hover:bg-[#E54848]/[0.06] text-[#E54848] text-[13px] font-medium py-2 px-4 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                                                                                    >
                                                                                                      <TrashIcon className="w-4 h-4" />
                                                                                                      <span>Excluir do Cofre</span>
                                                                                                    </button>
                                                                                                  </div>
                                                                                                </div>
                                                                                              </div>
        )}
                                                                                          </div>
    </div>
                                                                                    );
}
