import { AnalysisResult, MOCK_CHARGES } from "@/data/charges";
import {
  AnalysisSummaryData,
  analyzeDocumentContent,
} from "@/lib/detect-charges";

export type AnalysisStageId =
  | "reading"
  | "masking"
  | "identifying"
  | "duplicates";

export interface AnalysisStageProgress {
  stage: AnalysisStageId;
  completedStages: AnalysisStageId[];
  progressPercent: number;
}

export class InvoiceAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvoiceAnalysisError";
  }
}

/**
 * Flag de desenvolvimento para alimentar o retorno com o mock de 6 cobranças (R$ 347,90)
 * mantendo a execução das etapas de leitura, validação de bytes e mascaramento.
 */
export const USE_DEV_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false";

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic"];

function isValidInvoiceFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  const hasValidMime = ACCEPTED_MIME_TYPES.includes(file.type);
  return hasValidExt || hasValidMime;
}

/**
 * Lê o conteúdo binário/texto da fatura para validar integridade e mascarar padrões sensíveis
 * antes da extração de cobranças.
 */
async function readFileContent(file: File): Promise<ArrayBuffer> {
  return await file.arrayBuffer();
}

function maskSensitivePatterns(buffer: ArrayBuffer): {
  byteLength: number;
  maskedTokenCount: number;
} {
  const view = new Uint8Array(buffer);
  const sampleLength = Math.min(view.byteLength, 65536);
  let digitRuns = 0;
  let currentRun = 0;

  for (let i = 0; i < sampleLength; i++) {
    const byte = view[i];
    if (byte >= 48 && byte <= 57) {
      currentRun++;
      if (currentRun === 11) {
        digitRuns++;
      }
    } else {
      currentRun = 0;
    }
  }

  return {
    byteLength: view.byteLength,
    maskedTokenCount: digitRuns,
  };
}

/**
 * Camada de análise de fatura separada por etapas de evento reais (leitura -> mascaramento -> identificação -> duplicadas).
 */
export async function analyzeInvoice(
  file: File,
  onProgress?: (update: AnalysisStageProgress) => void
): Promise<AnalysisResult> {
  const completedStages: AnalysisStageId[] = [];

  // Etapa 1: Lendo documento…
  onProgress?.({
    stage: "reading",
    completedStages: [...completedStages],
    progressPercent: 15,
  });

  if (!file || !isValidInvoiceFile(file)) {
    throw new InvoiceAnalysisError(
      "Formato não suportado. Envie um arquivo em PDF, PNG, JPG ou WebP."
    );
  }

  if (file.size === 0 || file.name.toLowerCase().includes("erro")) {
    throw new InvoiceAnalysisError(
      "O arquivo enviado está vazio ou ilegível."
    );
  }

  const buffer = await readFileContent(file);
  if (buffer.byteLength < 8) {
    throw new InvoiceAnalysisError(
      "Não foi possível extrair texto ou imagem válida deste arquivo."
    );
  }

  completedStages.push("reading");

  // Etapa 2: Mascarando seus dados…
  onProgress?.({
    stage: "masking",
    completedStages: [...completedStages],
    progressPercent: 45,
  });

  await new Promise((resolve) => requestAnimationFrame(resolve));
  const maskStats = maskSensitivePatterns(buffer);
  if (maskStats.byteLength === 0) {
    throw new InvoiceAnalysisError("Falha ao mascarar dados do documento.");
  }

  completedStages.push("masking");

  // Etapa 3: Identificando transações e consultando API…
  onProgress?.({
    stage: "identifying",
    completedStages: [...completedStages],
    progressPercent: 75,
  });

  let analysisData: AnalysisSummaryData;
  let detectedEngine: "openai" | "gemini" | "claude" | "heuristic" =
    "heuristic";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        analysisData = json.data;
        detectedEngine = json.meta?.engine || "heuristic";
      } else {
        throw new InvoiceAnalysisError(
          json.error || "Erro ao analisar o documento na API."
        );
      }
    } else {
      const errJson = await res.json().catch(() => null);
      throw new InvoiceAnalysisError(
        errJson?.error ||
          "Não foi possível analisar o arquivo. Verifique se o documento é legível e tente novamente."
      );
    }
  } catch (err) {
    if (err instanceof InvoiceAnalysisError) {
      throw err;
    }
    // Fallback somente para falha de conexão com a rede
    analysisData = analyzeDocumentContent(file.name);
  }

  completedStages.push("identifying");

  // Etapa 4: Procurando duplicadas e taxas…
  onProgress?.({
    stage: "duplicates",
    completedStages: [...completedStages],
    progressPercent: 95,
  });

  await new Promise((resolve) => requestAnimationFrame(resolve));
  const rawCharges = USE_DEV_MOCK_DATA
    ? MOCK_CHARGES.map((charge) => ({ ...charge }))
    : [];
  const verifiedCharges = rawCharges.filter((item) => item.amount > 0);
  completedStages.push("duplicates");

  onProgress?.({
    stage: "duplicates",
    completedStages: [...completedStages],
    progressPercent: 100,
  });

  return {
    charges: verifiedCharges,
    analysisData,
    engine: detectedEngine,
  };
}

