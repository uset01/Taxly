import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : "guest_user";
    const userEmail =
      typeof body.email === "string" && body.email.includes("@")
        ? body.email
        : undefined;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    if (!secretKey || !priceId) {
      return NextResponse.json(
        {
          configured: false,
          error:
            "Chaves STRIPE_SECRET_KEY e STRIPE_PRICE_ID ainda não configuradas no .env.local.",
        },
        { status: 200 }
      );
    }

    const stripe = new Stripe(secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
      success_url: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/?checkout=canceled`,
    });

    return NextResponse.json({
      configured: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("[Stripe Create Checkout Error]:", error);
    return NextResponse.json(
      {
        configured: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar sessão de checkout na Stripe.",
      },
      { status: 500 }
    );
  }
}
