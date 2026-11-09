"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircleIcon,
  BarcodeIcon,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CopyIcon,
  DocumentScannerIcon,
  InvoiceDocIcon,
  LogOutIcon,
  PixIcon,
  SearchIcon,
  ShareDownloadIcon,
  ShieldCheckIcon,
  TrashIcon,
  UploadIcon,
} from "@/components/icons";
import {
  Charge,
  calculateChargesMetrics,
  formatBRL,
} from "@/data/charges";
import {
  AnalysisStageId,
  InvoiceAnalysisError,
  analyzeInvoice,
} from "@/lib/analyze-invoice";

export type ScreenState = "empty" | "analyzing" | "result";

const RESOLVED_STORAGE_KEY = "vazamentozero:resolved_charge_ids";

const BENEFITS = [
  "Resultado em 15 segundos",
  "Acha cobranças duplicadas e taxas escondidas",
  "Mostra como cancelar, passo a passo",
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
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [currentStage, setCurrentStage] = useState<AnalysisStageId>("reading");
  const [completedStages, setCompletedStages] = useState<AnalysisStageId[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [expandedChargeId, setExpandedChargeId] = useState<string | null>(null);
  const [copiedChargeId, setCopiedChargeId] = useState<string | null>(null);
  const [monitoringFeedback, setMonitoringFeedback] = useState(false);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const selectedModalReceipt =
    vaultReceipts.find((item) => item.id === selectedModalReceiptId) ?? null;

  // Rola para o topo sempre que mudar de estado para evitar salto visual
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screenState]);

  // Fecha o menu do avatar ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isAvatarMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setIsAvatarMenuOpen(false);
        setIsConfirmingDelete(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
        setIsConfirmingDelete(false);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAvatarMenuOpen]);

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

  const saveResolvedIdsToStorage = (ids: string[]) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(RESOLVED_STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignora indisponibilidade de storage privado
    }
  };

  const handleStartAnalysis = async (file: File) => {
    setSelectedFileName(file.name);
    setAnalysisError(null);
    setCurrentStage("reading");
    setCompletedStages([]);
    setAnalysisProgress(10);
    setExpandedChargeId(null);
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
      setCharges(hydratedCharges);
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

  const handleToggleAccordion = (chargeId: string) => {
    setExpandedChargeId((prev) => (prev === chargeId ? null : chargeId));
  };

  const handleCopyScript = async (chargeId: string, scriptText: string) => {
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopiedChargeId(chargeId);
      window.setTimeout(() => {
        setCopiedChargeId((prev) => (prev === chargeId ? null : prev));
      }, 2200);
    } catch {
      setCopiedChargeId(chargeId);
    }
  };

  const handleMarkResolved = (chargeId: string) => {
    setCharges((prev) => {
      const updated: Charge[] = prev.map((item) =>
        item.id === chargeId
          ? {
              ...item,
              status: item.status === "resolved" ? "active" : "resolved",
            }
          : item
      );
      const resolvedIds = updated
        .filter((item) => item.status === "resolved")
        .map((item) => item.id);
      saveResolvedIdsToStorage(resolvedIds);
      return updated;
    });
    setExpandedChargeId((prev) => (prev === chargeId ? null : prev));
  };

  const handleActivateMonitoring = () => {
    // TODO: Integrar ao checkout de pagamento (Stripe / Mercado Pago / Pix recorrente) de R$ 14,90/mês
    setMonitoringFeedback(true);
    window.setTimeout(() => setMonitoringFeedback(false), 3500);
  };

  const handleSendAnotherInvoice = () => {
    setIsAvatarMenuOpen(false);
    setIsConfirmingDelete(false);
    setAnalysisError(null);
    setExpandedChargeId(null);
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
    setSelectedFileName(null);
    setExpandedChargeId(null);
    setAnalysisError(null);
    setIsConfirmingDelete(false);
    setIsAvatarMenuOpen(false);
    setScreenState("empty");
    setStatusBanner("Seus dados locais foram apagados com sucesso (LGPD).");
    window.setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleSignOut = () => {
    // TODO: Integrar ao provedor de autenticação real quando disponível
    setIsAvatarMenuOpen(false);
    setIsConfirmingDelete(false);
    setExpandedChargeId(null);
    setScreenState("empty");
    setStatusBanner("Sessão encerrada.");
    window.setTimeout(() => setStatusBanner(null), 3500);
  };

  const metrics = calculateChargesMetrics(charges);

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

    const rawName = file?.name
      ? file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
      : "";
    const lowerName = rawName.toLowerCase();

    const isPix = lowerName.includes("pix") || lowerName.includes("comprovante");
    const isBoleto = lowerName.includes("boleto");
    const detectedType: VaultReceiptType = isPix
      ? "PIX"
      : isBoleto
        ? "Boleto"
        : "Fatura";

    const formattedReceiver = rawName
      ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
      : "Fatura Cartão Itaú";

    window.setTimeout(() => {
      const newReceipt: VaultReceiptItem = {
        id: `rec-${Date.now()}`,
        receiver: formattedReceiver,
        date: "09 Nov 2026",
        tag:
          detectedType === "Fatura"
            ? "#Cartão"
            : detectedType === "Boleto"
              ? "#Moradia"
              : "#Saúde",
        amount: detectedType === "Fatura" ? 1890.4 : 265.0,
        type: detectedType,
        isHealthIR: detectedType === "PIX",
        maskedDocument: "***.452.890-**",
        institution:
          detectedType === "Fatura"
            ? "Itaú Unibanco S.A."
            : "Nu Pagamentos S.A.",
        extractedText: `CNPJ 60.701.190/0001-04 ${formattedReceiver} documento analisado e mascarado`,
      };

      setVaultReceipts((prev) => [newReceipt, ...prev]);
      setActiveVaultCategory("Todos");
      setVaultSearchQuery("");
      setIsCardScanning(false);
      setSelectedModalReceiptId(newReceipt.id);
    }, 2000);
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

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#161A18] flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen bg-[#F8F7F4] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] relative">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 bg-[#F8F7F4]/95 backdrop-blur-md border-b border-[#EAE8E2] px-5 py-3 flex items-center justify-between">
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

          <div ref={avatarMenuRef} className="relative">
            <button
              type="button"
              aria-label="Abrir menu da conta de Davi (DM)"
              aria-haspopup="menu"
              aria-expanded={isAvatarMenuOpen}
              onClick={() => {
                setIsAvatarMenuOpen((prev) => !prev);
                setIsConfirmingDelete(false);
              }}
              className="min-w-[44px] min-h-[44px] w-[44px] h-[44px] rounded-full bg-[#1B1D1B] text-white text-[13px] font-bold tracking-wide flex items-center justify-center hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] transition-opacity cursor-pointer"
            >
              DM
            </button>

            {isAvatarMenuOpen && (
              <div
                role="menu"
                aria-label="Opções da conta e privacidade"
                className="absolute right-0 mt-2 w-[256px] rounded-[20px] bg-white border border-[#E2E0D8] shadow-[0_14px_34px_rgba(24,27,25,0.16)] p-2 z-50"
              >
                {!isConfirmingDelete ? (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSendAnotherInvoice}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[12px] text-left text-[14px] font-medium text-[#181C1A] hover:bg-[#F0EFEA] flex items-center gap-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-[#181B19] cursor-pointer"
                    >
                      <UploadIcon className="w-4 h-4 text-[#4A504C] shrink-0" />
                      <span>Enviar outra fatura</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[12px] text-left text-[14px] font-medium text-[#B42318] hover:bg-[#FDF2F2] flex items-center gap-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-[#B42318] cursor-pointer"
                    >
                      <TrashIcon className="w-4 h-4 text-[#B42318] shrink-0" />
                      <span>Apagar meus dados</span>
                    </button>

                    <hr className="my-1 border-t border-[#EAE8E2]" />

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-[12px] text-left text-[14px] font-medium text-[#4A504C] hover:bg-[#F0EFEA] hover:text-[#181C1A] flex items-center gap-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-[#181B19] cursor-pointer"
                    >
                      <LogOutIcon className="w-4 h-4 text-[#4A504C] shrink-0" />
                      <span>Sair</span>
                    </button>
                  </>
                ) : (
                  <div
                    role="alertdialog"
                    aria-label="Confirmação para apagar dados"
                    className="p-2"
                  >
                    <p className="text-[13.5px] font-semibold text-[#181C1A]">
                      Apagar todos os seus dados?
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[#4A504C]">
                      Isso remove o histórico de cobranças resolvidas e análises
                      salvas neste dispositivo (LGPD).
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-[12px] bg-[#F0EFEA] hover:bg-[#E4E2DC] text-[13px] font-semibold text-[#181C1A] transition-colors focus-visible:outline-2 focus-visible:outline-[#181B19] cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDeleteData}
                        className="flex-1 min-h-[44px] px-3 py-2 rounded-[12px] bg-[#B42318] hover:bg-[#912018] text-[13px] font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-[#B42318] cursor-pointer"
                      >
                        Apagar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {statusBanner && (
          <div
            role="status"
            className="mx-5 mt-3 rounded-[14px] bg-[#E2ECE7] px-4 py-2.5 text-[13px] font-medium text-[#1E4635] text-center"
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
        <main className="px-5 pt-5">
          {screenState === "empty" && (
            <section aria-label="Boas-vindas e envio de fatura ou comprovante">
              {/* Subtítulo ajustado para caber em até 3 linhas no mobile */}
              <div>
                <h1 className="text-[19px] sm:text-[20px] leading-[1.35] tracking-[-0.02em] font-medium text-[#141414]">
                  Descubra vazamentos nas faturas e guarde comprovantes PIX sem
                  bagunça.
                </h1>
              </div>

              {/* Card NOVA ANÁLISE / Envie fatura ou comprovante (sem botão Enviar documento) */}
              <div className="mt-5 rounded-[28px] invoice-card-gradient p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#485250]">
                      NOVA ANÁLISE
                    </p>
                    <h2 className="text-[21px] leading-tight tracking-[-0.02em] font-medium text-[#1F2725] mt-1">
                      Envie fatura ou comprovante
                    </h2>
                  </div>
                  <ShieldCheckIcon className="w-[21px] h-[21px] text-[#485250] mt-0.5 shrink-0" />
                </div>

                {isCardScanning ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-4 w-full rounded-[20px] bg-white py-10 px-5 flex flex-col items-center justify-center text-center border border-[#E5E5E0] shadow-xs"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-[#EBF3EE] text-[#285A44] flex items-center justify-center mb-3 animate-pulse">
                      <DocumentScannerIcon className="w-6 h-6" />
                    </div>
                    <p className="text-[14.5px] font-semibold text-[#141414]">
                      Varrendo documento e mascarando dados sensíveis...
                    </p>
                    <div className="mt-3.5 w-44 h-1.5 rounded-full bg-[#EFECE6] overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-[#141414] animate-pulse" />
                    </div>
                  </div>
                ) : (
                  /* Selector dropzone simples como estava */
                  <label
                    htmlFor="vault-file-input"
                    aria-label="Toque para escolher seu arquivo de fatura ou comprovante em PDF, imagem ou print"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`mt-4 w-full rounded-[20px] bg-white active:bg-[#F8F7F4] py-8 px-5 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all cursor-pointer select-none focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#141414] ${
                      isDragging
                        ? "border-[#141414] bg-[#F8F7F4]"
                        : "border-[#D5D3CC] hover:border-[#485250]"
                    }`}
                  >
                    <UploadIcon className="w-[22px] h-[22px] text-[#485250] mb-2.5" />
                    <span className="text-[15.5px] font-semibold text-[#1F2725]">
                      Toque para escolher seu arquivo
                    </span>
                    <span className="text-[13.5px] text-[#4E5450] mt-1">
                      Aceita PDF, imagem ou print do app do banco
                    </span>
                  </label>
                )}

                <p className="text-[12.5px] leading-[1.45] text-[#4A504C] text-center max-w-[310px] mx-auto mt-4">
                  Seus dados são mascarados e não vendemos informações.
                </p>
              </div>

              {/* 3 Benefits List (logo abaixo do card principal de upload, antes de MEU COFRE) */}
              <ul
                aria-label="Benefícios da análise de fatura"
                className="mt-5 space-y-2.5 px-1"
              >
                {BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="w-[20px] h-[20px] rounded-full bg-[#E3EDE8] text-[#285A44] flex items-center justify-center shrink-0"
                    >
                      <CheckIcon className="w-3 h-3" />
                    </span>
                    <span className="text-[14px] text-[#2F3531] leading-snug font-medium">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Nova Seção: Cofre de Comprovantes */}
              <div
                aria-label="Cofre de Comprovantes"
                className="mt-7 pt-5 border-t border-[#EAE8E2]"
              >
                {/* Cabeçalho discreto alinhado à esquerda com contador lateral */}
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#4E5450]">
                    MEU COFRE
                  </h2>
                  <span className="text-[12px] font-medium text-[#686D68]">
                    {totalVaultFilesCount} arquivos
                  </span>
                </div>

                {/* Mini-banner de Resumo de Impacto no Cofre */}
                <div className="mt-2.5 rounded-2xl bg-[#EBF3EE] border border-[#D4E5DA] px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-[#244B39]">
                    Vazamentos detectados no mês
                  </span>
                  <span className="text-[13.5px] font-bold text-[#193829] tabular-nums whitespace-nowrap">
                    R$ 184,70 / mês
                  </span>
                </div>

                {/* Barra de busca minimalista */}
                <div className="mt-2.5 relative">
                  <SearchIcon className="w-[17px] h-[17px] text-[#686D68] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={vaultSearchQuery}
                    onChange={(e) => setVaultSearchQuery(e.target.value)}
                    aria-label="Buscar comprovantes no cofre"
                    placeholder="Buscar por nome, valor ou #tag..."
                    className="w-full h-[44px] pl-10 pr-3.5 rounded-2xl bg-white border border-[#E5E5E0] text-[13.5px] text-[#141414] placeholder:text-[#787C77] focus:outline-none focus:border-[#141414] transition-colors"
                  />
                </div>

                {/* Pílulas de filtro rápido (scroll horizontal no mobile) */}
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
                        className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-[#141414] text-white border border-[#141414]"
                            : "bg-white text-[#4A504C] border border-[#E5E5E0] hover:border-[#141414]/40"
                        }`}
                      >
                        {pill}
                      </button>
                    );
                  })}
                </div>

                {/* Lista de Comprovantes (Cards compactos) */}
                <div className="mt-3 space-y-2.5">
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
                          className="h-[68px] rounded-2xl bg-white active:bg-[#F8F7F4] border border-[#E5E5E0]/90 hover:border-[#141414]/30 px-3.5 flex items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-colors cursor-pointer select-none"
                        >
                          {/* Esquerda: Ícone minimalista indicando o tipo */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              aria-label={`Tipo: ${item.type}`}
                              title={item.type}
                              className="w-[38px] h-[38px] rounded-xl bg-[#F8F7F4] border border-[#E5E5E0] text-[#141414] flex items-center justify-center shrink-0"
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

                            {/* Centro: Nome do recebedor (truncate) e data + tag na mesma linha horizontal */}
                            <div className="min-w-0 flex-1">
                              <p className="text-[14.5px] font-semibold text-[#141414] leading-tight truncate">
                                {item.receiver}
                              </p>
                              <div className="mt-1 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                                <span className="text-[12px] text-[#686D68] shrink-0">
                                  {item.date}
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-[#F3F2EE] text-[11px] font-medium text-[#3B6B56] shrink-0">
                                  {item.tag}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Direita: Valor formatado em Real em negrito e ação rápida */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            <span className="text-[14.5px] font-bold text-[#141414] tabular-nums whitespace-nowrap">
                              R$ {formatBRL(item.amount)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Baixar ou compartilhar comprovante original de ${item.receiver}`}
                              title="Baixar/compartilhar comprovante original"
                              onClick={(e) => handleQuickDownload(e, item)}
                              className="w-[34px] h-[34px] rounded-xl bg-[#F8F7F4] hover:bg-[#ECEAE4] active:bg-[#ECEAE4] border border-[#E5E5E0] text-[#141414] flex items-center justify-center transition-colors cursor-pointer"
                            >
                              {isDownloaded ? (
                                <CheckIcon className="w-4 h-4 text-[#285A44]" />
                              ) : (
                                <ShareDownloadIcon className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-white border border-[#E5E5E0]/80 py-6 px-4 text-center">
                      <p className="text-[13.5px] text-[#4E5450]">
                        Nenhum comprovante encontrado para essa busca.
                      </p>
                    </div>
                  )}
                </div>
              </div>
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
            <section aria-label="Resultado da análise de cobranças">
              {/* Greeting / Dynamic Title */}
              <h1 className="text-[26px] sm:text-[28px] leading-[1.2] tracking-[-0.03em]">
                <span className="block font-medium text-[#161A18]">
                  Encontramos R$ {formatBRL(metrics.activeTotal)} para você
                  recuperar.
                </span>
              </h1>

              {/* Card Possível economia */}
              <div className="mt-5 rounded-[26px] bg-[#F0EFEA] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-[#4A504C]">
                    Possível economia
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className="text-[42px] sm:text-[46px] leading-[1.04] tracking-[-0.035em] font-medium text-[#141F1B] tabular-nums">
                    R$ {formatBRL(metrics.activeTotal)}
                  </p>
                  <p className="text-[13.5px] text-[#4A504C] mt-1.5 tabular-nums">
                    por mês • R$ {formatBRL(metrics.annualActiveTotal)} por ano
                    • {metrics.totalCount} cobranças
                  </p>
                </div>

                {metrics.resolvedTotal > 0 && (
                  <div
                    role="status"
                    className="mt-4 rounded-[14px] bg-[#E2ECE7] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#1E4635] flex items-center gap-2"
                  >
                    <span>
                      ✓ Você já recuperou R$ {formatBRL(metrics.resolvedTotal)}
                      /mês
                    </span>
                  </div>
                )}

                <div className="mt-5 pt-1">
                  <div className="flex items-center justify-between text-[13px] font-medium text-[#4A504C] mb-2">
                    <span id="resolved-progress-label">
                      {metrics.resolvedCount} de {metrics.totalCount} resolvidas
                    </span>
                    <span className="tabular-nums">
                      {metrics.progressPercent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-labelledby="resolved-progress-label"
                    aria-valuenow={metrics.resolvedCount}
                    aria-valuemin={0}
                    aria-valuemax={metrics.totalCount}
                    className="h-[4px] w-full rounded-full bg-[#D5D3CC] overflow-hidden"
                  >
                    <div
                      className="h-full rounded-full bg-[#181B19] transition-all duration-300"
                      style={{ width: `${metrics.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Section COBRANÇAS PARA REVISAR */}
              <div className="mt-8">
                <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#4E5450]">
                  COBRANÇAS PARA REVISAR
                </p>

                <div className="mt-2 divide-y divide-[#E4E2DC] border-t border-b border-[#E4E2DC]">
                  {charges.map((item) => {
                    const isResolved = item.status === "resolved";
                    const isExpanded = expandedChargeId === item.id;
                    const isCopied = copiedChargeId === item.id;
                    const initial = item.merchant.charAt(0).toUpperCase();

                    return (
                      <div key={item.id} className="py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div
                              aria-hidden="true"
                              style={{ backgroundColor: item.color }}
                              className={`w-[44px] h-[44px] rounded-full text-white font-bold text-[15px] flex items-center justify-center shrink-0 transition-opacity ${
                                isResolved ? "opacity-50" : ""
                              }`}
                            >
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-[16px] font-semibold leading-snug ${
                                  isResolved
                                    ? "line-through text-[#4E5450]"
                                    : "text-[#181C1A]"
                                }`}
                              >
                                {item.merchant}
                              </p>
                              <p
                                className={`text-[13.5px] text-[#4E5450] mt-0.5 ${
                                  isResolved ? "line-through" : ""
                                }`}
                              >
                                {item.reason}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`text-[16px] font-semibold leading-snug tabular-nums ${
                                isResolved
                                  ? "line-through text-[#4E5450]"
                                  : "text-[#181C1A]"
                              }`}
                            >
                              R$ {formatBRL(item.amount)}
                            </p>
                            <p className="text-[13px] text-[#4E5450] mt-0.5">
                              /mês
                            </p>
                          </div>
                        </div>

                        {/* Action Bar: Como cancelar */}
                        <div className="mt-2.5 pl-[58px] flex items-center justify-between">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={`cancel-guide-${item.id}`}
                            aria-label={`Como cancelar ${item.merchant}`}
                            onClick={() => handleToggleAccordion(item.id)}
                            className="min-h-[44px] px-2 -ml-2 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#2E5945] hover:text-[#181B19] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] transition-colors cursor-pointer"
                          >
                            <span>Como cancelar</span>
                            <ChevronDownIcon
                              className={`w-4 h-4 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {isResolved && (
                            <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full bg-[#E2ECE7] text-[#1E4635]">
                              Resolvida ✓
                            </span>
                          )}
                        </div>

                        {/* Accordion Content (only one open at a time) */}
                        {isExpanded && (
                          <div
                            id={`cancel-guide-${item.id}`}
                            className="mt-2 ml-[58px] rounded-[18px] bg-[#F0EFEA] p-4 border border-[#E2E0D8]"
                          >
                            <p className="text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#4A504C]">
                              Passo a passo
                            </p>
                            <ol className="mt-2 space-y-2 text-[13.5px] text-[#181C1A] list-decimal list-inside leading-relaxed">
                              {item.cancelGuide.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>

                            <div className="mt-4 rounded-[14px] bg-white p-3.5 border border-[#E2E0D8]">
                              <p className="text-[12px] font-semibold text-[#4A504C] mb-1">
                                Mensagem pronta para suporte:
                              </p>
                              <p className="text-[13px] text-[#181C1A] leading-relaxed">
                                &ldquo;{item.cancelGuide.script}&rdquo;
                              </p>
                            </div>

                            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                aria-label={`Copiar script de cancelamento de ${item.merchant}`}
                                onClick={() =>
                                  void handleCopyScript(
                                    item.id,
                                    item.cancelGuide.script
                                  )
                                }
                                className="min-h-[44px] px-3.5 py-2 rounded-[12px] bg-white border border-[#D5D3CC] hover:border-[#181B19] text-[13px] font-semibold text-[#181C1A] inline-flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] cursor-pointer"
                              >
                                <CopyIcon className="w-4 h-4" />
                                <span>
                                  {isCopied ? "Copiado ✓" : "Copiar script"}
                                </span>
                              </button>

                              <button
                                type="button"
                                aria-label={
                                  isResolved
                                    ? `Desmarcar ${item.merchant} como resolvida`
                                    : `Marcar ${item.merchant} como já resolvida`
                                }
                                onClick={() => handleMarkResolved(item.id)}
                                className="min-h-[44px] px-4 py-2 rounded-[12px] bg-[#181B19] hover:bg-[#272B28] text-white text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] cursor-pointer"
                              >
                                <CheckIcon className="w-4 h-4" />
                                <span>
                                  {isResolved
                                    ? "Reativar cobrança"
                                    : "Já resolvi"}
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dark Upsell Card: Não deixe voltar. */}
              <div className="mt-8 rounded-[26px] bg-[#181B19] text-white p-6 shadow-[0_12px_30px_rgba(24,27,25,0.16)]">
                <h2 className="text-[21px] font-semibold tracking-[-0.02em] text-white">
                  Não deixe voltar.
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-[#D5D8D6]">
                  Todo mês analisamos sua fatura e avisamos no WhatsApp quando
                  surgir uma cobrança nova ou um reajuste.
                </p>

                <button
                  type="button"
                  aria-label="Ativar monitoramento por R$ 14,90 por mês"
                  onClick={handleActivateMonitoring}
                  className="mt-5 w-full min-h-[50px] rounded-[16px] bg-white hover:bg-[#F0EFEA] text-[#181B19] font-semibold text-[15px] py-3.5 px-5 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
                >
                  Ativar monitoramento · R$ 14,90/mês
                </button>

                {monitoringFeedback && (
                  <p
                    role="status"
                    className="mt-3 text-[13px] text-[#A8D5BA] text-center font-medium"
                  >
                    Fluxo de assinatura em preparação (TODO: checkout).
                  </p>
                )}
              </div>

              {/* Discreet link at the end */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  aria-label="Enviar outra fatura"
                  onClick={handleSendAnotherInvoice}
                  className="min-h-[44px] px-4 py-2 text-[14px] font-medium text-[#4A504C] hover:text-[#161A18] underline underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#181B19] cursor-pointer"
                >
                  Enviar outra fatura
                </button>
              </div>
            </section>
          )}
        </main>

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
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                          isSelectedTag
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
                      <span className="font-semibold text-[#245942]">
                        Autenticado / Sem duplicidade no mês
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
