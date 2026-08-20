"use server";

import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { events, orders, tickets } from "@/lib/db/schema";
import {
  holdSeatsCore,
  releaseSeatCore,
  getHeldOrSoldSeats,
  getActiveHoldsForBuyer,
  checkInTicketCore,
} from "@/lib/db/holds";

async function requireBuyerId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new Error("Not signed in");
  }
  return session.user.id;
}

export async function holdSeats(eventId: string, seatIds: string[]) {
  const buyerId = await requireBuyerId();
  return holdSeatsCore(eventId, seatIds, buyerId);
}

export async function releaseSeat(eventId: string, seatId: string) {
  const buyerId = await requireBuyerId();
  await releaseSeatCore(eventId, seatId, buyerId);
}

export async function getSeatStatus(eventId: string) {
  return getHeldOrSoldSeats(eventId);
}

export async function createCheckout(eventId: string) {
  const buyerId = await requireBuyerId();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  if (!event) {
    throw new Error("Event not found");
  }

  const seatIds = await getActiveHoldsForBuyer(eventId, buyerId);

  if (seatIds.length === 0) {
    throw new Error("No active seat holds found for this buyer");
  }

  const idempotencyKey = randomUUID();
  const amountCents = event.priceCents * seatIds.length;
  const orderId = randomUUID();

  await db.insert(orders).values({
    id: orderId,
    eventId,
    buyerId,
    amountCents,
    status: "pending",
    idempotencyKey,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: `${event.title} — ${seatIds.length} seat(s)`,
          },
          unit_amount: event.priceCents,
        },
        quantity: seatIds.length,
      },
    ],
    metadata: {
      eventId,
      buyerId,
      seatIds: seatIds.join(","),
      idempotencyKey,
      orderId,
    },
    success_url: `${process.env.BETTER_AUTH_URL}/events/${eventId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.BETTER_AUTH_URL}/events/${eventId}?payment=cancelled`,
  });

  await db
    .update(orders)
    .set({ stripeSessionId: session.id })
    .where(eq(orders.id, orderId));

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return { url: session.url };
}

export async function getOrderStatus(sessionId: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeSessionId, sessionId));

  if (!order) return { status: "not_found" as const };
  if (order.status !== "paid") return { status: "pending" as const };

  const orderTickets = await db
    .select()
    .from(tickets)
    .where(eq(tickets.orderId, order.id));

  return {
    status: "paid" as const,
    seats: orderTickets.map((t) => t.seatId),
    total: order.amountCents,
  };
}

/**
 * Real tickets for the logged-in buyer, grouped by order (one card
 * per booking, matching multiple seats bought together), joined
 * with event data. isExpired is computed from the event's real
 * starts_at, not stored anywhere. Dates/times are explicitly
 * formatted in Asia/Kolkata — without that, formatting falls back
 * to whatever timezone the server process happens to run in, which
 * silently produced a wrong displayed time earlier.
 */
export async function getMyTickets() {
  const buyerId = await requireBuyerId();

  const result: any = await db.execute(sql`
    SELECT
      t.order_id, t.seat_id, t.status, t.qr_token,
      o.amount_cents, o.created_at AS ordered_at,
      e.id AS event_id, e.title, e.venue, e.location, e.starts_at
    FROM tickets t
    JOIN orders o ON o.id = t.order_id
    JOIN events e ON e.id = t.event_id
    WHERE o.buyer_id = ${buyerId} AND o.status = 'paid'
    ORDER BY e.starts_at DESC
  `);

  const rows = result.rows ?? result;

  const grouped = new Map<string, any>();

  for (const r of rows) {
    if (!grouped.has(r.order_id)) {
      const starts = new Date(r.starts_at);

      grouped.set(r.order_id, {
        bookingId: r.order_id.slice(-10).toUpperCase(),
        eventId: r.event_id,
        title: r.title,
        location: r.location,
        venue: r.venue,
        date: starts
          .toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata",
          })
          .toUpperCase(),
        time: starts.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        }),
        seats: [] as string[],
        ticketsDetail: [] as { seatId: string; qrToken: string }[],
        total: r.amount_cents / 100,
        bookedAt: r.ordered_at,
        isExpired: starts < new Date(),
      });
    }

    grouped.get(r.order_id).seats.push(r.seat_id);
    grouped.get(r.order_id).ticketsDetail.push({
      seatId: r.seat_id,
      qrToken: r.qr_token,
    });
  }

  return Array.from(grouped.values()).map((b) => ({
    ...b,
    quantity: b.seats.length,
    price: b.total / b.seats.length,
  }));
}

export async function checkInTicket(qrToken: string) {
  await requireBuyerId();
  return checkInTicketCore(qrToken);
}