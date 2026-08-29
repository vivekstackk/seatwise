import { sql } from "drizzle-orm";
import { db } from "./index";
import { randomUUID } from "crypto";

export type HoldResult = {
  held: string[];
  conflicts: string[];
  capExceeded: boolean;
};

/**
 * `db.execute` is typed loosely because the neon-http driver returns
 * either `{ rows }` or a bare array depending on the statement. One
 * narrowing helper keeps that shape guess in a single place instead of
 * an `any` at every call site.
 */
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** Postgres surfaces the SQLSTATE at `err.cause.code` through neon-http. */
function pgErrorCode(err: unknown): string | undefined {
  const direct = (err as { code?: unknown })?.code;
  if (typeof direct === "string") return direct;

  const nested = (err as { cause?: { code?: unknown } })?.cause?.code;
  return typeof nested === "string" ? nested : undefined;
}

export async function holdSeatsCore(
  eventId: string,
  seatIds: string[],
  buyerId: string
): Promise<HoldResult> {
  const held: string[] = [];
  const conflicts: string[] = [];
  let capExceeded = false;

  for (const seatId of seatIds) {
    if (capExceeded) {
      conflicts.push(seatId);
      continue;
    }

    const holdId = randomUUID();

    try {
      const result = await db.execute(sql`
        WITH cleanup AS (
          DELETE FROM seat_holds
          WHERE event_id = ${eventId}
            AND seat_id = ${seatId}
            AND expires_at < now()
        )
        INSERT INTO seat_holds (id, event_id, seat_id, buyer_id, expires_at)
        VALUES (${holdId}, ${eventId}, ${seatId}, ${buyerId}, now() + interval '10 minutes')
        ON CONFLICT (event_id, seat_id) DO NOTHING
        RETURNING id
      `);

      const rows = rowsOf<{ id: string }>(result);

      if (rows.length > 0) {
        held.push(seatId);
        await db.execute(sql`
          INSERT INTO hold_history (id, event_id, seat_id, buyer_id)
          VALUES (${randomUUID()}, ${eventId}, ${seatId}, ${buyerId})
        `);
      } else {
        conflicts.push(seatId);
      }
    } catch (err: unknown) {
      if (pgErrorCode(err) === "P0001") {
        capExceeded = true;
        conflicts.push(seatId);
      } else {
        throw err;
      }
    }
  }

  return { held, conflicts, capExceeded };
}

export async function releaseSeatCore(
  eventId: string,
  seatId: string,
  buyerId: string
): Promise<void> {
  await db.execute(sql`
    DELETE FROM seat_holds
    WHERE event_id = ${eventId} AND seat_id = ${seatId} AND buyer_id = ${buyerId}
  `);

  await db.execute(sql`
    UPDATE hold_history
    SET released_at = now()
    WHERE event_id = ${eventId} AND seat_id = ${seatId}
      AND buyer_id = ${buyerId} AND released_at IS NULL
  `);
}

export async function getHeldOrSoldSeats(eventId: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT seat_id FROM seat_holds
    WHERE event_id = ${eventId} AND expires_at > now()
    UNION
    SELECT seat_id FROM tickets
    WHERE event_id = ${eventId} AND status = 'valid'
  `);

  return rowsOf<{ seat_id: string }>(result).map((r) => r.seat_id);
}

export async function getActiveHoldsForBuyer(
  eventId: string,
  buyerId: string
): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT seat_id FROM seat_holds
    WHERE event_id = ${eventId} AND buyer_id = ${buyerId} AND expires_at > now()
  `);

  return rowsOf<{ seat_id: string }>(result).map((r) => r.seat_id);
}

export type CheckInResult =
  | { status: "valid"; seatId: string; eventTitle: string }
  | { status: "already_used"; seatId: string; usedAt: Date | null }
  | { status: "cancelled"; seatId: string }
  | { status: "not_found" };

/**
 * `used_at` comes back from db.execute as a bare string ("2026-08-28
 * 12:30:00") because timestamp columns carry no zone. `new Date()` on
 * that string is parsed as *local* time by V8, which shifts the
 * displayed check-in time by the server's UTC offset. The digits are
 * UTC, so say so explicitly.
 */
function parseUtcTimestamp(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value !== "string" || value === "") return null;

  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;

  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function checkInTicketCore(
  qrToken: string
): Promise<CheckInResult> {
  const result = await db.execute(sql`
    UPDATE tickets
    SET status = 'used', used_at = now()
    WHERE qr_token = ${qrToken} AND status = 'valid'
    RETURNING seat_id, event_id
  `);

  const rows = rowsOf<{ seat_id: string; event_id: string }>(result);

  if (rows.length > 0) {
    const eventResult = await db.execute(sql`
      SELECT title FROM events WHERE id = ${rows[0].event_id}
    `);
    const eventRows = rowsOf<{ title: string }>(eventResult);

    return {
      status: "valid",
      seatId: rows[0].seat_id,
      eventTitle: eventRows[0]?.title ?? "Unknown event",
    };
  }

  const existing = await db.execute(sql`
    SELECT seat_id, status, used_at FROM tickets WHERE qr_token = ${qrToken}
  `);
  const existingRows = rowsOf<{
    seat_id: string;
    status: string;
    used_at: unknown;
  }>(existing);

  if (existingRows.length === 0) {
    return { status: "not_found" };
  }

  // A refunded/voided ticket must not read as "already used" — that
  // wrongly suggests the holder already walked in.
  if (existingRows[0].status === "cancelled") {
    return { status: "cancelled", seatId: existingRows[0].seat_id };
  }

  return {
    status: "already_used",
    seatId: existingRows[0].seat_id,
    usedAt: parseUtcTimestamp(existingRows[0].used_at),
  };
}