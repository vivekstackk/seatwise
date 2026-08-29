"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, orders, tickets } from "@/lib/db/schema";
import { istInputToDate } from "@/lib/istTime";
import { EVENT_CATEGORIES } from "@/lib/eventCategories";
import { getEventsByOrganizer, toEventView, type EventView } from "@/lib/db/events";

/**
 * Organizer event management — the "no organizer UI" gap from the
 * handoff notes.
 *
 * Everything here is scoped by organizer_id: an organizer can only read
 * or write their own events. The seeded demo events have a null
 * organizer_id and are therefore not editable by anyone through this
 * surface, which is deliberate — they're fixtures, not someone's
 * inventory.
 */
const ORGANIZER_ROLES = new Set(["organizer", "admin"]);

/** See the same helper in seats.ts — a rejected request must not read as a crash. */
async function currentSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    console.error("Session lookup failed:", err);
    return null;
  }
}

async function requireOrganizerId(): Promise<string> {
  const session = await currentSession();

  if (!session) {
    throw new Error("Not signed in");
  }

  const role = (session.user as { role?: string }).role ?? "buyer";

  if (!ORGANIZER_ROLES.has(role)) {
    throw new Error(
      "Not authorised: an organizer account is required to manage events"
    );
  }

  return session.user.id;
}

export async function getOrganizerAccess() {
  const session = await currentSession();

  if (!session) return { allowed: false as const, reason: "signed_out" as const };

  const role = (session.user as { role?: string }).role ?? "buyer";

  if (!ORGANIZER_ROLES.has(role)) {
    return { allowed: false as const, reason: "not_organizer" as const, role };
  }

  return {
    allowed: true as const,
    role,
    id: session.user.id,
    name: session.user.name,
  };
}

export type EventInput = {
  title: string;
  category: string;
  /** "2026-08-14T20:00", read as IST. */
  startsAtLocal: string;
  location: string;
  venue: string;
  image: string;
  description: string;
  /** Rupees, as typed. Converted to minor units before storage. */
  priceRupees: number;
  seatRows: number;
  seatsPerRow: number;
  status: "draft" | "published";
};

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function validate(input: EventInput): string | null {
  if (!input.title.trim()) return "Title is required.";
  if (!EVENT_CATEGORIES.includes(input.category as (typeof EVENT_CATEGORIES)[number])) {
    return `Category must be one of: ${EVENT_CATEGORIES.join(", ")}.`;
  }
  if (!input.location.trim()) return "Location is required.";
  if (!input.venue.trim()) return "Venue is required.";

  const startsAt = istInputToDate(input.startsAtLocal);
  if (!startsAt) return "Start date and time is required.";

  if (!Number.isFinite(input.priceRupees) || input.priceRupees < 0) {
    return "Price must be zero or more.";
  }
  // Stripe rejects amounts below its per-currency minimum, and a ₹0
  // "purchase" would create a checkout session that can never complete.
  if (input.priceRupees > 0 && input.priceRupees < 50) {
    return "Price must be at least ₹50 (Stripe's minimum charge for INR).";
  }
  if (!Number.isInteger(input.seatRows) || input.seatRows < 1 || input.seatRows > 26) {
    return "Rows must be a whole number between 1 and 26.";
  }
  if (
    !Number.isInteger(input.seatsPerRow) ||
    input.seatsPerRow < 1 ||
    input.seatsPerRow > 20
  ) {
    return "Seats per row must be a whole number between 1 and 20.";
  }
  if (input.status === "published" && startsAt.getTime() < Date.now()) {
    return "An event in the past can't be published.";
  }

  return null;
}

/** Unique slug for events.id, which is the public route param. */
async function allocateSlug(title: string): Promise<string> {
  const base = slugify(title) || "event";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;

    const [existing] = await db
      .select({ id: events.id })
      .from(events)
      .where(eq(events.id, candidate));

    if (!existing) return candidate;
  }

  // Fall back to something that cannot collide rather than looping.
  return `${base}-${Date.now().toString(36)}`;
}

/** Next display number ("01", "02", …) across all events. */
async function nextEventNumber(): Promise<string> {
  const [row] = await db
    .select({
      highest: sql<number>`coalesce(max(nullif(regexp_replace(${events.number}, '\\D', '', 'g'), '')::int), 0)`,
    })
    .from(events);

  return String((row?.highest ?? 0) + 1).padStart(2, "0");
}

export async function createEvent(input: EventInput): Promise<ActionResult> {
  const organizerId = await requireOrganizerId();

  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const startsAt = istInputToDate(input.startsAtLocal)!;
  const id = await allocateSlug(input.title);

  await db.insert(events).values({
    id,
    number: await nextEventNumber(),
    title: input.title.trim(),
    category: input.category,
    startsAt,
    location: input.location.trim(),
    venue: input.venue.trim(),
    image: input.image.trim() || null,
    description: input.description.trim() || null,
    priceCents: Math.round(input.priceRupees * 100),
    organizerId,
    status: input.status,
    seatRows: input.seatRows,
    seatsPerRow: input.seatsPerRow,
  });

  revalidatePath("/events");
  revalidatePath("/organizer");

  return { ok: true, id };
}

export async function updateEvent(
  id: string,
  input: EventInput
): Promise<ActionResult> {
  const organizerId = await requireOrganizerId();

  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const [owned] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  if (!owned) {
    return { ok: false, error: "That event doesn't exist, or isn't yours." };
  }

  const sold = await soldSeatCount(id);

  // Seats already in someone's hands are addressed as "C7". Shrinking
  // the grid under them would leave a paid ticket pointing at a seat
  // that no longer exists on the map.
  const [current] = await db
    .select({ seatRows: events.seatRows, seatsPerRow: events.seatsPerRow })
    .from(events)
    .where(eq(events.id, id));

  if (
    sold > 0 &&
    (input.seatRows < current.seatRows ||
      input.seatsPerRow < current.seatsPerRow)
  ) {
    return {
      ok: false,
      error: `${sold} seat(s) are already sold — the grid can be enlarged but not shrunk.`,
    };
  }

  await db
    .update(events)
    .set({
      title: input.title.trim(),
      category: input.category,
      startsAt: istInputToDate(input.startsAtLocal)!,
      location: input.location.trim(),
      venue: input.venue.trim(),
      image: input.image.trim() || null,
      description: input.description.trim() || null,
      priceCents: Math.round(input.priceRupees * 100),
      status: input.status,
      seatRows: input.seatRows,
      seatsPerRow: input.seatsPerRow,
    })
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/organizer");

  return { ok: true, id };
}

async function soldSeatCount(eventId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(tickets)
    .where(eq(tickets.eventId, eventId));

  return Number(row?.total ?? 0);
}

export async function setEventStatus(
  id: string,
  status: "draft" | "published"
): Promise<ActionResult> {
  const organizerId = await requireOrganizerId();

  const [event] = await db
    .select({ startsAt: events.startsAt })
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  if (!event) {
    return { ok: false, error: "That event doesn't exist, or isn't yours." };
  }

  if (status === "published" && event.startsAt.getTime() < Date.now()) {
    return { ok: false, error: "An event in the past can't be published." };
  }

  await db
    .update(events)
    .set({ status })
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  revalidatePath("/events");
  revalidatePath(`/events/${id}`);
  revalidatePath("/organizer");

  return { ok: true, id };
}

/**
 * Deleting an event cascades to holds, orders and tickets, so it is
 * refused outright once anything has been sold — a buyer's ticket
 * disappearing is not something an organizer should be able to do by
 * clicking "delete". Unpublishing is the reversible alternative.
 */
export async function deleteEvent(id: string): Promise<ActionResult> {
  const organizerId = await requireOrganizerId();

  const [owned] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  if (!owned) {
    return { ok: false, error: "That event doesn't exist, or isn't yours." };
  }

  const sold = await soldSeatCount(id);

  if (sold > 0) {
    return {
      ok: false,
      error: `${sold} ticket(s) have been sold — unpublish it instead of deleting it.`,
    };
  }

  await db
    .delete(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  revalidatePath("/events");
  revalidatePath("/organizer");

  return { ok: true, id };
}

export type OrganizerEventRow = EventView & {
  capacity: number;
  sold: number;
  revenueRupees: number;
};

/** Dashboard list: the organizer's own events, drafts included. */
export async function listMyEvents(): Promise<OrganizerEventRow[]> {
  const organizerId = await requireOrganizerId();

  const mine = await getEventsByOrganizer(organizerId);

  if (mine.length === 0) return [];

  const soldRows = await db
    .select({
      eventId: tickets.eventId,
      sold: count(),
    })
    .from(tickets)
    .groupBy(tickets.eventId);

  const revenueRows = await db
    .select({
      eventId: orders.eventId,
      revenue: sql<number>`coalesce(sum(${orders.amountCents}), 0)`,
    })
    .from(orders)
    .where(eq(orders.status, "paid"))
    .groupBy(orders.eventId);

  const soldByEvent = new Map(
    soldRows.map((r) => [r.eventId, Number(r.sold)])
  );
  const revenueByEvent = new Map(
    revenueRows.map((r) => [r.eventId, Number(r.revenue)])
  );

  return mine.map((event) => ({
    ...event,
    capacity: event.seatRows * event.seatsPerRow,
    sold: soldByEvent.get(event.id) ?? 0,
    revenueRupees: (revenueByEvent.get(event.id) ?? 0) / 100,
  }));
}

/** One of the organizer's own events, for the edit form. */
export async function getMyEvent(id: string): Promise<OrganizerEventRow | null> {
  const organizerId = await requireOrganizerId();

  const [row] = await db
    .select()
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  if (!row) return null;

  const view = toEventView(row);
  const sold = await soldSeatCount(id);

  const [revenueRow] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.amountCents}), 0)`,
    })
    .from(orders)
    .where(and(eq(orders.eventId, id), eq(orders.status, "paid")));

  return {
    ...view,
    capacity: view.seatRows * view.seatsPerRow,
    sold,
    revenueRupees: Number(revenueRow?.revenue ?? 0) / 100,
  };
}

/** Seat-by-seat manifest for the gate, newest order first. */
export async function getEventManifest(id: string) {
  const organizerId = await requireOrganizerId();

  const [owned] = await db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, id), eq(events.organizerId, organizerId)));

  if (!owned) return [];

  const rows = await db
    .select({
      seatId: tickets.seatId,
      status: tickets.status,
      orderId: tickets.orderId,
      amountCents: orders.amountCents,
      orderedAt: orders.createdAt,
    })
    .from(tickets)
    .innerJoin(orders, eq(orders.id, tickets.orderId))
    .where(eq(tickets.eventId, id))
    .orderBy(desc(orders.createdAt));

  // orders.amount_cents is the whole basket, so a 3-seat booking would
  // otherwise show its full total against each of the three seats.
  const seatsPerOrder = new Map<string, number>();
  for (const r of rows) {
    seatsPerOrder.set(r.orderId, (seatsPerOrder.get(r.orderId) ?? 0) + 1);
  }

  return rows.map((r) => ({
    seatId: r.seatId,
    status: r.status,
    bookingId: r.orderId.slice(-10).toUpperCase(),
    amountRupees:
      r.amountCents / 100 / Math.max(1, seatsPerOrder.get(r.orderId) ?? 1),
    orderedAt: r.orderedAt,
  }));
}
