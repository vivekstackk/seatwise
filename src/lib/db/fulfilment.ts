import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID, createHmac } from "crypto";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { tickets, seatHolds, holdHistory, orders } from "@/lib/db/schema";

/**
 * ============================================================
 * ORDER FULFILMENT
 * ------------------------------------------------------------
 * Turning a paid Stripe Checkout session into tickets, extracted
 * out of the webhook route so it is not the *only* way an order
 * can be fulfilled.
 *
 * The webhook is still the primary path, but it is a separate
 * inbound call from Stripe and it can simply never arrive: no
 * listener running locally, no endpoint registered on the hosted
 * origin, or a stale `whsec_…` that makes every delivery fail
 * signature verification. When that happened the money moved,
 * the order stayed `pending`, and no ticket existed anywhere —
 * with nothing in the app able to recover it.
 *
 * So the app now also pulls: it asks Stripe directly whether a
 * session was paid and fulfils it on the spot. Stripe is the
 * authority either way, and the work below is idempotent, so a
 * pull and a webhook racing each other is harmless.
 * ============================================================
 */

export type FulfilResult =
  | "fulfilled"
  | "already_fulfilled"
  | "unpaid"
  | "incomplete_metadata"
  | "no_order"
  | "seat_conflict";

/**
 * Idempotent. Safe to call repeatedly, concurrently, and from both
 * the webhook and a page load for the same session.
 */
export async function fulfilCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<FulfilResult> {
  const { eventId, buyerId, seatIds, idempotencyKey } = session.metadata ?? {};

  if (!eventId || !buyerId || !seatIds || !idempotencyKey) {
    console.error("Fulfilment: session has incomplete metadata", session.id);
    return "incomplete_metadata";
  }

  if (session.payment_status !== "paid") {
    return "unpaid";
  }

  const seatIdList = seatIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const [order] = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(eq(orders.idempotencyKey, idempotencyKey));

  if (!order) {
    console.error("Fulfilment: no order for session", session.id);
    return "no_order";
  }

  if (order.status === "paid") {
    return "already_fulfilled";
  }

  /*
   * Refuse to issue a ticket for a seat that already belongs to someone
   * else's order.
   *
   * This matters because fulfilment is no longer only triggered seconds
   * after payment. A stale order — paid, webhook lost, hold long since
   * expired, seat resold to another buyer — would otherwise mint a
   * second valid ticket for an occupied seat and quietly break the
   * one-ticket-per-seat guarantee that the whole project rests on. That
   * is an oversell to settle out of band (refunds are out of scope), not
   * something to paper over by printing another ticket.
   */
  const occupied = await db
    .select({ seatId: tickets.seatId, orderId: tickets.orderId })
    .from(tickets)
    .where(
      and(eq(tickets.eventId, eventId), inArray(tickets.seatId, seatIdList))
    );

  const takenByOthers = occupied.filter((t) => t.orderId !== order.id);

  if (takenByOthers.length > 0) {
    console.error(
      `Fulfilment refused for session ${session.id}: seat(s) ` +
        `${takenByOthers.map((t) => t.seatId).join(", ")} already ticketed ` +
        `on another order. Order left pending for manual settlement.`
    );
    return "seat_conflict";
  }

  // Claim the order with one atomic conditional UPDATE rather than
  // trusting the status read above. Stripe retries webhooks, and a retry
  // can land while a page-load reconcile is running: with a read-then-
  // write both would see "pending", both would proceed, and the second
  // would blow up inserting a duplicate qr_token. Only the caller that
  // actually flips the row gets a row back, so exactly one finalizes the
  // order.
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
    // Someone else claimed it between the read and here. Their call is
    // doing the work.
    return "already_fulfilled";
  }

  const orderId = claimedRows[0].id;

  // Record the session id if checkout never got to write it back (the
  // create-then-update in createCheckout is two round trips, and the
  // buyer can pay before the second one lands).
  await db
    .update(orders)
    .set({ stripeSessionId: session.id })
    .where(and(eq(orders.id, orderId), sql`stripe_session_id IS NULL`));

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
      // caller that somehow gets past the claim above still can't mint a
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

  return "fulfilled";
}

/**
 * Ask Stripe about one session and fulfil it if it is paid. This is the
 * pull side: it needs no webhook, no signature and no public endpoint,
 * only the session id the buyer was redirected back with.
 *
 * Never throws — a reconcile is always a best-effort improvement on
 * whatever the database already says, so a Stripe outage must not turn a
 * page render into an error.
 */
export async function reconcileCheckoutSession(
  sessionId: string
): Promise<FulfilResult | "error"> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return await fulfilCheckoutSession(session);
  } catch (err) {
    console.error("Reconcile failed for session", sessionId, err);
    return "error";
  }
}
