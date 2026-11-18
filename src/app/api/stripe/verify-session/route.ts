import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId =
      typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const fallbackUserId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey || !sessionId) {
      return NextResponse.json({
        verified: false,
      });
    }

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid =
      session.payment_status === "paid" || session.status === "complete";

    if (!isPaid) {
      return NextResponse.json({
        verified: false,
        status: session.status,
      });
    }

    const userId = session.metadata?.userId || fallbackUserId;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    const supabaseAdmin = getSupabaseAdminClient();
    if (supabaseAdmin && userId) {
      await supabaseAdmin
        .from("profiles")
        .update({
          plan_status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }

    return NextResponse.json({
      verified: true,
      userId,
      customerId,
      subscriptionId,
    });
  } catch (error) {
    console.error("[Stripe Verify Session Error]:", error);
    return NextResponse.json(
      {
        verified: false,
      },
      { status: 200 }
    );
  }
}

