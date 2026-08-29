import { asc, eq } from "drizzle-orm";
import { db } from "./index";
import { events } from "./schema";

/**
 * Read model for events.
 *
 * Before this file existed the app had three separate copies of the
 * event list: a hardcoded array inside src/app/events/page.tsx, another
 * in src/app/data/events.ts, and the real rows in Postgres that
 * `npm run db:seed` writes. The UI read the arrays and only the
 * checkout path read the database, so an event's price or date could be
 * displayed as one value and charged as another, and organizer-created
 * events could never appear at all. Everything now reads from Postgres.
 *
 * All display formatting is pinned to Asia/Kolkata on purpose. starts_at
 * is a `timestamp` (no zone) holding UTC-equivalent digits; Drizzle's
 * typed reads correctly hand that back as a real instant, but any
 * *formatting* without an explicit timeZone would render in whatever
 * timezone the server process happens to run in — which is how the same
 * build showed 8:00 PM locally and 2:30 PM in production before.
 */
const IST = "Asia/Kolkata";

export type EventView = {
  id: string;
  number: string;
  title: string;
  category: string;
  startsAt: Date;
  /** "14 AUG" — the compact form the cards and drawer use. */
  date: string;
  /** "08:00 PM" */
  time: string;
  /** "14 August 2026" */
  fullDate: string;
  location: string;
  venue: string;
  image: string;
  description: string;
  /** Authoritative minor-unit price. Checkout must use this, never `price`. */
  priceCents: number;
  /** Rupees, for display only. */
  price: number;
  seatRows: number;
  seatsPerRow: number;
  status: string;
  organizerId: string | null;
  isPast: boolean;
};

type EventRow = typeof events.$inferSelect;

export function toEventView(row: EventRow): EventView {
  const startsAt = row.startsAt;

  return {
    id: row.id,
    number: row.number,
    title: row.title,
    category: row.category,
    startsAt,
    date: startsAt
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        timeZone: IST,
      })
      .toUpperCase(),
    time: startsAt
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        timeZone: IST,
      })
      .toUpperCase(),
    fullDate: startsAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: IST,
    }),
    location: row.location,
    venue: row.venue,
    image: row.image ?? "/events/img-1.png",
    description: row.description ?? "",
    priceCents: row.priceCents,
    price: row.priceCents / 100,
    seatRows: row.seatRows,
    seatsPerRow: row.seatsPerRow,
    status: row.status,
    organizerId: row.organizerId,
    isPast: startsAt.getTime() < Date.now(),
  };
}

/** Everything a buyer is allowed to see, in display order. */
export async function getPublishedEvents(): Promise<EventView[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.status, "published"))
    .orderBy(asc(events.number));

  return rows.map(toEventView);
}

/**
 * A single event for the detail page. Draft events are excluded: an
 * unpublished event must not be bookable just because someone knows or
 * guesses its slug.
 */
export async function getPublishedEventById(
  id: string
): Promise<EventView | null> {
  const [row] = await db
    .select()
    .from(events)
    .where(eq(events.id, id));

  if (!row || row.status !== "published") return null;

  return toEventView(row);
}

/** Includes drafts — for the organizer's own dashboard only. */
export async function getEventsByOrganizer(
  organizerId: string
): Promise<EventView[]> {
  const rows = await db
    .select()
    .from(events)
    .where(eq(events.organizerId, organizerId))
    .orderBy(asc(events.number));

  return rows.map(toEventView);
}

export async function getEventByIdIncludingDrafts(
  id: string
): Promise<EventView | null> {
  const [row] = await db.select().from(events).where(eq(events.id, id));
  return row ? toEventView(row) : null;
}
