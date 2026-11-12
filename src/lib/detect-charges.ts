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

export interface AnalysisSummaryData {
  documentType: "fatura" | "extrato";
  fileName: string;
  tariffs: DetectedTariff[];
  duplicates: DetectedDuplicate[];
  categories: CategorySummary;
  totalAttention: number; // soma de tarifas + duplicidades
  isClean: boolean;
  economyItems?: EconomyItem[];
  totalRecurringSavings?: number;
  isSingleTransaction?: boolean;
  singleTransactionAmount?: number;
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
 * Lista de economia padrão realista somando exatamente R$ 184,70/mês
 */
export const DEFAULT_SAMPLE_ECONOMY_ITEMS: EconomyItem[] = [
  {
    id: "eco-1",
    name: "Streaming de Vídeo & Assinaturas",
    monthlyAmount: 55.9,
    yearlyImpact: 670.8,
    actionTip: "Cancelar assinatura no app",
    category: "Assinaturas",
  },
  {
    id: "eco-2",
    name: "Tarifa Pacote de Serviços Bancários",
    monthlyAmount: 42.9,
    yearlyImpact: 514.8,
    actionTip: "Pedir estorno de tarifa ao banco",
    category: "Tarifas",
  },
  {
    id: "eco-3",
    name: "Clube de Benefícios / Seguro Fatura",
    monthlyAmount: 39.9,
    yearlyImpact: 478.8,
    actionTip: "Cancelar cobrança opcional no app",
    category: "Seguros",
  },
  {
    id: "eco-4",
    name: "Apps de Delivery & Transporte Recorrentes",
    monthlyAmount: 46.0,
    yearlyImpact: 552.0,
    actionTip: "Cancelar assinatura no app",
    category: "Serviços",
  },
];

/**
 * Conjunto padrão realista somando exatamente R$ 42,30 (18,90 + 8,50 + 14,90).
 */
export const DEFAULT_SAMPLE_ANALYSIS: AnalysisSummaryData = {
  documentType: "fatura",
  fileName: "Fatura_Cartao_Outubro.pdf",
  tariffs: [
    {
      id: "tarifa-1",
      name: "Tarifa de manutenção",
      amount: 18.9,
    },
    {
      id: "tarifa-2",
      name: "Juros rotativo",
      amount: 8.5,
    },
  ],
  duplicates: [
    {
      id: "dup-uber",
      merchant: "Uber do Brasil",
      date: "12 Out 2026",
      amount: 14.9,
      occurrences: 2,
    },
  ],
  categories: {
    pix: 1240.0,
    boletos: 890.5,
    debitos: 2140.8,
  },
  totalAttention: 42.3,
  isClean: false,
  economyItems: DEFAULT_SAMPLE_ECONOMY_ITEMS,
  totalRecurringSavings: 184.7,
  isSingleTransaction: false,
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

