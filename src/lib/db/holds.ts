import { sql } from "drizzle-orm";
import { db } from "./index";
import { randomUUID } from "crypto";

export type HoldResult = {
  held: string[];
  conflicts: string[];
  capExceeded: boolean;
};

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
      const result: any = await db.execute(sql`
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

      const rows = result.rows ?? result;

      if (Array.isArray(rows) && rows.length > 0) {
        held.push(seatId);
        await db.execute(sql`
          INSERT INTO hold_history (id, event_id, seat_id, buyer_id)
          VALUES (${randomUUID()}, ${eventId}, ${seatId}, ${buyerId})
        `);
      } else {
        conflicts.push(seatId);
      }
    } catch (err: any) {
      const pgCode = err?.cause?.code ?? err?.code;

      if (pgCode === "P0001") {
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
  const result: any = await db.execute(sql`
    SELECT seat_id FROM seat_holds
    WHERE event_id = ${eventId} AND expires_at > now()
    UNION
    SELECT seat_id FROM tickets
    WHERE event_id = ${eventId} AND status = 'valid'
  `);
  const rows = result.rows ?? result;
  return rows.map((r: any) => r.seat_id);
}

export async function getActiveHoldsForBuyer(
  eventId: string,
  buyerId: string
): Promise<string[]> {
  const result: any = await db.execute(sql`
    SELECT seat_id FROM seat_holds
    WHERE event_id = ${eventId} AND buyer_id = ${buyerId} AND expires_at > now()
  `);
  const rows = result.rows ?? result;
  return rows.map((r: any) => r.seat_id);
}

export type CheckInResult =
  | { status: "valid"; seatId: string; eventTitle: string }
  | { status: "already_used"; seatId: string; usedAt: Date }
  | { status: "not_found" };

export async function checkInTicketCore(
  qrToken: string
): Promise<CheckInResult> {
  const result: any = await db.execute(sql`
    UPDATE tickets
    SET status = 'used', used_at = now()
    WHERE qr_token = ${qrToken} AND status = 'valid'
    RETURNING seat_id, event_id
  `);

  const rows = result.rows ?? result;

  if (rows.length > 0) {
    const eventResult: any = await db.execute(sql`
      SELECT title FROM events WHERE id = ${rows[0].event_id}
    `);
    const eventRows = eventResult.rows ?? eventResult;

    return {
      status: "valid",
      seatId: rows[0].seat_id,
      eventTitle: eventRows[0]?.title ?? "Unknown event",
    };
  }

  const existing: any = await db.execute(sql`
    SELECT seat_id, used_at FROM tickets WHERE qr_token = ${qrToken}
  `);
  const existingRows = existing.rows ?? existing;

  if (existingRows.length === 0) {
    return { status: "not_found" };
  }

  return {
    status: "already_used",
    seatId: existingRows[0].seat_id,
    usedAt: existingRows[0].used_at,
  };
}