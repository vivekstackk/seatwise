import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventManifest,
  getMyEvent,
  getOrganizerAccess,
  type EventInput,
} from "@/lib/db/organizer";
import { dateToIstInput } from "@/lib/istTime";
import AccessDenied from "../AccessDenied";
import EventForm from "../EventForm";
import EventActions from "../EventActions";

export const dynamic = "force-dynamic";

export default async function ManageEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await getOrganizerAccess();

  if (!access.allowed) {
    return <AccessDenied reason={access.reason} />;
  }

  const { id } = await params;

  // getMyEvent is already scoped to the signed-in organizer, so someone
  // else's event slug reads as "not found" rather than "forbidden".
  const event = await getMyEvent(id);

  if (!event) {
    notFound();
  }

  const manifest = await getEventManifest(id);

  const initial: EventInput = {
    title: event.title,
    category: event.category,
    startsAtLocal: dateToIstInput(event.startsAt),
    location: event.location,
    venue: event.venue,
    image: event.image,
    description: event.description,
    priceRupees: event.priceCents / 100,
    seatRows: event.seatRows,
    seatsPerRow: event.seatsPerRow,
    status: event.status === "published" ? "published" : "draft",
  };

  return (
    <main className="organizer">
      <div className="organizer__head">
        <span>SEATWISE® / ORGANIZER</span>
        <Link href="/organizer">← YOUR EVENTS</Link>
      </div>

      <header className="organizer__hero">
        <h1>
          {event.title}
          <span>.</span>
        </h1>

        <div className="organizer__hero-meta">
          <span>
            {event.isPast ? "ENDED" : event.status.toUpperCase()} / {event.sold}{" "}
            OF {event.capacity} SEATS SOLD / ₹
            {event.revenueRupees.toLocaleString("en-IN")}
          </span>

          <EventActions
            id={event.id}
            status={event.status}
            sold={event.sold}
          />
        </div>
      </header>

      <EventForm
        mode="edit"
        eventId={event.id}
        initial={initial}
        sold={event.sold}
        minRows={event.sold > 0 ? event.seatRows : 1}
        minSeatsPerRow={event.sold > 0 ? event.seatsPerRow : 1}
      />

      <section className="organizer__manifest">
        <h2>
          SEAT MANIFEST<span>.</span>
        </h2>

        {manifest.length === 0 ? (
          <p className="organizer__muted">No seats sold yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>SEAT</th>
                <th>BOOKING</th>
                <th>STATUS</th>
                <th>PAID</th>
              </tr>
            </thead>

            <tbody>
              {manifest.map((ticket) => (
                <tr key={`${ticket.bookingId}-${ticket.seatId}`}>
                  <td>{ticket.seatId}</td>
                  <td>{ticket.bookingId}</td>
                  <td
                    className={
                      ticket.status === "used"
                        ? "is-used"
                        : ticket.status === "valid"
                          ? "is-live"
                          : "is-past"
                    }
                  >
                    {ticket.status.toUpperCase()}
                  </td>
                  <td>₹{ticket.amountRupees.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
