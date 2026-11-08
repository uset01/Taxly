export interface ChargeItem {
  id: string;
  name: string;
  factSubtitle: string;
  amount: number;
  initial: string;
  bgColor: string;
  needsReview: boolean;
  reviewed: boolean;
}

export const INITIAL_CHARGES: ChargeItem[] = [
  {
    id: "netflix",
    name: "Netflix",
    factSubtitle: "Cobrada todo dia 12",
    amount: 39.9,
    initial: "N",
    bgColor: "bg-[#D93F32]",
    needsReview: true,
    reviewed: false,
  },
  {
    id: "spotify",
    name: "Spotify",
    factSubtitle: "Aumentou R$ 5 neste mês",
    amount: 21.9,
    initial: "S",
    bgColor: "bg-[#158A3E]",
    needsReview: true,
    reviewed: false,
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime",
    factSubtitle: "Cobrança duplicada",
    amount: 19.9,
    initial: "P",
    bgColor: "bg-[#225EA8]",
    needsReview: true,
    reviewed: false,
  },
  {
    id: "adobe-cc",
    name: "Adobe Creative Cloud",
    factSubtitle: "Renovação automática todo dia 05",
    amount: 139.0,
    initial: "A",
    bgColor: "bg-[#B8292F]",
    needsReview: true,
    reviewed: true,
  },
  {
    id: "wellhub",
    name: "Wellhub (Gympass)",
    factSubtitle: "Cobrada todo dia 18",
    amount: 89.9,
    initial: "W",
    bgColor: "bg-[#C24732]",
    needsReview: true,
    reviewed: true,
  },
  {
    id: "icloud-plus",
    name: "iCloud+ 200GB",
    factSubtitle: "Aumentou R$ 7,40 neste mês",
    amount: 37.3,
    initial: "i",
    bgColor: "bg-[#2563EB]",
    needsReview: true,
    reviewed: false,
  },
];

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface ChargesSummary {
  reviewableCharges: ChargeItem[];
  totalPossibleSavings: number;
  totalReviewableCount: number;
  reviewedCount: number;
  pendingReviewCount: number;
  progressPercent: number;
}

export function calculateChargesSummary(charges: ChargeItem[]): ChargesSummary {
  const reviewableCharges = charges.filter((item) => item.needsReview);
  const totalPossibleSavings = Number(
    reviewableCharges.reduce((acc, item) => acc + item.amount, 0).toFixed(2)
  );
  const totalReviewableCount = reviewableCharges.length;
  const reviewedCount = reviewableCharges.filter((item) => item.reviewed).length;
  const pendingReviewCount = totalReviewableCount - reviewedCount;
  const progressPercent =
    totalReviewableCount > 0
      ? Math.round((reviewedCount / totalReviewableCount) * 100)
      : 0;

  return {
    reviewableCharges,
    totalPossibleSavings,
    totalReviewableCount,
    reviewedCount,
    pendingReviewCount,
    progressPercent,
  };
}
