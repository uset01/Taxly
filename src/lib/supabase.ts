import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AnalysisSummaryData } from "@/lib/detect-charges";

export type PlanStatus = "free" | "active" | "paused" | "canceled";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  plan_status: PlanStatus;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
}

export interface DetectedChargeRecord {
  id: string;
  audit_id: string;
  user_id: string;
  category: string;
  merchant_name: string;
  charge_date: string;
  monthly_amount: number;
  annual_amount: number;
  resolved: boolean;
  created_at: string;
}

export interface AuditRecord {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string | null;
  bank_name: string;
  reference_month: string;
  invoice_total: number;
  monthly_savings: number;
  annual_savings: number;
  total_transactions: number;
  pix_total: number;
  boletos_total: number;
  debitos_total: number;
  is_clean: boolean;
  created_at: string;
}

export interface AuditWithCharges extends AuditRecord {
  detected_charges: DetectedChargeRecord[];
}

const LOCAL_AUDITS_KEY = "taxly:audits_history_v1";
const LOCAL_PROFILE_KEY = "taxly:user_profile_v1";

let browserSupabase: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.startsWith("http") && anonKey && anonKey.length > 10);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserSupabase) {
    browserSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
  }
  return browserSupabase;
}

function getCurrentMonthLabelPtBr(): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const now = new Date();
  return `${months[now.getMonth()] || "Novembro"} ${now.getFullYear()}`;
}

function readLocalAudits(): AuditWithCharges[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_AUDITS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAudits(audits: AuditWithCharges[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_AUDITS_KEY, JSON.stringify(audits));
  } catch {
    // Ignora erro de storage
  }
}

export function readLocalProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function writeLocalProfile(profile: UserProfile | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!profile) {
      window.localStorage.removeItem(LOCAL_PROFILE_KEY);
    } else {
      window.localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    }
  } catch {
    // Ignora erro de storage
  }
}

export async function fetchUserProfile(
  userId: string,
  fallbackEmail = "",
  fallbackName = ""
): Promise<UserProfile> {
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const profile: UserProfile = {
          id: data.id,
          email: data.email || fallbackEmail,
          full_name:
            data.full_name ||
            fallbackName ||
            (fallbackEmail ? fallbackEmail.split("@")[0] : "Usuário Taxly"),
          plan_status: (data.plan_status as PlanStatus) || "free",
          stripe_customer_id: data.stripe_customer_id,
          stripe_subscription_id: data.stripe_subscription_id,
        };
        writeLocalProfile(profile);
        return profile;
      }
    } catch {
      // Fallback para perfil local
    }
  }

  const existingLocal = readLocalProfile();
  if (existingLocal && existingLocal.id === userId) {
    return existingLocal;
  }

  const defaultProfile: UserProfile = {
    id: userId,
    email: fallbackEmail,
    full_name:
      fallbackName ||
      (fallbackEmail ? fallbackEmail.split("@")[0] : "Usuário Taxly"),
    plan_status: "free",
  };
  writeLocalProfile(defaultProfile);
  return defaultProfile;
}

/**
 * 1. Faz upload do arquivo enviado para o bucket privado `bill-screenshots` em `${user.id}/${timestamp}-${filename}`
 * 2. Grava a auditoria na tabela `audits`
 * 3. Grava cada cobrança suspeita na tabela `detected_charges` vinculada ao `user_id` e `audit_id`
 */
export async function uploadBillAndSaveAudit(params: {
  userId: string;
  file?: File | null;
  analysis: AnalysisSummaryData;
}): Promise<AuditWithCharges> {
  const { userId, file, analysis } = params;
  const supabase = getSupabaseBrowserClient();
  const timestamp = Date.now();
  const rawFileName = file?.name || analysis.fileName || "fatura.pdf";
  const safeFileName = rawFileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${timestamp}-${safeFileName}`;

  const pixTotal = analysis.resumoCategorias?.pix ?? analysis.categories?.pix ?? 0;
  const boletosTotal =
    analysis.resumoCategorias?.boletos ?? analysis.categories?.boletos ?? 0;
  const debitosTotal =
    analysis.resumoCategorias?.debitos ?? analysis.categories?.debitos ?? 0;
  const invoiceTotal = Number(
    (pixTotal + boletosTotal + debitosTotal).toFixed(2)
  );

  const rawCharges =
    analysis.itensOportunidade && analysis.itensOportunidade.length > 0
      ? analysis.itensOportunidade.map((op) => ({
          category: op.categoria || "Renovação recorrente",
          merchant_name: op.nomeEstabelecimento,
          charge_date: op.data || "Recente",
          monthly_amount: Number(op.valorMensal.toFixed(2)),
          annual_amount: Number((op.valorMensal * 12).toFixed(2)),
        }))
      : [
          ...analysis.tariffs.map((t) => ({
            category: "Tarifa bancária",
            merchant_name: t.name,
            charge_date: "Neste ciclo",
            monthly_amount: Number(t.amount.toFixed(2)),
            annual_amount: Number((t.amount * 12).toFixed(2)),
          })),
          ...analysis.duplicates.map((d) => ({
            category: "Cobrança duplicada",
            merchant_name: d.merchant,
            charge_date: d.date || "Neste ciclo",
            monthly_amount: Number(d.amount.toFixed(2)),
            annual_amount: Number((d.amount * 12).toFixed(2)),
          })),
        ];

  if (
    analysis.possivelDuplicidade?.encontrada &&
    analysis.possivelDuplicidade.nomeEstabelecimento &&
    analysis.possivelDuplicidade.valor > 0
  ) {
    const alreadyExists = rawCharges.some(
      (c) =>
        c.merchant_name.toLowerCase() ===
          analysis.possivelDuplicidade?.nomeEstabelecimento.toLowerCase() &&
        Math.abs(c.monthly_amount - (analysis.possivelDuplicidade?.valor ?? 0)) <
          0.01
    );
    if (!alreadyExists) {
      rawCharges.push({
        category: "Cobrança duplicada",
        merchant_name: analysis.possivelDuplicidade.nomeEstabelecimento,
        charge_date: analysis.possivelDuplicidade.data || "Neste ciclo",
        monthly_amount: Number(analysis.possivelDuplicidade.valor.toFixed(2)),
        annual_amount: Number(
          (analysis.possivelDuplicidade.valor * 12).toFixed(2)
        ),
      });
    }
  }

  const monthlySavings = Number(
    rawCharges.reduce((acc, c) => acc + c.monthly_amount, 0).toFixed(2)
  );
  const annualSavings = Number((monthlySavings * 12).toFixed(2));
  const bankName = analysis.detectedBank || "Fatura / Extrato Bancário";
  const referenceMonth = getCurrentMonthLabelPtBr();
  const totalTransactions =
    analysis.totalTransacoes && analysis.totalTransacoes > 0
      ? Math.max(analysis.totalTransacoes, rawCharges.length)
      : Math.max(1, rawCharges.length);

  if (supabase) {
    try {
      // 1. Upload para o bucket privado `bill-screenshots` em `${user.id}/${timestamp}-${filename}`
      if (file) {
        await supabase.storage
          .from("bill-screenshots")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "application/octet-stream",
          });
      }

      // 2. Insere registro na tabela `audits`
      const { data: insertedAudit, error: auditErr } = await supabase
        .from("audits")
        .insert({
          user_id: userId,
          file_name: rawFileName,
          storage_path: file ? storagePath : null,
          bank_name: bankName,
          reference_month: referenceMonth,
          invoice_total: invoiceTotal,
          monthly_savings: monthlySavings,
          annual_savings: annualSavings,
          total_transactions: totalTransactions,
          pix_total: pixTotal,
          boletos_total: boletosTotal,
          debitos_total: debitosTotal,
          is_clean: analysis.isClean,
        })
        .select("*")
        .single();

      if (!auditErr && insertedAudit) {
        let insertedCharges: DetectedChargeRecord[] = [];

        if (rawCharges.length > 0) {
          const chargesPayload = rawCharges.map((c) => ({
            audit_id: insertedAudit.id,
            user_id: userId,
            category: c.category,
            merchant_name: c.merchant_name,
            charge_date: c.charge_date,
            monthly_amount: c.monthly_amount,
            annual_amount: c.annual_amount,
            resolved: false,
          }));

          const { data: chargesRows } = await supabase
            .from("detected_charges")
            .insert(chargesPayload)
            .select("*");

          if (chargesRows) {
            insertedCharges = chargesRows as DetectedChargeRecord[];
          }
        }

        const fullRecord: AuditWithCharges = {
          ...(insertedAudit as AuditRecord),
          detected_charges: insertedCharges,
        };

        const currentLocal = readLocalAudits().filter(
          (a) => a.id !== fullRecord.id
        );
        writeLocalAudits([fullRecord, ...currentLocal]);
        return fullRecord;
      }
    } catch {
      // Continua para persistência local de fallback
    }
  }

  // Fallback local sincronizado (quando Supabase ainda não está configurado no .env.local)
  const localAuditId = `audit-${timestamp}`;
  const nowIso = new Date().toISOString();
  const localCharges: DetectedChargeRecord[] = rawCharges.map((c, idx) => ({
    id: `charge-${timestamp}-${idx + 1}`,
    audit_id: localAuditId,
    user_id: userId,
    category: c.category,
    merchant_name: c.merchant_name,
    charge_date: c.charge_date,
    monthly_amount: c.monthly_amount,
    annual_amount: c.annual_amount,
    resolved: false,
    created_at: nowIso,
  }));

  const localRecord: AuditWithCharges = {
    id: localAuditId,
    user_id: userId,
    file_name: rawFileName,
    storage_path: file ? storagePath : null,
    bank_name: bankName,
    reference_month: referenceMonth,
    invoice_total: invoiceTotal,
    monthly_savings: monthlySavings,
    annual_savings: annualSavings,
    total_transactions: totalTransactions,
    pix_total: pixTotal,
    boletos_total: boletosTotal,
    debitos_total: debitosTotal,
    is_clean: analysis.isClean,
    created_at: nowIso,
    detected_charges: localCharges,
  };

  const existing = readLocalAudits().filter(
    (a) => a.file_name !== localRecord.file_name
  );
  writeLocalAudits([localRecord, ...existing]);
  return localRecord;
}

export async function fetchUserAuditsHistory(
  userId?: string
): Promise<AuditWithCharges[]> {
  const supabase = getSupabaseBrowserClient();
  if (supabase && userId) {
    try {
      const { data: auditsData, error } = await supabase
        .from("audits")
        .select("*, detected_charges(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(auditsData)) {
        const normalized: AuditWithCharges[] = auditsData.map((row) => ({
          id: row.id,
          user_id: row.user_id,
          file_name: row.file_name,
          storage_path: row.storage_path,
          bank_name: row.bank_name,
          reference_month: row.reference_month,
          invoice_total: Number(row.invoice_total || 0),
          monthly_savings: Number(row.monthly_savings || 0),
          annual_savings: Number(row.annual_savings || 0),
          total_transactions: Number(row.total_transactions || 0),
          pix_total: Number(row.pix_total || 0),
          boletos_total: Number(row.boletos_total || 0),
          debitos_total: Number(row.debitos_total || 0),
          is_clean: Boolean(row.is_clean),
          created_at: row.created_at,
          detected_charges: Array.isArray(row.detected_charges)
            ? row.detected_charges.map((c: Record<string, unknown>) => ({
                id: String(c.id),
                audit_id: String(c.audit_id),
                user_id: String(c.user_id),
                category: String(c.category || "Renovação recorrente"),
                merchant_name: String(c.merchant_name || ""),
                charge_date: String(c.charge_date || "Recente"),
                monthly_amount: Number(c.monthly_amount || 0),
                annual_amount: Number(c.annual_amount || 0),
                resolved: Boolean(c.resolved),
                created_at: String(c.created_at || new Date().toISOString()),
              }))
            : [],
        }));
        writeLocalAudits(normalized);
        return normalized;
      }
    } catch {
      // Fallback para cache local
    }
  }

  return readLocalAudits();
}

export async function updateDetectedChargeResolved(params: {
  chargeId: string;
  resolved: boolean;
}): Promise<void> {
  const { chargeId, resolved } = params;
  const supabase = getSupabaseBrowserClient();

  if (supabase && !chargeId.startsWith("charge-") && !chargeId.startsWith("op-")) {
    try {
      await supabase
        .from("detected_charges")
        .update({ resolved })
        .eq("id", chargeId);
    } catch {
      // Continua atualizando localmente
    }
  }

  const localAudits = readLocalAudits();
  const updated = localAudits.map((audit) => ({
    ...audit,
    detected_charges: audit.detected_charges.map((ch) =>
      ch.id === chargeId ? { ...ch, resolved } : ch
    ),
  }));
  writeLocalAudits(updated);
}

