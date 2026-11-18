export interface DetectedTariff {
  id: string;
  name: string;
  amount: number;
}

export interface DetectedDuplicate {
  id: string;
  merchant: string;
  date: string;
  amount: number;
  occurrences: number;
}

export interface CategorySummary {
  pix: number;
  boletos: number;
  debitos: number;
}

export interface EconomyItem {
  id: string;
  name: string;
  monthlyAmount: number;
  yearlyImpact: number;
  actionTip: string; // "Cancelar assinatura no app" | "Pedir estorno de tarifa ao banco"
  category?: string;
}

export interface OpenAiOpportunityItem {
  categoria: string;
  nomeEstabelecimento: string;
  valorMensal: number;
  data: string;
}

export interface OpenAiFreeTariffSample {
  nome: string;
  valor: number;
}

export interface OpenAiDuplicateFinding {
  encontrada: boolean;
  nomeEstabelecimento: string;
  data: string;
  valor: number;
}

export interface OpenAiAnalyzePayload {
  arquivoValido: boolean;
  motivoInvalido: string;
  totalTransacoes: number;
  resumoCategorias: CategorySummary;
  itensOportunidade: OpenAiOpportunityItem[];
  tarifaAmostraGratis: OpenAiFreeTariffSample;
  possivelDuplicidade: OpenAiDuplicateFinding;
}

export interface AnalysisSummaryData {
  documentType: "fatura" | "extrato";
  fileName: string;
  detectedBank?: string;
  tariffs: DetectedTariff[];
  duplicates: DetectedDuplicate[];
  categories: CategorySummary;
  totalAttention: number; // soma de tarifas + duplicidades + itensOportunidade
  isClean: boolean;
  economyItems?: EconomyItem[];
  totalRecurringSavings?: number;
  isSingleTransaction?: boolean;
  singleTransactionAmount?: number;
  // Campos reais vindos diretamente da OpenAI (gpt-4.1-mini)
  arquivoValido?: boolean;
  motivoInvalido?: string;
  totalTransacoes?: number;
  resumoCategorias?: CategorySummary;
  itensOportunidade?: OpenAiOpportunityItem[];
  tarifaAmostraGratis?: OpenAiFreeTariffSample;
  possivelDuplicidade?: OpenAiDuplicateFinding;
}

export interface DocumentTransaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  category?: "pix" | "boleto" | "debito";
}

export const TARIFF_KEYWORDS = [
  "tarifa",
  "juros",
  "iof",
  "anuidade",
  "manutenção",
  "manutencao",
  "pacote de serviços",
  "pacote de servicos",
];

/**
 * Detecta tarifas com base nas palavras-chave oficiais.
 */
export function isTariffDescription(description: string): boolean {
  const normalized = description.toLowerCase();
  return TARIFF_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * Detecta duplicidades: mesmo valor + mesma data.
 */
export function findDuplicates(
  transactions: DocumentTransaction[]
): DetectedDuplicate[] {
  const groups = new Map<string, DocumentTransaction[]>();

  for (const tx of transactions) {
    if (isTariffDescription(tx.description)) continue;
    // chave: valor_data
    const key = `${tx.amount.toFixed(2)}_${tx.date.trim()}`;
    const existing = groups.get(key) ?? [];
    existing.push(tx);
    groups.set(key, existing);
  }

  const duplicates: DetectedDuplicate[] = [];
  for (const [, items] of groups.entries()) {
    if (items.length >= 2) {
      const first = items[0];
      duplicates.push({
        id: `dup-${first.id}`,
        merchant: first.description,
        date: first.date,
        amount: first.amount,
        occurrences: items.length,
      });
    }
  }

  return duplicates;
}

/**
 * Estado inicial limpo (sem dados fictícios de demonstração)
 */
export const DEFAULT_SAMPLE_ECONOMY_ITEMS: EconomyItem[] = [];

export const DEFAULT_SAMPLE_ANALYSIS: AnalysisSummaryData = {
  documentType: "fatura",
  fileName: "",
  tariffs: [],
  duplicates: [],
  categories: {
    pix: 0,
    boletos: 0,
    debitos: 0,
  },
  totalAttention: 0,
  isClean: true,
  economyItems: [],
  totalRecurringSavings: 0,
  isSingleTransaction: false,
  totalTransacoes: 0,
  resumoCategorias: {
    pix: 0,
    boletos: 0,
    debitos: 0,
  },
  itensOportunidade: [],
};

/**
 * Decide se o conteúdo é fatura ou extrato e processa as regras de tarifas e duplicidades.
 */
export function analyzeDocumentContent(
  fileName: string,
  transactions?: DocumentTransaction[]
): AnalysisSummaryData {
  const lowerName = fileName.toLowerCase();
  const isExtrato =
    lowerName.includes("extrato") ||
    lowerName.includes("banco") ||
    lowerName.includes("conta");
  const isCleanDemo =
    lowerName.includes("limpo") ||
    lowerName.includes("clean") ||
    lowerName.includes("zerado");

  if (isCleanDemo) {
    return {
      documentType: isExtrato ? "extrato" : "fatura",
      fileName,
      tariffs: [],
      duplicates: [],
      categories: {
        pix: 1240.0,
        boletos: 890.5,
        debitos: 2140.8,
      },
      totalAttention: 0,
      isClean: true,
    };
  }

  if (transactions && transactions.length > 0) {
    const tariffs: DetectedTariff[] = transactions
      .filter((tx) => isTariffDescription(tx.description))
      .map((tx) => ({
        id: `tarifa-${tx.id}`,
        name: tx.description,
        amount: tx.amount,
      }));

    const duplicates = findDuplicates(transactions);
    const tariffsSum = tariffs.reduce((acc, t) => acc + t.amount, 0);
    const dupesSum = duplicates.reduce((acc, d) => acc + d.amount, 0);
    const total = Number((tariffsSum + dupesSum).toFixed(2));

    let pixSum = 0;
    let boletosSum = 0;
    let debitosSum = 0;

    for (const tx of transactions) {
      if (tx.category === "pix") pixSum += tx.amount;
      else if (tx.category === "boleto") boletosSum += tx.amount;
      else debitosSum += tx.amount;
    }

    const isSingle = transactions.length === 1;
    const singleAmount = isSingle ? transactions[0].amount : 0;

    const economyItems: EconomyItem[] = [];
    tariffs.forEach((t, i) => {
      economyItems.push({
        id: `eco-tariff-${i + 1}`,
        name: t.name,
        monthlyAmount: t.amount,
        yearlyImpact: Number((t.amount * 12).toFixed(2)),
        actionTip: "Pedir estorno de tarifa ao banco",
        category: "Tarifas",
      });
    });
    duplicates.forEach((d, i) => {
      economyItems.push({
        id: `eco-dup-${i + 1}`,
        name: `Cobrança duplicada: ${d.merchant}`,
        monthlyAmount: d.amount,
        yearlyImpact: Number((d.amount * 12).toFixed(2)),
        actionTip: "Pedir estorno de tarifa ao banco",
        category: "Duplicidades",
      });
    });

    if (isSingle) {
      economyItems.push({
        id: "eco-single-1",
        name: transactions[0].description || "Transação enviada",
        monthlyAmount: transactions[0].amount,
        yearlyImpact: Number((transactions[0].amount * 12).toFixed(2)),
        actionTip: "Analisar fatura mensal para mais gastos",
        category: "Transação",
      });
    }

    const calculatedSavings = economyItems.reduce((acc, item) => acc + item.monthlyAmount, 0);
    const totalRecurringSavings = isSingle
      ? singleAmount
      : calculatedSavings > 0
        ? Number(calculatedSavings.toFixed(2))
        : DEFAULT_SAMPLE_ANALYSIS.totalRecurringSavings;

    return {
      documentType: isExtrato ? "extrato" : "fatura",
      fileName,
      tariffs,
      duplicates,
      categories: {
        pix: pixSum,
        boletos: boletosSum,
        debitos: debitosSum,
      },
      totalAttention: total,
      isClean: tariffs.length === 0 && duplicates.length === 0,
      economyItems,
      totalRecurringSavings,
      isSingleTransaction: isSingle,
      singleTransactionAmount: singleAmount,
    };
  }

  // Se for explicitamente o exemplo/demonstração inicial
  const isDemo = lowerName.includes("exemplo") || lowerName.includes("demo");
  if (isDemo) {
    return {
      ...DEFAULT_SAMPLE_ANALYSIS,
      documentType: isExtrato ? "extrato" : "fatura",
      fileName,
    };
  }

  // Para qualquer arquivo real em que nada suspeito for detectado:
  return {
    documentType: isExtrato ? "extrato" : "fatura",
    fileName,
    tariffs: [],
    duplicates: [],
    categories: {
      pix: 0,
      boletos: 0,
      debitos: 0,
    },
    totalAttention: 0,
    isClean: true,
    economyItems: [],
    totalRecurringSavings: 0,
    isSingleTransaction: false,
    singleTransactionAmount: 0,
  };
}

