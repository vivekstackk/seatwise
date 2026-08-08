import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";

/**
 * ============================================================
 * AUTH TABLES (Better Auth manages these — schema shape is
 * fixed by the library; do not hand-edit column names).
 * ============================================================
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // role kept simple: "buyer" | "organizer". No organizer UI exists yet
  // (see frontend handoff gap #1) — column exists so we don't have to
  // migrate again once that UI is built.
  role: text("role").notNull().default("buyer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * ============================================================
 * EVENTS
 * ------------------------------------------------------------
 * Deviation from the original SRS, made explicitly (see Section
 * 4 addendum): no per-seat price tiers, no organizer-built
 * sections. One flat price per event, fixed seat grid — this
 * matches the frontend exactly as built. Sections/tiers are a
 * real scope gap to revisit if the organizer flow gets built.
 *
 * `id` is the human slug ("after-dark") already used as the
 * route param in the frontend — kept as-is rather than adding
 * a separate numeric id, to avoid touching routing.
 * ============================================================
 */
export const events = pgTable("events", {
  id: text("id").primaryKey(), // slug, e.g. "after-dark"
  number: text("number").notNull(), // display order, e.g. "01"
  title: text("title").notNull(),
  category: text("category").notNull(),
  // FIX vs. original frontend: "14 AUG" (no year) cannot be sorted,
  // cannot be checked for "is this event in the past", and breaks
  // the moment you cross a year boundary. Real timestamp now.
  startsAt: timestamp("starts_at").notNull(),
  location: text("location").notNull(),
  venue: text("venue").notNull(),
  image: text("image"),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  // organizer_id is nullable because no organizer UI exists yet.
  // Seeded events will have this null. Once an organizer flow
  // exists, this becomes NOT NULL for new events.
  organizerId: text("organizer_id").references(() => user.id),
  status: text("status").notNull().default("published"), // draft | published
  // Fixed grid dimensions, per event, so different events could
  // eventually have different sized grids without a schema change.
  seatRows: integer("seat_rows").notNull().default(8),
  seatsPerRow: integer("seats_per_row").notNull().default(10),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * ============================================================
 * SEAT HOLDS — the concurrency backbone (Section 4.1 / 4.2)
 * ------------------------------------------------------------
 * seatId is a string like "A3" (row letter + seat number),
 * matching the frontend's existing seat identifiers exactly —
 * no seats table needed, since grid bounds are validated in
 * app code against events.seatRows / events.seatsPerRow.
 *
 * The UNIQUE index on (event_id, seat_id) is what makes the
 * per-seat SAVEPOINT pattern work: a second concurrent insert
 * for the same seat fails with 23505, which the app code catches
 * and reports as a conflict rather than losing the whole batch.
 * ============================================================
 */
export const seatHolds = pgTable(
  "seat_holds",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    seatId: text("seat_id").notNull(), // e.g. "A3"
    buyerId: text("buyer_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Active-hold uniqueness per seat per event. App code deletes
    // expired rows for this seat before inserting (see Section 4.1),
    // so this constraint only ever blocks a truly concurrent hold.
    eventSeatUnique: uniqueIndex("seat_holds_event_seat_unique").on(
      table.eventId,
      table.seatId
    ),
  })
);

/**
 * HOLD HISTORY — abuse/griefing guard (Section 4.5).
 * Every hold attempt is logged here regardless of outcome, so a
 * buyer repeatedly holding-and-abandoning seats can be rate-limited
 * without any new infrastructure (reuses NFR-7 auditability data).
 */
export const holdHistory = pgTable("hold_history", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  seatId: text("seat_id").notNull(),
  buyerId: text("buyer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  releasedAt: timestamp("released_at"), // set on expiry, cancel, or purchase
});

/**
 * ============================================================
 * ORDERS + TICKETS
 * ============================================================
 */
export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  buyerId: text("buyer_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeSessionId: text("stripe_session_id").unique(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull().default("pending"), // pending | paid | failed
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  seatId: text("seat_id").notNull(),
  qrToken: text("qr_token").notNull().unique(), // signed, server-generated
  status: text("status").notNull().default("valid"), // valid | used | cancelled
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
