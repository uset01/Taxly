import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  AnalysisSummaryData,
  DetectedDuplicate,
  DetectedTariff,
  EconomyItem,
  OpenAiAnalyzePayload,
  OpenAiOpportunityItem,
} from "@/lib/detect-charges";

const SYSTEM_PROMPT = `Você é o motor oficial de auditoria financeira do aplicativo Taxly.
Sua missão é analisar arquivos de faturas de cartão de crédito, extratos bancários e comprovantes financeiros enviados pelo usuário.

Siga rigorosamente estas 3 instruções:

1. VALIDAÇÃO DE AUTENTICIDADE FINANCEIRA:
Verifique se o arquivo enviado é realmente uma fatura de cartão de crédito, extrato bancário ou comprovante financeiro oficial (PIX, TED, boleto bancário).
- Se for selfie, foto aleatória, paisagem, animal, objeto, meme, print de conversa ou documento não financeiro, retorne "arquivoValido": false e explique claramente em "motivoInvalido" (ex: "O arquivo enviado não é uma fatura, extrato bancário ou comprovante financeiro válido.").

2. EXTRAÇÃO REAL DE TRANSAÇÕES E RESUMO POR CATEGORIA:
- Conte o número total real de transações/lançamentos do documento em "totalTransacoes".
- Some os valores reais (em número decimal, ex: 1240.50) de todas as transações do documento agrupadas em "resumoCategorias":
  - "pix": soma total de transferências/pagamentos via PIX.
  - "boletos": soma total de pagamentos de boletos/contas.
  - "debitos": soma total de compras no cartão/débito, assinaturas, tarifas e demais lançamentos.

3. IDENTIFICAÇÃO DE TARIFAS, ASSINATURAS RECORRENTES E DUPLICIDADES REAIS:
- Identifique tarifas bancárias, juros, IOF, anuidades, seguros embutidos, assinaturas recorrentes (streamings, clubes, apps, mensalidades) e cobranças otimizáveis reais do documento e liste em "itensOportunidade". A quantidade de itens em "itensOportunidade" NUNCA pode ser maior que "totalTransacoes". Cada item deve ter:
  - "categoria": escolha estritamente uma destas 4 tags específicas do problema: "Renovação recorrente", "Tarifa bancária", "Cobrança duplicada" ou "Serviço opcional".
  - "nomeEstabelecimento": nome real exato como aparece no extrato/fatura.
  - "valorMensal": valor numérico real (ex: 39.90).
  - "data": data real formatada como "DD Mês AAAA" (ex: "12 Out 2026").
- Em "tarifaAmostraGratis", destaque 1 tarifa, juros ou micro-cobrança real encontrada no documento ("nome" e "valor"). Se não houver tarifa explícita, use a primeira cobrança recorrente/otimizável encontrada. Se não houver nenhuma, retorne { "nome": "", "valor": 0 }.
- Em "possivelDuplicidade", verifique se há cobranças duplicadas reais (mesmo estabelecimento/valor cobrado mais de uma vez na mesma data ou período próximo). Se encontrar, preencha "encontrada": true, "nomeEstabelecimento", "data" e "valor". Caso contrário, retorne "encontrada": false, "nomeEstabelecimento": "", "data": "", "valor": 0.

Retorne ESTRITAMENTE este objeto JSON (sem markdown, apenas JSON válido):
{
  "arquivoValido": true,
  "motivoInvalido": "",
  "totalTransacoes": 0,
  "resumoCategorias": {
    "pix": 0,
    "boletos": 0,
    "debitos": 0
  },
  "itensOportunidade": [
    {
      "categoria": "Cobrança Recorrente",
      "nomeEstabelecimento": "Nome real no extrato",
      "valorMensal": 0,
      "data": "DD Mês AAAA"
    }
  ],
  "tarifaAmostraGratis": {
    "nome": "Nome de 1 tarifa, juros ou micro-cobrança real encontrada",
    "valor": 0
  },
  "possivelDuplicidade": {
    "encontrada": false,
    "nomeEstabelecimento": "",
    "data": "",
    "valor": 0
  }
}`;

function toNumber(val: unknown): number {
  if (typeof val === "number") {
    return Number.isFinite(val) ? Number(val.toFixed(2)) : 0;
  }
  if (typeof val === "string") {
    const cleaned = val.replace(/[^\d,.-]/g, "").trim();
    if (!cleaned) return 0;
    if (cleaned.includes(",") && cleaned.includes(".")) {
      const parsed = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
    }
    if (cleaned.includes(",")) {
      const parsed = parseFloat(cleaned.replace(",", "."));
      return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
    }
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
  }
  return 0;
}

function resolveMimeType(file: File): string {
  if (file.type && file.type.trim().length > 0) {
    return file.type;
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    activeEngine: "openai",
    model: "gpt-4.1-mini",
    configured: Boolean(process.env.OPENAI_API_KEY),
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Chave OPENAI_API_KEY não configurada no ambiente (.env.local).",
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum arquivo enviado no campo 'file'.",
        },
        { status: 400 }
      );
    }

    const file = fileEntry as File;
    const mimeType = resolveMimeType(file);
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const isPdf =
      mimeType === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    const openai = new OpenAI({ apiKey });

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      {
        type: "text",
        text: `Analise o documento "${file.name}" e retorne estritamente o JSON solicitado.`,
      },
    ];

    if (isPdf) {
      userContent.push({
        type: "file",
        file: {
          filename: file.name || "documento.pdf",
          file_data: dataUrl,
        },
      } as unknown as OpenAI.Chat.Completions.ChatCompletionContentPart);
    } else {
      userContent.push({
        type: "image_url",
        image_url: {
          url: dataUrl,
          detail: "high",
        },
      });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        {
          success: false,
          error: "A IA não retornou dados para o documento enviado.",
        },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawContent) as Record<string, unknown>;

    const arquivoValido = Boolean(parsed.arquivoValido);
    const motivoInvalido =
      typeof parsed.motivoInvalido === "string"
        ? parsed.motivoInvalido.trim()
        : "";

    if (!arquivoValido) {
      return NextResponse.json(
        {
          success: false,
          arquivoValido: false,
          motivoInvalido:
            motivoInvalido ||
            "Este arquivo não parece ser uma fatura, extrato bancário ou comprovante financeiro válido.",
          error:
            motivoInvalido ||
            "Este arquivo não parece ser uma fatura, extrato bancário ou comprovante financeiro válido.",
        },
        { status: 422 }
      );
    }

    const totalTransacoes = Math.max(
      0,
      Math.round(toNumber(parsed.totalTransacoes))
    );

    const rawCategorias =
      typeof parsed.resumoCategorias === "object" &&
      parsed.resumoCategorias !== null
        ? (parsed.resumoCategorias as Record<string, unknown>)
        : {};

    const resumoCategorias = {
      pix: toNumber(rawCategorias.pix),
      boletos: toNumber(rawCategorias.boletos),
      debitos: toNumber(rawCategorias.debitos),
    };

    const rawOportunidades = Array.isArray(parsed.itensOportunidade)
      ? (parsed.itensOportunidade as Record<string, unknown>[])
      : [];

    const itensOportunidade: OpenAiOpportunityItem[] = rawOportunidades
      .map((item) => ({
        categoria:
          typeof item.categoria === "string" && item.categoria.trim()
            ? item.categoria.trim()
            : "Cobrança Recorrente",
        nomeEstabelecimento:
          typeof item.nomeEstabelecimento === "string" &&
          item.nomeEstabelecimento.trim()
            ? item.nomeEstabelecimento.trim()
            : "Cobrança identificada",
        valorMensal: toNumber(item.valorMensal),
        data:
          typeof item.data === "string" && item.data.trim()
            ? item.data.trim()
            : "Recente",
      }))
      .filter((item) => item.valorMensal > 0);

    const rawTarifaAmostra =
      typeof parsed.tarifaAmostraGratis === "object" &&
      parsed.tarifaAmostraGratis !== null
        ? (parsed.tarifaAmostraGratis as Record<string, unknown>)
        : {};

    const tarifaAmostraGratis = {
      nome:
        typeof rawTarifaAmostra.nome === "string"
          ? rawTarifaAmostra.nome.trim()
          : "",
      valor: toNumber(rawTarifaAmostra.valor),
    };

    const rawDuplicidade =
      typeof parsed.possivelDuplicidade === "object" &&
      parsed.possivelDuplicidade !== null
        ? (parsed.possivelDuplicidade as Record<string, unknown>)
        : {};

    const possivelDuplicidade = {
      encontrada: Boolean(rawDuplicidade.encontrada),
      nomeEstabelecimento:
        typeof rawDuplicidade.nomeEstabelecimento === "string"
          ? rawDuplicidade.nomeEstabelecimento.trim()
          : "",
      data:
        typeof rawDuplicidade.data === "string"
          ? rawDuplicidade.data.trim()
          : "",
      valor: toNumber(rawDuplicidade.valor),
    };

    const openAiPayload: OpenAiAnalyzePayload = {
      arquivoValido: true,
      motivoInvalido: "",
      totalTransacoes,
      resumoCategorias,
      itensOportunidade,
      tarifaAmostraGratis,
      possivelDuplicidade,
    };

    // Constrói estrutura compatível com AnalysisSummaryData usando 100% os dados reais da OpenAI
    const tariffs: DetectedTariff[] = [];
    if (tarifaAmostraGratis.nome && tarifaAmostraGratis.valor > 0) {
      tariffs.push({
        id: "tarifa-amostra-1",
        name: tarifaAmostraGratis.nome,
        amount: tarifaAmostraGratis.valor,
      });
    }

    itensOportunidade.forEach((op, idx) => {
      const isAlreadySample =
        tariffs.length > 0 &&
        tariffs[0].name.toLowerCase() ===
          op.nomeEstabelecimento.toLowerCase() &&
        Math.abs(tariffs[0].amount - op.valorMensal) < 0.01;

      if (!isAlreadySample) {
        tariffs.push({
          id: `tarifa-op-${idx + 1}`,
          name: op.nomeEstabelecimento,
          amount: op.valorMensal,
        });
      }
    });

    const duplicates: DetectedDuplicate[] = [];
    if (
      possivelDuplicidade.encontrada &&
      possivelDuplicidade.nomeEstabelecimento &&
      possivelDuplicidade.valor > 0
    ) {
      duplicates.push({
        id: "dup-real-1",
        merchant: possivelDuplicidade.nomeEstabelecimento,
        date: possivelDuplicidade.data || "Recente",
        amount: possivelDuplicidade.valor,
        occurrences: 2,
      });
    }

    const economyItems: EconomyItem[] = itensOportunidade.map((op, idx) => {
      const lowerCat = op.categoria.toLowerCase();
      const actionTip =
        lowerCat.includes("tarifa") ||
        lowerCat.includes("juros") ||
        lowerCat.includes("encargo") ||
        lowerCat.includes("taxa")
          ? "Pedir estorno de tarifa ao banco"
          : "Cancelar assinatura ou cobrança no app";

      return {
        id: `eco-real-${idx + 1}`,
        name: `${op.nomeEstabelecimento} (${op.data})`,
        monthlyAmount: op.valorMensal,
        yearlyImpact: Number((op.valorMensal * 12).toFixed(2)),
        actionTip,
        category: op.categoria,
      };
    });

    if (
      economyItems.length === 0 &&
      tarifaAmostraGratis.nome &&
      tarifaAmostraGratis.valor > 0
    ) {
      economyItems.push({
        id: "eco-amostra-1",
        name: tarifaAmostraGratis.nome,
        monthlyAmount: tarifaAmostraGratis.valor,
        yearlyImpact: Number((tarifaAmostraGratis.valor * 12).toFixed(2)),
        actionTip: "Pedir estorno de tarifa ao banco",
        category: "Tarifa/Encargo",
      });
    }

    if (
      possivelDuplicidade.encontrada &&
      possivelDuplicidade.nomeEstabelecimento &&
      possivelDuplicidade.valor > 0
    ) {
      const alreadyInEco = economyItems.some(
        (e) =>
          e.name
            .toLowerCase()
            .includes(possivelDuplicidade.nomeEstabelecimento.toLowerCase()) &&
          Math.abs(e.monthlyAmount - possivelDuplicidade.valor) < 0.01
      );
      if (!alreadyInEco) {
        economyItems.push({
          id: "eco-dup-1",
          name: `Duplicidade: ${possivelDuplicidade.nomeEstabelecimento} (${possivelDuplicidade.data})`,
          monthlyAmount: possivelDuplicidade.valor,
          yearlyImpact: Number((possivelDuplicidade.valor * 12).toFixed(2)),
          actionTip: "Contestar cobrança duplicada no banco",
          category: "Cobrança Duplicada",
        });
      }
    }

    const totalSavingsMonthly = Number(
      economyItems
        .reduce((acc, item) => acc + item.monthlyAmount, 0)
        .toFixed(2)
    );

    const isClean =
      economyItems.length === 0 &&
      tariffs.length === 0 &&
      duplicates.length === 0;

    const lowerFileName = file.name.toLowerCase();
    const documentType: "fatura" | "extrato" =
      lowerFileName.includes("extrato") || lowerFileName.includes("comprovante")
        ? "extrato"
        : "fatura";

    const analysisData: AnalysisSummaryData = {
      documentType,
      fileName: file.name,
      tariffs,
      duplicates,
      categories: resumoCategorias,
      totalAttention: totalSavingsMonthly,
      isClean,
      economyItems,
      totalRecurringSavings: totalSavingsMonthly,
      isSingleTransaction: totalTransacoes === 1,
      singleTransactionAmount:
        totalTransacoes === 1
          ? resumoCategorias.pix +
            resumoCategorias.boletos +
            resumoCategorias.debitos
          : 0,
      ...openAiPayload,
    };

    return NextResponse.json({
      ...openAiPayload,
      success: true,
      data: analysisData,
      meta: {
        engine: "openai",
        model: "gpt-4.1-mini",
        fileName: file.name,
        fileSizeBytes: file.size,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[OpenAI Analyze Error]:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro inesperado ao analisar o documento na OpenAI.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
