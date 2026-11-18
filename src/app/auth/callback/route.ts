import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  // Preserva os parâmetros (?code=...) para que o cliente Supabase no navegador conclua a troca PKCE com o localStorage
  return NextResponse.redirect(
    new URL(`/${requestUrl.search}`, requestUrl.origin)
  );
}
