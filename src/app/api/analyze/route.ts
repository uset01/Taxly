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
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasClaude = Boolean(process.env.ANTHROPIC_API_KEY);

  const activeEngine = hasGemini
    ? "gemini"
    : hasOpenAi
      ? "openai"
      : hasClaude
        ? "claude"
        : "heuristic";

  return NextResponse.json({
    status: "online",
    activeEngine,
    aiAvailable: {
      gemini: hasGemini,
      openai: hasOpenAi,
      claude: hasClaude,
    },
    message:
      activeEngine === "gemini"
        ? "Google Gemini 3.5 Flash configurado e ativo como motor de análise de documentos."
        : activeEngine === "heuristic"
          ? "Motor heurístico ativo com detecção de tarifas e duplicidades."
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

    // 1. Tenta Gemini (prioritário) se configurado
    if (process.env.GEMINI_API_KEY) {
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
        console.warn("Gemini erro:", geminiErr);
        const errMsg =
          geminiErr instanceof Error
            ? geminiErr.message
            : "Falha na API Gemini.";
        if (errMsg.includes("403") || errMsg.includes("Permission Denied")) {
          return NextResponse.json(
            {
              success: false,
              error: errMsg,
            },
            { status: 403 }
          );
        }
      }
    }

    // 2. Tenta OpenAI se configurado
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
 * Utilitários robustos para extrair e normalizar valores monetários
 */
function parseAmount(val: unknown): number {
  if (typeof val === "number") {
    return isNaN(val) ? 0 : Number(val.toFixed(2));
  }
  if (typeof val === "string") {
    // Trata "R$ 42,90", "42,90", "42.90", "1.240,50", " 14.90 "
    const cleaned = val.replace(/[^\d,.-]/g, "").trim();
    if (!cleaned) return 0;

    // Se possui vírgula e ponto (ex: 1.250,50)
    if (cleaned.includes(",") && cleaned.includes(".")) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    }
    // Se possui apenas vírgula (ex: 42,90)
    if (cleaned.includes(",")) {
      const normalized = cleaned.replace(",", ".");
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
    }
    // Formato padrão com ponto (ex: 42.90)
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
  }
  return 0;
}

function extractItemAmount(item: Record<string, unknown>): number {
  const possible =
    item.amount ??
    item.value ??
    item.valor ??
    item.price ??
    item.preco ??
    item.val;
  return parseAmount(possible);
}

function extractItemName(item: Record<string, unknown>, fallback: string): string {
  const possible =
    item.name ??
    item.nome ??
    item.description ??
    item.descricao ??
    item.merchant ??
    item.favorecido ??
    item.estabelecimento;
  return typeof possible === "string" && possible.trim().length > 0
    ? possible.trim()
    : fallback;
}

function extractItemDate(item: Record<string, unknown>): string {
  const possible = item.date ?? item.data ?? item.dia;
  return typeof possible === "string" && possible.trim().length > 0
    ? possible.trim()
    : "Recente";
}

function extractItemOccurrences(item: Record<string, unknown>): number {
  const possible =
    item.occurrences ??
    item.ocorrencias ??
    item.repeticoes ??
    item.quantidade ??
    item.count;
  const num = typeof possible === "number" ? possible : parseInt(String(possible), 10);
  return isNaN(num) || num < 2 ? 2 : num;
}

/**
 * Chamada à API Google Gemini com suporte multimodal (PDF, Imagens e Texto)
 */
async function callGeminiAnalysis(
  fileName: string,
  buffer: ArrayBuffer | null,
  text: string
): Promise<AnalysisSummaryData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Você é o auditor financeiro oficial do app Taxly.
Sua missão é auditar com rigor e precisão o arquivo recebido ("${fileName}").

DIRETRIZES CRÍTICAS (NÃO INVENTE COISAS):
1. Verifique se o arquivo enviado é de fato um extrato bancário, fatura de cartão de crédito ou comprovante financeiro legível.
   - Se for uma imagem não financeira (ex: foto de pessoa, selfie, paisagem, meme, foto aleatória) OU se for uma fatura/extrato sem cobranças indevidas e sem compras duplicadas:
     Você DEVE retornar:
     "tariffs": [],
     "duplicates": [],
     "categories": { "pix": 0, "boletos": 0, "debitos": 0 },
     "totalAttention": 0,
     "isClean": true
   - NUNCA invente tarifas ou duplicidades que não estejam explicitamente no documento.

2. "tariffs" (Tarifas bancárias pagas):
   - Inclua APENAS cobranças bancárias reais identificadas por termos como: tarifa, taxa, juros, iof, anuidade, manutenção, pacote de serviços, encargos.
   - Cada tarifa deve ter:
     { "id": "tarifa-1", "name": "Nome da tarifa", "amount": 42.90 }
   - Se não houver tarifas, deixe a lista vazia: [].

3. "duplicates" (Possíveis cobranças duplicadas):
   - Inclua APENAS transações do mesmo estabelecimento/favorecido, com o mesmo valor no mesmo dia que apareçam 2 ou mais vezes.
   - Cada duplicidade deve ter:
     { "id": "dup-1", "merchant": "Nome do favorecido", "date": "Data", "amount": 24.90, "occurrences": 2 }
   - Se não houver duplicidade, deixe a lista vazia: [].

4. "categories" (Gastos reais identificados):
   - "pix": soma total em R$ de transações via PIX (0 se não houver).
   - "boletos": soma total em R$ de boletos (0 se não houver).
   - "debitos": soma total em R$ de outros débitos e compras no cartão (0 se não houver).

5. "totalAttention":
   - Soma total em R$ de (tarifas + duplicidades). Se não houver tarifas nem duplicidades, DEVE ser 0.

6. "isClean":
   - true se totalAttention for 0 (nenhuma tarifa e nenhuma duplicidade).
   - false se houver pelo menos uma tarifa ou duplicidade real.

Responda SOMENTE em formato JSON estrito:
{
  "documentType": "fatura" ou "extrato",
  "fileName": "${fileName}",
  "tariffs": [],
  "duplicates": [],
  "categories": { "pix": 0, "boletos": 0, "debitos": 0 },
  "totalAttention": 0,
  "isClean": true
}`;

  const lowerName = fileName.toLowerCase();
  const isPdf = lowerName.endsWith(".pdf");
  const isImage =
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".heic");

  type GeminiPart =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const parts: GeminiPart[] = [{ text: prompt }];

  // Envia como PDF nativo
  if (isPdf && buffer && buffer.byteLength > 0 && buffer.byteLength < 15 * 1024 * 1024) {
    try {
      const base64Data = Buffer.from(buffer).toString("base64");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64Data,
        },
      });
    } catch {
      if (text) {
        parts.push({ text: `Texto extraído do documento:\n${text.slice(0, 15000)}` });
      }
    }
  }
  // Envia como imagem nativa
  else if (isImage && buffer && buffer.byteLength > 0 && buffer.byteLength < 10 * 1024 * 1024) {
    try {
      const mimeType = lowerName.endsWith(".png")
        ? "image/png"
        : lowerName.endsWith(".webp")
          ? "image/webp"
          : "image/jpeg";
      const base64Data = Buffer.from(buffer).toString("base64");
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    } catch {
      if (text) {
        parts.push({ text: `Texto extraído do documento:\n${text.slice(0, 15000)}` });
      }
    }
  }
  // Envia como texto puro para arquivos txt, csv, ofx ou json
  else if (text && text.trim().length > 0) {
    parts.push({ text: `Texto extraído do documento:\n${text.slice(0, 15000)}` });
  } else if (buffer && buffer.byteLength > 0) {
    try {
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const decoded = textDecoder.decode(buffer.slice(0, 32768));
      parts.push({ text: `Texto extraído do documento:\n${decoded.slice(0, 15000)}` });
    } catch {
      // Ignora erro de decodificação
    }
  }

  // Modelos disponíveis suportados pela chave do usuário em ordem de prioridade
  // Priorizando os modelos Lite que possuem cota ativa no plano gratuito
  const modelsToTry = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`[Gemini] Tentando modelo ${model} para arquivo "${fileName}"...`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Gemini] (${model}) retornou status ${res.status}:`, errorText);
        if (res.status === 403 || res.status === 401) {
          throw new Error(
            "Chave de API do Gemini não autorizada ou expirada (Erro 403). Gere uma API Key válida em https://aistudio.google.com/apikey (formato AIzaSy...)."
          );
        }
        continue;
      }

      const json = await res.json();
      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`[Gemini] Resposta recebida de ${model}:`, rawText);
      if (!rawText) continue;

      const cleaned = rawText
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned) as Record<string, unknown>;
      const rawTariffs = Array.isArray(parsed.tariffs) ? parsed.tariffs : [];
      const tariffs = rawTariffs
        .map((t: Record<string, unknown>, idx: number) => ({
          id: String(t.id || `tarifa-${idx + 1}`),
          name: extractItemName(t, "Tarifa bancária"),
          amount: extractItemAmount(t),
        }))
        .filter((t) => t.amount > 0);

      const rawDuplicates = Array.isArray(parsed.duplicates)
        ? parsed.duplicates
        : [];
      const duplicates = rawDuplicates
        .map((d: Record<string, unknown>, idx: number) => ({
          id: String(d.id || `dup-${idx + 1}`),
          merchant: extractItemName(d, "Cobrança"),
          date: extractItemDate(d),
          amount: extractItemAmount(d),
          occurrences: extractItemOccurrences(d),
        }))
        .filter((d) => d.amount > 0);

      const tariffsSum = tariffs.reduce((acc, t) => acc + t.amount, 0);
      const dupesSum = duplicates.reduce((acc, d) => acc + d.amount, 0);
      const calculatedTotal = Number((tariffsSum + dupesSum).toFixed(2));

      const categoriesObj =
        typeof parsed.categories === "object" && parsed.categories !== null
          ? (parsed.categories as Record<string, unknown>)
          : {};

      const pixTotal = parseAmount(categoriesObj.pix);
      const boletosTotal = parseAmount(categoriesObj.boletos);
      const debitosTotal = parseAmount(categoriesObj.debitos);

      const isClean =
        calculatedTotal === 0 ||
        (tariffs.length === 0 && duplicates.length === 0);

      const finalResult: AnalysisSummaryData = {
        documentType:
          parsed.documentType === "extrato" ? "extrato" : "fatura",
        fileName,
        tariffs: isClean ? [] : tariffs,
        duplicates: isClean ? [] : duplicates,
        categories: {
          pix: pixTotal,
          boletos: boletosTotal,
          debitos: debitosTotal,
        },
        totalAttention: isClean ? 0 : calculatedTotal,
        isClean,
      };
      console.log(`[Gemini] Resultado formatado:`, JSON.stringify(finalResult));
      return finalResult;
    } catch (err) {
      console.warn(`Erro chamando modelo Gemini ${model}:`, err);
    }
  }

  return null;
}
