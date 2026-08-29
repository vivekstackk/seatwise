import { getPublishedEvents } from "@/lib/db/events";
import EventsBrowser from "./EventsBrowser";

// Seat availability and organizer publishing both change under us, so a
// cached listing would show stale inventory. This page is cheap — one
// indexed query — so it renders per request.
export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getPublishedEvents();

  return <EventsBrowser events={events} />;
}
