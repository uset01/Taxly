"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  BarcodeIcon,
  CheckIcon,
  CloseIcon,
  DocumentScannerIcon,
  HistoryIcon,
  HomeIcon,
  InvoiceDocIcon,
  PixIcon,
  PlusIcon,
  SearchIcon,
  ShareDownloadIcon,
  TrashIcon,
  UserIcon,
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

export type ScreenState =
  | "empty"
  | "analyzing"
  | "partialResult"
  | "paywall"
  | "result"
  | "connectBank";

const RESOLVED_STORAGE_KEY = "vazamentozero:resolved_charge_ids";

const BENEFITS = [
  "Joga a fatura ou extrato e vê tudo numa lista limpa",
  "Acha valores duplicados (mesmo valor, mesma data)",
  "Soma quanto foi de tarifa este mês",
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

const INITIAL_VAULT_RECEIPTS: VaultReceiptItem[] = [
  {
    id: "rec-1",
    receiver: "Oficina Brasil",
    date: "09 Nov 2026",
    tag: "#Carro",
    amount: 350.0,
    type: "PIX",
    isHealthIR: false,
    maskedDocument: "***.452.890-**",
    institution: "Itaú Unibanco S.A.",
    extractedText:
      "CNPJ 12.345.678/0001-90 Comprovante PIX Revisão freios e troca de óleo automotivo veículo carro",
  },
  {
    id: "rec-2",
    receiver: "Clínica São Lucas",
    date: "04 Nov 2026",
    tag: "#Saúde",
    amount: 420.0,
    type: "PIX",
    isHealthIR: true,
    maskedDocument: "***.452.890-**",
    institution: "Banco Bradesco S.A.",
    extractedText:
      "CNPJ 45.987.123/0001-11 Consulta médica cardiologia exames recibo dedutível Imposto de Renda IRPF saúde",
  },
  {
    id: "rec-3",
    receiver: "Condomínio Ed. Horizonte",
    date: "01 Nov 2026",
    tag: "#Moradia",
    amount: 890.5,
    type: "Boleto",
    isHealthIR: false,
    maskedDocument: "***.452.890-**",
    institution: "Caixa Econômica Federal",
    extractedText:
      "CNPJ 33.222.111/0001-55 Boleto bancário taxa condominial mensal novembro",
  },
  {
    id: "rec-4",
    receiver: "Fatura Nubank Platinum",
    date: "28 Out 2026",
    tag: "#Cartão",
    amount: 2140.8,
    type: "Fatura",
    isHealthIR: false,
    maskedDocument: "***.452.890-**",
    institution: "Nu Pagamentos S.A.",
    extractedText:
      "CNPJ 18.236.120/0001-58 Fatura fechada cartão de crédito assinaturas e compras",
  },
];

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
  const [activePlan, setActivePlan] = useState<BillingPlanId>("annual");
  const [appearanceMode, setAppearanceMode] = useState<AppearanceMode>("light");
  const [systemDark, setSystemDark] = useState(false);
  const [currentAnalysisData, setCurrentAnalysisData] =
    useState<AnalysisSummaryData>(DEFAULT_SAMPLE_ANALYSIS);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModalReceipt =
    vaultReceipts.find((item) => item.id === selectedModalReceiptId) ?? null;

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
      setCharges(hydratedCharges);
      setAuditLevel((prev) => Math.min(3, prev + 1));
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
    const newReceipt: VaultReceiptItem = {
      id: `rec-${Date.now()}`,
      receiver: formattedReceiver,
      date: "09 Nov 2026",
      tag: "#Fatura",
      amount: currentAnalysisData.totalAttention,
      type: "Fatura",
      maskedDocument: "***.452.890-**",
      institution: "Taxly Vault",
      extractedText: `Documento salvo no cofre: ${formattedReceiver} - ${currentAnalysisData.tariffs.length} tarifas e ${currentAnalysisData.duplicates.length} duplicidades detectadas.`,
    };

    setVaultReceipts((prev) => [newReceipt, ...prev]);
    setStatusBanner("Análise salva no Cofre com sucesso!");
    window.setTimeout(() => setStatusBanner(null), 3500);
    setActiveTab("vault");
    setScreenState("empty");
  };

  const handleConfirmDeleteData = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(RESOLVED_STORAGE_KEY);
      } catch {
        // Ignora erro de storage
      }
    }
    setCharges([]);
    setIsSubscribed(false);
    setSelectedFileName(null);
    setAnalysisError(null);
    setScreenState("empty");
    setStatusBanner("Seus dados locais foram apagados com sucesso (LGPD).");
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleAuthenticate = ({
    name,
    mode,
  }: {
    name: string;
    email: string;
    mode: AuthMode;
  }) => {
    setIsLoggedIn(true);
    setStatusBanner(
      mode === "signup"
        ? `Conta criada com sucesso! Bem-vindo(a), ${name}.`
        : `Bem-vindo(a) de volta, ${name}!`
    );
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleSignOut = () => {
    // TODO: Integrar ao provedor de autenticação real quando disponível
    setIsLoggedIn(false);
    setIsSubscribed(false);
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

  const handleSubscribePlan = (plan: BillingPlanId) => {
    const resolvedIds = readResolvedIdsFromStorage();
    const unlocked: Charge[] = UNLOCKED_PARTIAL_CHARGES.map((charge) => ({
      ...charge,
      status: resolvedIds.includes(charge.id) ? "resolved" : charge.status,
    }));
    setIsSubscribed(true);
    setActivePlan(plan);
    setCharges(unlocked);
    setActiveTab("home");
    setScreenState("result");
    setStatusBanner(
      `Plano ${plan === "annual" ? "Anual" : "Mensal"} ativado! Análise completa desbloqueada.`
    );
    window.setTimeout(() => setStatusBanner(null), 4500);
  };

  const handleCancelSubscription = () => {
    setIsSubscribed(false);
    setStatusBanner("Subscrição cancelada. Plano grátis ativo.");
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
    setVaultReceipts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            tag: newTag,
            isHealthIR:
              newTag === "#Saúde" || newTag === "#ImpostoDeRenda",
          }
          : item
      )
    );
  };

  const handleDeleteFromVault = (id: string) => {
    setVaultReceipts((prev) => prev.filter((item) => item.id !== id));
    setSelectedModalReceiptId(null);
  };

  const handleQuickDownload = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: VaultReceiptItem
  ) => {
    e.stopPropagation();
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

  const totalVaultFilesCount = 8 + vaultReceipts.length;
  const isPaywallFlowScreen =
    screenState === "partialResult" ||
    screenState === "paywall" ||
    screenState === "connectBank";
  const resolvedTheme =
    appearanceMode === "dark" || (appearanceMode === "system" && systemDark)
      ? "dark"
      : "light";

  return (
    <div
      data-theme={resolvedTheme}
      className="taxly-app min-h-screen w-full bg-white text-[#111111] overflow-x-hidden"
    >
      <div
        style={{ paddingBottom: isPaywallFlowScreen ? "0px" : "7rem" }}
        className={`mx-auto w-full max-w-[430px] min-w-0 min-h-screen bg-white relative ${isPaywallFlowScreen ? "" : "pb-28"
          }`}
      >
        {/* Top Row: Logo taxly + Ícone de perfil */}
        <header className="px-6 pt-5 pb-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2.5 select-none">
            <img
              src="/taxly-logo.png"
              alt="Logo taxly"
              width={34}
              height={34}
              className="w-[34px] h-[34px] object-contain shrink-0"
            />
            <span className="text-[22px] font-bold text-[#111111] tracking-[-0.035em] leading-none">
              taxly
            </span>
          </div>

          <ProfileMenu
            isLoggedIn={isLoggedIn}
            isSubscribed={isSubscribed}
            activePlan={activePlan}
            appearanceMode={appearanceMode}
            onAuthenticate={handleAuthenticate}
            onChangeAppearance={handleChangeAppearance}
            onSendAnotherInvoice={handleSendAnotherInvoice}
            onOpenHistory={() => {
              setScreenState("empty");
              setActiveTab("vault");
            }}
            onOpenPaywall={() => setScreenState("paywall")}
            onCancelSubscription={handleCancelSubscription}
            onExportAnalyses={handleExportAnalyses}
            onDeleteData={handleConfirmDeleteData}
            onSignOut={handleSignOut}
          />
        </header>

        {statusBanner && screenState !== "result" && (
          <div
            role="status"
            className="mx-6 mt-2 rounded-[14px] bg-[#F5F5F5] px-4 py-2.5 text-[13px] font-medium text-[#171717] text-left"
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
        <main
          style={{ paddingBottom: isPaywallFlowScreen ? "0px" : "7rem" }}
          className={`px-6 pt-3 ${isPaywallFlowScreen ? "" : "pb-28"}`}
        >
          {screenState === "empty" && activeTab === "home" && (
            <section
              aria-label="Boas-vindas e envio de fatura ou comprovante"
              style={{ paddingBottom: "7rem" }}
              className="pb-28"
            >
              {/* Headline, Subtítulo & Prova Social */}
              <div>
                {/* Contador animado no topo (Task 1) */}
                <div className="mb-3.5">
                  <LiveCounter />
                </div>

                <h1 className="text-[34px] sm:text-[38px] leading-[1.06] tracking-[-0.035em] font-bold text-left break-words">
                  <span className="text-[#0F0F0F] dark:text-white">
                    Você pode estar pagando por algo que{" "}
                  </span>
                  <span className="text-[#BDBDBD] dark:text-[#71717A]">não usa.</span>
                </h1>

                <p className="mt-3 text-[14.5px] leading-[1.45] text-[#6B7280] dark:text-[#A1A1AA] font-normal text-left">
                  Em média, encontramos R$ 340 escondidos por mês em extratos de brasileiros. Quanto você está deixando passar?
                </p>
              </div>

              {/* Card de Upload cinza-claro original com botão quadrado verde + */}
              {isCardScanning ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="mt-5 w-full rounded-[28px] bg-[#F5F5F5] dark:bg-[#1E1E20] py-8 px-6 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-[58px] h-[58px] rounded-[18px] bg-[#22C55E] text-[#0A2914] flex items-center justify-center mb-3 animate-pulse">
                    <DocumentScannerIcon className="w-6 h-6" />
                  </div>
                  <p className="text-[15px] font-semibold text-[#111111] dark:text-white">
                    Varrendo documento e mascarando dados sensíveis...
                  </p>
                  <div className="mt-3.5 w-44 h-1.5 rounded-full bg-[#E5E5E5] dark:bg-[#333] overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-[#22C55E] animate-pulse" />
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="vault-file-input"
                  aria-label="Enviar arquivo em PDF, imagem ou print do banco"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`group mt-5 w-full rounded-[28px] py-7 px-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer select-none ${isDragging
                      ? "bg-[#EBEBEB] dark:bg-[#2A2A2A]"
                      : "bg-[#F5F5F5] dark:bg-[#1C1C1E] hover:bg-[#EFEFEF] dark:hover:bg-[#242426] active:bg-[#E8E8E8]"
                    }`}
                >
                  <div className="cta-plus-button w-[58px] h-[58px] rounded-[18px] bg-[#22C55E] group-active:bg-[#00A047] active:bg-[#00A047] text-[#0A2914] flex items-center justify-center mb-3 shadow-sm">
                    <PlusIcon className="w-6 h-6" />
                  </div>
                  <span className="text-[17px] font-semibold tracking-[-0.02em] text-[#111111] dark:text-white">
                    Enviar arquivo
                  </span>
                  <span className="text-[13.5px] text-[#8E8E93] mt-1">
                    PDF, imagem ou print do banco
                  </span>
                  <span className="mt-2 text-[12px] text-[#8E8E93] font-normal">
                    Grátis · Sem cadastro no primeiro resultado
                  </span>
                </label>
              )}

              {/* Botão secundário abaixo do CTA de upload (Task 1 e 6) */}
              <button
                type="button"
                onClick={() => setScreenState("connectBank")}
                className="mt-3 w-full min-h-[46px] rounded-[16px] bg-[#FAFAFA] dark:bg-[#1E1E20] hover:bg-[#F0F0F0] dark:hover:bg-[#28282A] text-[#111111] dark:text-white text-[13.5px] font-semibold px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer border border-[#EAEAEA] dark:border-[#2C2C2E]"
              >
                <span>Não tem a fatura em mãos? Conecte seu banco</span>
                <span className="text-[#00C853] font-bold">→</span>
              </button>

              {/* Checklist + Nota de Privacidade */}
              <ul
                aria-label="Benefícios da análise de fatura"
                className="mt-5 space-y-2.5"
              >
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="w-[22px] h-[22px] rounded-full bg-[#F5F5F5] text-[#00C853] flex items-center justify-center shrink-0"
                    >
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span className="text-[14.5px] text-[#262626] leading-snug font-normal text-left">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-3.5 text-[12px] leading-normal text-[#9CA3AF] text-left">
                Seus dados são mascarados e{" "}
                <strong className="font-semibold text-[#6B7280]">
                  não vendemos
                </strong>{" "}
                informações.
              </p>
            </section>
          )}

          {/* Tela secundária: Meu Cofre (sem card de upload nem checklist) */}
          {screenState === "empty" && activeTab === "vault" && (
            <section
              aria-label="Meu Cofre"
              style={{ paddingBottom: "7rem" }}
              className="pb-28"
            >
              {/* Header "Meu Cofre" */}
              <div className="flex items-center justify-between">
                <h1 className="text-[28px] leading-[1.12] tracking-[-0.03em] font-bold text-[#0F0F0F]">
                  Meu Cofre
                </h1>
                <span className="text-[13px] font-medium text-[#8E8E93]">
                  {totalVaultFilesCount} arquivos
                </span>
              </div>

              {/* Valor total encontrado no topo */}
              <div className="mt-5">
                <p className="text-[13.5px] text-[#8E8E93] leading-snug">
                  Valor total encontrado
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-[28px] font-bold tracking-[-0.03em] text-[#0F0F0F] tabular-nums leading-none">
                    R$ 184,70/mês
                  </span>
                </div>
              </div>

              {/* Barra de busca minimalista */}
              <div className="mt-5 relative">
                <SearchIcon className="w-[17px] h-[17px] text-[#8E8E93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={vaultSearchQuery}
                  onChange={(e) => setVaultSearchQuery(e.target.value)}
                  aria-label="Buscar comprovantes no cofre"
                  placeholder="Buscar por nome, valor ou #tag..."
                  className="w-full h-[44px] pl-10 pr-3.5 rounded-2xl bg-[#F5F5F5] border border-transparent text-[13.5px] text-[#111111] placeholder:text-[#8E8E93] focus:outline-none focus:bg-white focus:border-[#111111] transition-colors"
                />
              </div>

              {/* Pílulas de filtro rápido */}
              <div
                role="tablist"
                aria-label="Filtrar comprovantes por categoria"
                className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
              >
                {VAULT_FILTER_PILLS.map((pill) => {
                  const isActive = activeVaultCategory === pill;
                  return (
                    <button
                      key={pill}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveVaultCategory(pill)}
                      className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${isActive
                          ? "bg-[#141414] text-white"
                          : "bg-[#F5F5F5] text-[#52525B] hover:bg-[#EAEAEA]"
                        }`}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>

              {/* Lista de Arquivos */}
              <div className="mt-4 space-y-2.5">
                {filteredVaultReceipts.length > 0 ? (
                  filteredVaultReceipts.map((item) => {
                    const isDownloaded = downloadedReceiptId === item.id;

                    return (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`Abrir detalhes de ${item.receiver}, ${item.date}, valor R$ ${formatBRL(item.amount)}`}
                        onClick={() => {
                          setModalSharedFeedback(false);
                          setSelectedModalReceiptId(item.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setModalSharedFeedback(false);
                            setSelectedModalReceiptId(item.id);
                          }
                        }}
                        className="h-[68px] rounded-2xl bg-[#F8F8F8] hover:bg-[#F2F2F2] active:bg-[#EBEBEB] px-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            aria-label={`Tipo: ${item.type}`}
                            title={item.type}
                            className="w-[38px] h-[38px] rounded-xl bg-white text-[#111111] flex items-center justify-center shrink-0"
                          >
                            {item.type === "PIX" && (
                              <PixIcon className="w-[18px] h-[18px]" />
                            )}
                            {item.type === "Boleto" && (
                              <BarcodeIcon className="w-[18px] h-[18px]" />
                            )}
                            {item.type === "Fatura" && (
                              <InvoiceDocIcon className="w-[18px] h-[18px]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[14.5px] font-semibold text-[#111111] leading-tight truncate">
                              {item.receiver}
                            </p>
                            <div className="mt-1 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                              <span className="text-[12px] text-[#8E8E93] shrink-0">
                                {item.date}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white text-[11px] font-medium text-[#52525B] shrink-0">
                                {item.tag}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[14.5px] font-bold text-[#111111] tabular-nums whitespace-nowrap">
                            R$ {formatBRL(item.amount)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Baixar ou compartilhar comprovante original de ${item.receiver}`}
                            title="Baixar/compartilhar comprovante original"
                            onClick={(e) => handleQuickDownload(e, item)}
                            className="w-[34px] h-[34px] rounded-xl bg-white hover:bg-[#EAEAEA] active:bg-[#E0E0E0] text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
                          >
                            {isDownloaded ? (
                              <CheckIcon className="w-4 h-4 text-[#111111]" />
                            ) : (
                              <ShareDownloadIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-[#F5F5F5] py-6 px-4 text-center">
                    <p className="text-[13.5px] text-[#8E8E93]">
                      Nenhum comprovante encontrado para essa busca.
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {screenState === "analyzing" && (
            <section
              aria-label="Análise da fatura em andamento"
              style={{ paddingBottom: "7rem" }}
              className="pt-2 pb-28"
            >
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
                            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-colors ${isCompleted
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
                    Documento não reconhecido
                  </h1>

                  <p className="text-[14.5px] text-[#4A504C] mt-2 leading-relaxed">
                    {analysisError}
                  </p>

                  <div className="mt-4 rounded-[18px] bg-white p-4 text-left border border-[#E2E0D8]">
                    <p className="text-[13px] font-semibold text-[#181C1A]">
                      O Taxly analisa exclusivamente:
                    </p>
                    <ul className="mt-1.5 text-[13px] text-[#4A504C] space-y-1 list-disc list-inside">
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
                    className="mt-5 w-full min-h-[50px] rounded-[16px] bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white font-semibold text-[15px] py-3.5 px-5 flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

          {screenState === "partialResult" && (
            <PartialResultScreen
              onUnlock={() => setScreenState("paywall")}
              onContinueFree={handleContinueFree}
            />
          )}

          {screenState === "paywall" && (
            <PaywallScreen
              onBack={() => setScreenState("result")}
              onSubscribe={handleSubscribePlan}
            />
          )}

          {screenState === "result" && (
            <ResultScreen
              data={currentAnalysisData}
              isSubscribed={isSubscribed}
              auditLevel={auditLevel}
              onSaveToVault={handleSaveResultToVault}
              onSendAnotherFile={handleSendAnotherInvoice}
              onUnlockEconomyReport={() => setScreenState("paywall")}
            />
          )}
        </main>

        {/* Barra Flutuante Inferior com Rótulos e FAB centralizado (Task 7) */}
        {!isPaywallFlowScreen && (
          <nav
            aria-label="Navegação principal"
            style={{ position: "fixed" }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-[400px] rounded-full bg-white/95 dark:bg-[#1A1A1A]/95 backdrop-blur-md px-3 py-2 border border-[#F0F0F0] dark:border-[#2E2E30] shadow-xl flex items-center justify-between"
          >
            {/* 1. Início */}
            <button
              type="button"
              onClick={() => {
                setScreenState("empty");
                setActiveTab("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors cursor-pointer ${
                screenState === "empty" && activeTab === "home"
                  ? "text-[#111111] dark:text-white font-bold"
                  : "text-[#8E8E93] hover:text-[#111111] dark:hover:text-white font-medium"
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span className="text-[10.5px]">Início</span>
            </button>

            {/* 2. Histórico */}
            <button
              type="button"
              onClick={() => {
                setScreenState("empty");
                setActiveTab("vault");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors cursor-pointer ${
                screenState === "empty" && activeTab === "vault"
                  ? "text-[#111111] dark:text-white font-bold"
                  : "text-[#8E8E93] hover:text-[#111111] dark:hover:text-white font-medium"
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
              <span className="text-[10.5px]">Histórico</span>
            </button>

            {/* 3. FAB Centralizado (+) */}
            <div className="relative px-1 -mt-5 flex items-center justify-center">
              <button
                type="button"
                aria-label="Enviar novo arquivo"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                className="w-[52px] h-[52px] rounded-full bg-[#00C853] hover:bg-[#00B54B] active:bg-[#00A047] text-white flex items-center justify-center shadow-lg border-[3.5px] border-white dark:border-[#1A1A1A] transition-transform active:scale-95 cursor-pointer"
              >
                <PlusIcon className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* 4. Análises (com badge 2 anexado) */}
            <button
              type="button"
              onClick={() => {
                if (currentAnalysisData) {
                  setScreenState("result");
                } else {
                  setActiveTab("vault");
                  setScreenState("empty");
                }
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className={`flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-full transition-colors cursor-pointer ${
                screenState === "result"
                  ? "text-[#111111] dark:text-white font-bold"
                  : "text-[#8E8E93] hover:text-[#111111] dark:hover:text-white font-medium"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <DocumentScannerIcon className="w-4 h-4" />
                <span className="absolute -top-1 -right-2.5 w-3.5 h-3.5 rounded-full bg-[#00C853] text-[9px] font-bold text-black flex items-center justify-center">
                  2
                </span>
              </div>
              <span className="text-[10.5px]">Análises</span>
            </button>

            {/* 5. Perfil */}
            <button
              type="button"
              onClick={() => {
                const profileBtn = document.querySelector(
                  'button[aria-label="Abrir perfil e opções da conta"]'
                ) as HTMLButtonElement | null;
                if (profileBtn) {
                  profileBtn.click();
                }
              }}
              className="flex-1 py-1 flex flex-col items-center justify-center gap-0.5 rounded-full text-[#8E8E93] hover:text-[#111111] dark:hover:text-white font-medium transition-colors cursor-pointer"
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-[10.5px]">Perfil</span>
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
              className="w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] bg-[#F8F7F4] border border-[#E5E5E0] p-5 sm:p-6 shadow-[0_-12px_36px_rgba(0,0,0,0.16)] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[44px] h-[44px] rounded-2xl bg-white border border-[#E5E5E0] text-[#141414] flex items-center justify-center shrink-0">
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
                    <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[#686D68]">
                      {selectedModalReceipt.type} • {selectedModalReceipt.date}
                    </span>
                    <h3
                      id="modal-receipt-title"
                      className="text-[18px] font-semibold text-[#141414] leading-snug truncate"
                    >
                      {selectedModalReceipt.receiver}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="Fechar detalhes do documento"
                  onClick={() => setSelectedModalReceiptId(null)}
                  className="w-[38px] h-[38px] rounded-full bg-white border border-[#E5E5E0] text-[#4A504C] hover:text-[#141414] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Valor Total em destaque */}
              <div className="mt-4 rounded-2xl bg-white border border-[#E5E5E0] px-4 py-3.5 flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#4A504C]">
                  Valor total do documento
                </span>
                <span className="text-[22px] font-bold text-[#141414] tabular-nums">
                  R$ {formatBRL(selectedModalReceipt.amount)}
                </span>
              </div>

              {/* Edição de Tag com pequenas pílulas */}
              <div className="mt-4">
                <p className="text-[11.5px] uppercase tracking-[0.1em] font-semibold text-[#4E5450] mb-2">
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
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${isSelectedTag
                            ? "bg-[#141414] text-white border border-[#141414]"
                            : "bg-white text-[#4A504C] border border-[#E5E5E0] hover:border-[#141414]/40"
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
                  <p className="text-[11.5px] uppercase tracking-[0.1em] font-semibold text-[#912018] mb-2.5">
                    ALERTAS E VAZAMENTOS ENCONTRADOS (3)
                  </p>
                  <div className="space-y-2">
                    {INVOICE_LEAK_ALERTS.map((alertText, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl bg-[#FAF0EE] border border-[#F1D5D0] p-3.5 flex items-start gap-2.5"
                      >
                        <AlertCircleIcon className="w-4 h-4 text-[#B42318] shrink-0 mt-0.5" />
                        <p className="text-[13px] leading-snug text-[#3A1A18] font-medium">
                          {alertText}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="text-[11.5px] uppercase tracking-[0.1em] font-semibold text-[#4E5450] mb-2.5">
                    Dados do Comprovante Validado
                  </p>
                  <div className="rounded-2xl bg-white border border-[#E5E5E0] p-4 space-y-2.5 text-[13px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#686D68]">Destinatário</span>
                      <span className="font-semibold text-[#141414] text-right">
                        {selectedModalReceipt.receiver}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#686D68]">CPF/CNPJ mascarado</span>
                      <span className="font-mono text-[12.5px] text-[#141414]">
                        {selectedModalReceipt.maskedDocument}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[#686D68]">Instituição</span>
                      <span className="font-medium text-[#141414] text-right">
                        {selectedModalReceipt.institution}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0EFEA]">
                      <span className="text-[#686D68]">Status</span>
                      <span className="font-semibold text-[#141414]">
                        Nenhuma cobrança indevida.
                      </span>
                    </div>

                    {(selectedModalReceipt.tag === "#Saúde" ||
                      selectedModalReceipt.tag === "#ImpostoDeRenda") && (
                        <div className="mt-2 pt-2 border-t border-[#F0EFEA] flex items-center justify-between">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EBF3EE] text-[#1E4635] text-[12px] font-semibold w-full justify-center">
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
                    setModalSharedFeedback(true);
                    window.setTimeout(() => setModalSharedFeedback(false), 2200);
                  }}
                  className="w-full min-h-[48px] rounded-2xl bg-[#141414] hover:bg-[#262626] text-white text-[14.5px] font-semibold py-3 px-4 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShareDownloadIcon className="w-4 h-4" />
                  <span>
                    {modalSharedFeedback
                      ? "Comprovante pronto ✓"
                      : "Baixar / Compartilhar Comprovante"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteFromVault(selectedModalReceipt.id)}
                  className="w-full min-h-[42px] rounded-2xl bg-transparent hover:bg-[#EFECE6] text-[#8A2921] text-[13.5px] font-medium py-2.5 px-4 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
