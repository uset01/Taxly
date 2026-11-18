import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SECRET_KEY ou STRIPE_WEBHOOK_SECRET não configurados no ambiente.",
      },
      { status: 400 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Cabeçalho stripe-signature ausente." },
      { status: 400 }
    );
  }

  const stripe = new Stripe(secretKey);
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook Signature Error]:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `Webhook Error: ${err.message}`
            : "Assinatura do webhook inválida.",
      },
      { status: 400 }
    );
  }

  const supabaseAdmin = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

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
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";
        const newStatus = isActive
          ? "active"
          : subscription.status === "paused"
            ? "paused"
            : "free";

        if (supabaseAdmin) {
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .update({
                plan_status: newStatus,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          } else {
            await supabaseAdmin
              .from("profiles")
              .update({
                plan_status: newStatus,
                stripe_subscription_id: subscription.id,
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", customerId);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        if (supabaseAdmin) {
          if (userId) {
            await supabaseAdmin
              .from("profiles")
              .update({
                plan_status: "free",
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          } else {
            await supabaseAdmin
              .from("profiles")
              .update({
                plan_status: "free",
                updated_at: new Date().toISOString(),
              })
              .eq("stripe_customer_id", customerId);
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Handler Error]:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao processar evento do webhook Stripe.",
      },
      { status: 500 }
    );
  }
}

