import { CANCEL_GUIDES } from "./cancel-guides";

export interface Charge {
  id: string;
  merchant: string;
  color: string;
  reason: string;
  amount: number;
  status: "active" | "resolved";
  cancelGuide: {
    steps: string[];
    script: string;
  };
}

export interface AnalysisResult {
  charges: Charge[];
}

/**
 * Mock tipado com 6 cobranças somando exatamente R$ 347,90 para desenvolvimento:
 * 39,90 + 21,90 + 19,90 + 139,00 + 89,90 + 37,30 = 347,90
 */
export const MOCK_CHARGES: Charge[] = [
  {
    id: "netflix",
    merchant: "Netflix",
    color: "#D93F32",
    reason: "Cobrada todo dia 12",
    amount: 39.9,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["netflix"].steps,
      script: CANCEL_GUIDES["netflix"].script,
    },
  },
  {
    id: "spotify",
    merchant: "Spotify",
    color: "#158A3E",
    reason: "Aumentou R$ 5 neste mês",
    amount: 21.9,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["spotify"].steps,
      script: CANCEL_GUIDES["spotify"].script,
    },
  },
  {
    id: "amazon-prime",
    merchant: "Amazon Prime",
    color: "#225EA8",
    reason: "Cobrança duplicada",
    amount: 19.9,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["amazon-prime"].steps,
      script: CANCEL_GUIDES["amazon-prime"].script,
    },
  },
  {
    id: "adobe-cc",
    merchant: "Adobe Creative Cloud",
    color: "#B8292F",
    reason: "Teste gratuito virou pago",
    amount: 139.0,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["adobe-cc"].steps,
      script: CANCEL_GUIDES["adobe-cc"].script,
    },
  },
  {
    id: "wellhub",
    merchant: "Wellhub (Gympass)",
    color: "#C24732",
    reason: "Cobrada todo dia 18",
    amount: 89.9,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["wellhub"].steps,
      script: CANCEL_GUIDES["wellhub"].script,
    },
  },
  {
    id: "icloud-plus",
    merchant: "iCloud+ 200GB",
    color: "#2563EB",
    reason: "Aumentou R$ 7,40 neste mês",
    amount: 37.3,
    status: "active",
    cancelGuide: {
      steps: CANCEL_GUIDES["icloud-plus"].steps,
      script: CANCEL_GUIDES["icloud-plus"].script,
    },
  },
];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface ChargesMetrics {
  activeCharges: Charge[];
  resolvedCharges: Charge[];
  activeTotal: number;
  annualActiveTotal: number;
  resolvedTotal: number;
  totalCount: number;
  activeCount: number;
  resolvedCount: number;
  progressPercent: number;
}

export function calculateChargesMetrics(charges: Charge[]): ChargesMetrics {
  const activeCharges = charges.filter((item) => item.status === "active");
  const resolvedCharges = charges.filter((item) => item.status === "resolved");

  const activeTotal = Number(
    activeCharges.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );
  const annualActiveTotal = Number((activeTotal * 12).toFixed(2));
  const resolvedTotal = Number(
    resolvedCharges.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );

  const totalCount = charges.length;
  const activeCount = activeCharges.length;
  const resolvedCount = resolvedCharges.length;
  const progressPercent =
    totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  return {
    activeCharges,
    resolvedCharges,
    activeTotal,
    annualActiveTotal,
    resolvedTotal,
    totalCount,
    activeCount,
    resolvedCount,
    progressPercent,
  };
}
