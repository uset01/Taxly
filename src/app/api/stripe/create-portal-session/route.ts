import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "";
    let customerId =
      typeof body.stripeCustomerId === "string" ? body.stripeCustomerId : "";

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    if (!secretKey) {
      return NextResponse.json(
        {
          configured: false,
          error: "STRIPE_SECRET_KEY não configurada no .env.local.",
        },
        { status: 200 }
      );
    }

    if (!customerId && userId) {
      const supabaseAdmin = getSupabaseAdminClient();
      if (supabaseAdmin) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("stripe_customer_id")
          .eq("id", userId)
          .single();

        if (profile?.stripe_customer_id) {
          customerId = profile.stripe_customer_id;
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          configured: false,
          error:
            "Nenhum cliente Stripe vinculado a esta conta ainda.",
        },
        { status: 200 }
      );
    }

    const stripe = new Stripe(secretKey);

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/`,
    });

    return NextResponse.json({
      configured: true,
      url: portalSession.url,
    });
  } catch (error) {
    console.error("[Stripe Portal Error]:", error);
    return NextResponse.json(
      {
        configured: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao abrir portal de cobrança da Stripe.",
      },
      { status: 500 }
    );
  }
}

