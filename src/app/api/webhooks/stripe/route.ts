import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID, createHmac } from "crypto";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tickets, seatHolds, holdHistory } from "@/lib/db/schema";

export const runtime = "nodejs";

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
  const { eventId, buyerId, seatIds, idempotencyKey } = session.metadata ?? {};

  if (!eventId || !buyerId || !seatIds || !idempotencyKey) {
    console.error("Webhook received a session with incomplete metadata");
    return NextResponse.json({ received: true });
  }

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const seatIdList: string[] = seatIds
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  // Claim the order with one atomic conditional UPDATE rather than
  // SELECT-then-UPDATE. Stripe retries webhooks, and two deliveries can
  // land concurrently: with a read-then-write both would see "pending",
  // both would proceed, and the second would blow up inserting a
  // duplicate qr_token. Only the delivery that actually flips the row
  // gets a row back, so exactly one finalizes the order.
  const claimed = await db.execute(sql`
    UPDATE orders
    SET status = 'paid'
    WHERE idempotency_key = ${idempotencyKey} AND status <> 'paid'
    RETURNING id
  `);

  const claimedRows = (
    Array.isArray(claimed) ? claimed : (claimed?.rows ?? [])
  ) as { id: string }[];

  if (claimedRows.length === 0) {
    // Either already finalized (a replay) or no such order. Both are
    // "nothing left to do" — acknowledge so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const orderId: string = claimedRows[0].id;

  for (const seatId of seatIdList) {
    const qrPayload = `${eventId}:${seatId}:${orderId}`;
    const qrToken = createHmac("sha256", process.env.TICKET_SIGNING_SECRET!)
      .update(qrPayload)
      .digest("hex");

    await db
      .insert(tickets)
      .values({
        id: randomUUID(),
        orderId,
        eventId,
        seatId,
        qrToken,
        status: "valid",
      })
      // qrToken is deterministic for a given (event, seat, order), so a
      // replay that somehow gets past the claim above still can't mint a
      // second ticket for the same seat.
      .onConflictDoNothing({ target: tickets.qrToken });
  }

  // Release ONLY the seats in this order, held by this buyer. An earlier
  // version deleted every hold for the whole event on any single
  // payment, which silently dropped other shoppers' in-progress holds
  // and let their seats be resold underneath them.
  if (seatIdList.length > 0) {
    await db
      .delete(seatHolds)
      .where(
        and(
          eq(seatHolds.eventId, eventId),
          eq(seatHolds.buyerId, buyerId),
          inArray(seatHolds.seatId, seatIdList)
        )
      );

    // Close out the audit trail for those holds — hold_history rows are
    // what the abuse/rate-limit view reads, so a purchased hold that is
    // never marked released looks identical to one abandoned forever.
    await db
      .update(holdHistory)
      .set({ releasedAt: new Date() })
      .where(
        and(
          eq(holdHistory.eventId, eventId),
          eq(holdHistory.buyerId, buyerId),
          inArray(holdHistory.seatId, seatIdList),
          sql`${holdHistory.releasedAt} IS NULL`
        )
      );
  }

  return NextResponse.json({ received: true });
}
