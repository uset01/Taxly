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

export interface AnalysisSummaryData {
  documentType: "fatura" | "extrato";
  fileName: string;
  tariffs: DetectedTariff[];
  duplicates: DetectedDuplicate[];
  categories: CategorySummary;
  totalAttention: number; // soma de tarifas + duplicidades
  isClean: boolean;
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

    return {
      documentType: isExtrato ? "extrato" : "fatura",
      fileName,
      tariffs,
      duplicates,
      categories: {
        pix: pixSum > 0 ? pixSum : 1240.0,
        boletos: boletosSum > 0 ? boletosSum : 890.5,
        debitos: debitosSum > 0 ? debitosSum : 2140.8,
      },
      totalAttention: total,
      isClean: tariffs.length === 0 && duplicates.length === 0,
    };
  }

  // Fallback com o exemplo especificado
  return {
    ...DEFAULT_SAMPLE_ANALYSIS,
    documentType: isExtrato ? "extrato" : "fatura",
    fileName,
  };
}

