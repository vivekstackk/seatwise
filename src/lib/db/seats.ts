"use server";

import { headers } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { getAppOrigin } from "@/lib/appUrl";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { events, orders, tickets } from "@/lib/db/schema";
import { ticketQrDataUrl } from "@/lib/qr";
import { compareSeatIds, isValidSeatId } from "@/lib/seatGrid";
import {
  holdSeatsCore,
  releaseSeatCore,
  getHeldOrSoldSeats,
  getActiveHoldsForBuyer,
  checkInTicketCore,
} from "@/lib/db/holds";

/**
 * Better Auth throws rather than returning null when the request is
 * rejected before the session is even looked at — a mismatched origin
 * being the common case. Left unhandled that surfaced as "Something went
 * wrong holding that seat", which points the user at the seat map when
 * the actual problem is that they are not authenticated. Failing closed
 * to "no session" sends them to /login, which is both true and
 * actionable; the cause is still logged for the server operator.
 */
async function currentSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    console.error("Session lookup failed:", err);
    return null;
  }
}

async function requireBuyerId(): Promise<string> {
  const session = await currentSession();
  if (!session) {
    throw new Error("Not signed in");
  }
  return session.user.id;
}

/**
 * Check-in is a gate-staff action, not a buyer action. Previously any
 * signed-in account could burn any ticket it knew the token for, which
 * made the whole "used once" guarantee decorative. Roles are set out of
 * band with `npm run set-role` — there is deliberately no self-service
 * promotion endpoint.
 */
const STAFF_ROLES = new Set(["organizer", "staff", "admin"]);

async function requireStaff(): Promise<{ id: string; role: string }> {
  const session = await currentSession();
  if (!session) {
    throw new Error("Not signed in");
  }

  const role = (session.user as { role?: string }).role ?? "buyer";

  if (!STAFF_ROLES.has(role)) {
    throw new Error("Not authorised: check-in requires a staff account");
  }

  return { id: session.user.id, role };
}

export async function holdSeats(eventId: string, seatIds: string[]) {
  const buyerId = await requireBuyerId();

  // Server actions are a public HTTP surface. Without this a crafted
  // request could hold a seat that doesn't exist in the grid ("Z99"),
  // which then reads back as unavailable to every genuine buyer and can
  // never be released by clicking it.
  const [event] = await db
    .select({
      status: events.status,
      seatRows: events.seatRows,
      seatsPerRow: events.seatsPerRow,
      startsAt: events.startsAt,
    })
    .from(events)
    .where(eq(events.id, eventId));

  if (!event || event.status !== "published") {
    throw new Error("Event not available for booking");
  }

  if (event.startsAt.getTime() < Date.now()) {
    throw new Error("This event has already started");
  }

  const invalid = seatIds.filter(
    (seatId) => !isValidSeatId(seatId, event.seatRows, event.seatsPerRow)
  );

  if (invalid.length > 0) {
    throw new Error(`Seat outside this event's map: ${invalid.join(", ")}`);
  }

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
    success_url: `${getAppOrigin()}/events/${eventId}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getAppOrigin()}/events/${eventId}?payment=cancelled`,
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

  const sorted = [...orderTickets].sort((a, b) =>
    compareSeatIds(a.seatId, b.seatId)
  );

  return {
    status: "paid" as const,
    seats: sorted.map((t) => t.seatId),
    total: order.amountCents,
    // Real, scannable codes for the confirmation view — one per seat.
    ticketsDetail: await Promise.all(
      sorted.map(async (t) => ({
        seatId: t.seatId,
        qrDataUrl: await ticketQrDataUrl(t.qrToken),
      }))
    ),
  };
}

/**
 * Real tickets for the logged-in buyer, grouped by order (one card per
 * booking, matching multiple seats bought together), joined with event
 * data. isExpired is computed from the event's real starts_at, not
 * stored anywhere.
 *
 * This deliberately uses Drizzle's *typed* select rather than
 * db.execute. starts_at is a `timestamp` column, so raw SQL hands back
 * the bare string "2026-08-14 14:30:00" — and `new Date(...)` on that
 * string is parsed as *local* time by V8, so on an IST machine the
 * 8:00 PM show rendered as 02:30 PM. Drizzle's typed reader treats the
 * same digits as UTC and returns the correct instant; the explicit
 * Asia/Kolkata timeZone below then pins the display regardless of what
 * timezone the server process runs in.
 */
export async function getMyTickets() {
  const buyerId = await requireBuyerId();

  const rows = await db
    .select({
      orderId: tickets.orderId,
      seatId: tickets.seatId,
      ticketStatus: tickets.status,
      qrToken: tickets.qrToken,
      amountCents: orders.amountCents,
      orderedAt: orders.createdAt,
      eventId: events.id,
      title: events.title,
      venue: events.venue,
      location: events.location,
      image: events.image,
      startsAt: events.startsAt,
    })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(and(eq(orders.buyerId, buyerId), eq(orders.status, "paid")))
    .orderBy(desc(events.startsAt));

  type Booking = {
    bookingId: string;
    eventId: string;
    title: string;
    location: string;
    venue: string;
    image: string;
    date: string;
    time: string;
    seats: string[];
    ticketsDetail: {
      seatId: string;
      status: string;
      qrDataUrl: string;
    }[];
    total: number;
    bookedAt: Date;
    isExpired: boolean;
  };

  const grouped = new Map<string, Booking>();

  for (const r of rows) {
    if (!grouped.has(r.orderId)) {
      grouped.set(r.orderId, {
        bookingId: r.orderId.slice(-10).toUpperCase(),
        eventId: r.eventId,
        title: r.title,
        location: r.location,
        venue: r.venue,
        image: r.image ?? "/events/img-1.png",
        date: r.startsAt
          .toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata",
          })
          .toUpperCase(),
        time: r.startsAt
          .toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
          .toUpperCase(),
        seats: [],
        ticketsDetail: [],
        total: r.amountCents / 100,
        bookedAt: r.orderedAt,
        isExpired: r.startsAt.getTime() < Date.now(),
      });
    }

    const booking = grouped.get(r.orderId)!;
    booking.seats.push(r.seatId);
    booking.ticketsDetail.push({
      seatId: r.seatId,
      status: r.ticketStatus,
      // Rendered here, on the server, so the raw token never has to be
      // printed on the page as text (it used to be, under a
      // "dev/demo only" heading — anyone glancing at a shared screen
      // could copy it and check the ticket in).
      qrDataUrl: await ticketQrDataUrl(r.qrToken),
    });
  }

  return Array.from(grouped.values()).map((b) => {
    b.seats.sort(compareSeatIds);
    b.ticketsDetail.sort((x, y) => compareSeatIds(x.seatId, y.seatId));

    return {
      ...b,
      quantity: b.seats.length,
      price: b.total / b.seats.length,
    };
  });
}

/** Gate staff only — see requireStaff above. */
export async function checkInTicket(qrToken: string) {
  await requireStaff();
  return checkInTicketCore(qrToken.trim());
}

/** Lets /checkin decide whether to render the scanner or a refusal. */
export async function getCheckInAccess() {
  const session = await currentSession();

  if (!session) return { allowed: false as const, reason: "signed_out" as const };

  const role = (session.user as { role?: string }).role ?? "buyer";

  if (!STAFF_ROLES.has(role)) {
    return { allowed: false as const, reason: "not_staff" as const, role };
  }

  return { allowed: true as const, role, name: session.user.name };
}