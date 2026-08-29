import QRCode from "qrcode";

/**
 * Ticket QR rendering.
 *
 * The confirmation drawer and My Tickets both used to draw a decorative
 * 10x10 grid of empty <i> elements — it looked like a QR code and
 * carried no data at all, so a ticket could never actually be scanned.
 * These render the real `tickets.qr_token` (HMAC-SHA256, signed with
 * TICKET_SIGNING_SECRET when the webhook mints the ticket).
 *
 * The payload is the bare token, deliberately not a check-in URL: a
 * ticket PDF is downloaded once and kept for weeks, so embedding a
 * hostname would bake "localhost:3000" or a since-changed Render domain
 * into it permanently. /checkin accepts a bare token, and its scanner
 * also tolerates a URL carrying ?token= in case that ever changes.
 *
 * Rendered server-side into a data URL: it keeps the QR library out of
 * the client bundle, and an <img src="data:..."> is what html2canvas
 * (used by the My Tickets PDF download) captures most reliably.
 */
export async function ticketQrDataUrl(token: string): Promise<string> {
  return QRCode.toDataURL(token, {
    errorCorrectionLevel: "M",
    // A tight quiet zone — the ticket card supplies its own padding.
    margin: 1,
    width: 320,
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}

/** Same, for a batch of tokens, preserving order. */
export async function ticketQrDataUrls(tokens: string[]): Promise<string[]> {
  return Promise.all(tokens.map(ticketQrDataUrl));
}
