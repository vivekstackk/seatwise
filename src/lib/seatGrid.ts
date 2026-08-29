/**
 * Seat-grid geometry, shared by the client seat map and the server-side
 * hold validation so the two can't drift apart.
 *
 * The grid is derived from events.seat_rows / events.seats_per_row.
 * TicketDrawer used to hardcode 8 rows x 10 seats, which meant an event
 * seeded with any other dimensions rendered the wrong map — and nothing
 * on the server rejected a seat id outside the grid, so a hand-crafted
 * request could hold "Z99" forever and it would show up as unavailable
 * to every real buyer.
 */

/** ["A", "B", ... ] for `rows` rows. */
export function seatRowLabels(rows: number): string[] {
  const safeRows = Math.max(1, Math.min(26, Math.trunc(rows)));
  return Array.from({ length: safeRows }, (_, i) =>
    String.fromCharCode(65 + i)
  );
}

/** True when `seatId` ("C7") is inside a rows x seatsPerRow grid. */
export function isValidSeatId(
  seatId: string,
  rows: number,
  seatsPerRow: number
): boolean {
  const match = /^([A-Z])(\d{1,2})$/.exec(seatId);
  if (!match) return false;

  const rowIndex = match[1].charCodeAt(0) - 65;
  const seatNumber = Number(match[2]);

  return (
    rowIndex >= 0 &&
    rowIndex < rows &&
    seatNumber >= 1 &&
    seatNumber <= seatsPerRow
  );
}

/** Row-then-number ordering, so "A2" sorts before "A10" and "B1". */
export function compareSeatIds(a: string, b: string): number {
  const rowDiff = a.charCodeAt(0) - b.charCodeAt(0);
  if (rowDiff !== 0) return rowDiff;
  return Number(a.slice(1)) - Number(b.slice(1));
}
