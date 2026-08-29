/**
 * IST <-> naive-timestamp conversion for organizer forms.
 *
 * events.starts_at is a `timestamp` with no zone whose digits are the
 * UTC equivalent of the show time (the seed writes 14:30 for an 8:00 PM
 * IST show). A <input type="datetime-local"> hands back a *naive* string
 * like "2026-08-14T20:00" with no offset at all, and `new Date()` on
 * that applies whatever timezone the browser or server happens to be
 * in. On a UTC host — which is what Render runs — an organizer entering
 * 8:00 PM would have created a 1:30 AM show.
 *
 * SeatWise is single-market (IND / 2026 all over the UI), so the input
 * is defined to mean IST and the offset is applied explicitly.
 */
const IST_OFFSET = "+05:30";
const IST = "Asia/Kolkata";

/** "2026-08-14T20:00" (meant as IST) -> the real instant. */
export function istInputToDate(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/.exec(
    value.trim()
  );
  if (!match) return null;

  const parsed = new Date(
    `${match[1]}T${match[2]}${match[3] ?? ":00"}${IST_OFFSET}`
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** The inverse, for pre-filling an edit form: instant -> "2026-08-14T20:00". */
export function dateToIstInput(date: Date): string {
  // en-CA gives ISO-ordered date parts, which is the only locale detail
  // that matters here; the zone is what's being pinned.
  const day = date.toLocaleDateString("en-CA", { timeZone: IST });

  const time = date.toLocaleTimeString("en-GB", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${day}T${time}`;
}
