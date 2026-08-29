import { NextRequest } from "next/server";
import { getHeldOrSoldSeats } from "@/lib/db/holds";

export const runtime = "nodejs";
// A streaming response must never be collected into a static/cached
// payload — without this Next can try to prerender the route at build
// time and the stream never opens.
export const dynamic = "force-dynamic";

/**
 * Live seat status stream (Phase 4).
 *
 * PATH MATTERS: this must stay under /api/. TicketDrawer opens
 * `/api/events/${id}/stream`, and this file previously lived at
 * src/app/events/[id]/stream/route.ts — i.e. /events/[id]/stream. The
 * mismatch meant every EventSource connection 404'd, EventSource
 * swallowed it into its silent auto-reconnect loop, and live seat
 * updates simply never worked while looking like they were "connected".
 *
 * Not a true database subscription: Neon's HTTP driver has no
 * LISTEN/NOTIFY, so this polls Postgres every 2s server-side and pushes
 * only when the seat set actually changes. Deliberate substitution for
 * the "seats update within 3 seconds" requirement, not an oversight.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const timers: ReturnType<typeof setInterval>[] = [];

      // Single teardown path. The previous version cleared its intervals
      // only from the abort listener, so a client that vanished without
      // a clean abort left both timers polling the database forever.
      const shutdown = () => {
        if (closed) return;
        closed = true;
        for (const timer of timers) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime — nothing to do.
        }
      };

      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          shutdown();
        }
      };

      const sendSeats = (seats: string[]) =>
        write(`event: seats\ndata: ${JSON.stringify(seats)}\n\n`);

      let lastSerialized = "";

      // Immediate snapshot on connect — don't make the client wait a
      // full poll tick to find out which seats are already gone.
      try {
        const seats = await getHeldOrSoldSeats(eventId);
        lastSerialized = JSON.stringify(seats);
        sendSeats(seats);
      } catch (err) {
        console.error("SSE initial fetch failed:", err);
      }

      timers.push(
        setInterval(async () => {
          if (closed) return;
          try {
            const seats = await getHeldOrSoldSeats(eventId);
            const serialized = JSON.stringify(seats);
            if (serialized !== lastSerialized) {
              lastSerialized = serialized;
              sendSeats(seats);
            }
          } catch (err) {
            console.error("SSE poll failed:", err);
          }
        }, 2000)
      );

      // Keeps idle proxies and browsers from silently dropping the
      // connection during quiet periods.
      timers.push(setInterval(() => write(`: heartbeat\n\n`), 15000));

      req.signal.addEventListener("abort", shutdown);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Render/nginx-style reverse proxies buffer responses by default,
      // which holds every event back until the buffer fills — the stream
      // looks dead in production while working locally.
      "X-Accel-Buffering": "no",
    },
  });
}
