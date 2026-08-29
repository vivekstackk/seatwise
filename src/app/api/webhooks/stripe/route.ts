import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { fulfilCheckoutSession } from "@/lib/db/fulfilment";

export const runtime = "nodejs";

/**
 * Stripe's push notification that a checkout completed.
 *
 * The actual work lives in `fulfilCheckoutSession` because this is no
 * longer the only way an order gets fulfilled — `getOrderStatus` and
 * `getMyTickets` also pull from Stripe directly, so a webhook that never
 * arrives (no listener, unregistered endpoint, stale signing secret) no
 * longer means a paid order without tickets. Both paths are idempotent
 * and may race.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const result = await fulfilCheckoutSession(session);

  // Always acknowledge. Every outcome here is terminal — a retry of the
  // same delivery cannot change unpaid, missing metadata or a missing
  // order — and an unacknowledged webhook is retried for days.
  return NextResponse.json({ received: true, result });
}
