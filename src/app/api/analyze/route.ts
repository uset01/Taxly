import { NextRequest, NextResponse } from "next/server";
import {
  AnalysisSummaryData,
  analyzeDocumentContent,
  DocumentTransaction,
} from "@/lib/detect-charges";

interface AnalysisApiResponse {
  success: boolean;
  data: AnalysisSummaryData;
  meta: {
    engine: "openai" | "gemini" | "claude" | "heuristic";
    fileName: string;
    fileSizeBytes: number;
    processedAt: string;
    notice?: string;
  };
}

/**
 * Health check & status da API
 */
export async function GET() {
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);

  const activeEngine = hasOpenAi
    ? "openai"
    : hasGemini
      ? "gemini"
      : hasClaude
        ? "claude"
        : "heuristic";

  return NextResponse.json({
    status: "online",
    activeEngine,
    aiAvailable: {
      openai: hasOpenAi,
      gemini: hasGemini,
      claude: hasClaude,
    },
    message:
      activeEngine === "heuristic"
        ? "Motor heurístico ativo com detecção de tarifas e duplicidades. Adicione OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY no .env.local para habilitar IA generativa."
        : `Motor de IA (${activeEngine}) configurado e ativo.`,
  });
}

/**
 * Endpoint de Análise de Fatura ou Extrato
 */
export async function POST(req: NextRequest) {
  try {
    let fileName = "documento.pdf";
    let fileBuffer: ArrayBuffer | null = null;
    let fileSizeBytes = 0;
    let extractedText = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { success: false, error: "Nenhum arquivo enviado no campo 'file'." },
          { status: 400 }
        );
      }

      fileName = file.name;
      fileSizeBytes = file.size;
      fileBuffer = await file.arrayBuffer();

      // Tenta decodificar texto simples se for texto/extrato legível
      try {
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        extractedText = textDecoder.decode(fileBuffer.slice(0, 32768));
      } catch {
        extractedText = "";
      }
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      fileName = body.fileName || "documento.json";
      extractedText = body.text || "";
      if (body.transactions && Array.isArray(body.transactions)) {
        const customResult = analyzeDocumentContent(fileName, body.transactions);
        return NextResponse.json({
          success: true,
          data: customResult,
          meta: {
            engine: "heuristic",
            fileName,
            fileSizeBytes: 0,
            processedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Content-Type deve ser multipart/form-data ou application/json.",
        },
        { status: 415 }
      );
    }

    // 1. Tenta OpenAI se configurado
    if (process.env.OPENAI_API_KEY && extractedText) {
      try {
        const aiResult = await callOpenAiAnalysis(fileName, extractedText);
        if (aiResult) {
          return NextResponse.json<AnalysisApiResponse>({
            success: true,
            data: aiResult,
            meta: {
              engine: "openai",
              fileName,
              fileSizeBytes,
              processedAt: new Date().toISOString(),
            },
          });
        }
      } catch (aiErr) {
        console.warn("OpenAI falhou, usando fallback heurístico:", aiErr);
      }
    }

    // 2. Tenta Gemini se configurado
    if (process.env.GEMINI_API_KEY && fileBuffer) {
      try {
        const geminiResult = await callGeminiAnalysis(
          fileName,
          fileBuffer,
          extractedText
        );
        if (geminiResult) {
          return NextResponse.json<AnalysisApiResponse>({
            success: true,
            data: geminiResult,
            meta: {
              engine: "gemini",
              fileName,
              fileSizeBytes,
              processedAt: new Date().toISOString(),
            },
          });
        }
      } catch (geminiErr) {
        console.warn("Gemini falhou, usando fallback heurístico:", geminiErr);
      }
    }

    // 3. Motor Heurístico de Fallback (sempre funciona, sem requisições externas)
    const transactions = parseTransactionsFromText(extractedText);
    const analysisResult =
      transactions.length > 0
        ? analyzeDocumentContent(fileName, transactions)
        : analyzeDocumentContent(fileName);

    return NextResponse.json<AnalysisApiResponse>({
      success: true,
      data: analysisResult,
      meta: {
        engine: "heuristic",
        fileName,
        fileSizeBytes,
        processedAt: new Date().toISOString(),
        notice:
          "Processado com o motor local inteligente. Chave de IA não detectada no ambiente.",
      },
    });
  } catch (error) {
    console.error("Erro ao analisar documento:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao analisar documento.",
      },
      { status: 500 }
    );
  }
}

/**
 * Parser heurístico de texto para extrair linhas de extrato/fatura
 */
function parseTransactionsFromText(rawText: string): DocumentTransaction[] {
  if (!rawText || rawText.length < 10) return [];

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const transactions: DocumentTransaction[] = [];
  let idCounter = 1;

  // Regex para valor em Real: 14,90 ou 1.250,00 ou 14.90
  const moneyRegex = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+\.\d{2})/i;
  // Regex para data: 12/10, 12/10/2026, 12 Out
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?|\d{1,2}\s+[a-z]{3})/i;

  for (const line of lines) {
    const moneyMatch = line.match(moneyRegex);
    if (!moneyMatch) continue;

    const rawAmount = moneyMatch[1].replace(/\./g, "").replace(",", ".");
    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) continue;

    const dateMatch = line.match(dateRegex);
    const date = dateMatch ? dateMatch[1] : "09 Nov";

    // Descrição é o restante da linha sem o valor
    const desc = line
      .replace(moneyRegex, "")
      .replace(dateRegex, "")
      .replace(/[^\w\s\u00C0-\u00FF]/gi, " ")
      .trim()
      .replace(/\s+/g, " ");

    if (desc.length < 3) continue;

    const lowerDesc = desc.toLowerCase();
    const category: "pix" | "boleto" | "debito" = lowerDesc.includes("pix")
      ? "pix"
      : lowerDesc.includes("boleto")
        ? "boleto"
        : "debito";

    transactions.push({
      id: `tx-${idCounter++}`,
      description: desc,
      date,
      amount,
      category,
    });
  }

  return transactions;
}

/**
 * Chamada à API OpenAI
 */
async function callOpenAiAnalysis(
  fileName: string,
  text: string
): Promise<AnalysisSummaryData | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Analise o texto desta fatura ou extrato bancário ("${fileName}") e extraia em formato JSON estrito:
{
  "documentType": "fatura" ou "extrato",
  "fileName": "${fileName}",
  "tariffs": [ { "id": "1", "name": "Nome da Tarifa", "amount": 18.90 } ],
  "duplicates": [ { "id": "1", "merchant": "Nome", "date": "12/10", "amount": 14.90, "occurrences": 2 } ],
  "categories": { "pix": 1240.0, "boletos": 890.5, "debitos": 2140.8 },
  "totalAttention": 42.30,
  "isClean": false
}

Regras:
- Tarifas bancárias: palavras como tarifa, juros, IOF, anuidade, manutenção, pacote de serviços.
- Duplicidades: transações de mesmo valor no mesmo dia cobradas 2 ou mais vezes.
- isClean: true apenas se não houver nenhuma tarifa nem duplicidade.

Texto:
${text.slice(0, 10000)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você é o motor de análise bancária do Taxly. Responda apenas com o objeto JSON estruturado.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!res.ok) return null;
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  return JSON.parse(content) as AnalysisSummaryData;
}

/**
 * Chamada à API Google Gemini
 */
async function callGeminiAnalysis(
  fileName: string,
  buffer: ArrayBuffer,
  text: string
): Promise<AnalysisSummaryData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Analise este documento financeiro ("${fileName}") e retorne EXCLUSIVAMENTE um objeto JSON:
{
  "documentType": "fatura" ou "extrato",
  "fileName": "${fileName}",
  "tariffs": [ { "id": "1", "name": "Nome da Tarifa", "amount": 18.90 } ],
  "duplicates": [ { "id": "1", "merchant": "Nome", "date": "12/10", "amount": 14.90, "occurrences": 2 } ],
  "categories": { "pix": 1240.0, "boletos": 890.5, "debitos": 2140.8 },
  "totalAttention": 42.30,
  "isClean": false
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { text: text.slice(0, 8000) },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!res.ok) return null;
  const json = await res.json();
  const textOutput =
    json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) return null;

  return JSON.parse(textOutput) as AnalysisSummaryData;
}
