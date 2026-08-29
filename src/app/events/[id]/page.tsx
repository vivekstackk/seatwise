import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedEventById } from "@/lib/db/events";
import TicketDrawer from "../../components/TicketDrawer";

// Seat availability is live, so this page must not be cached.
export const dynamic = "force-dynamic";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await getPublishedEventById(id);

  if (!event) {
    notFound();
  }

  return (
    <main className="event-detail">
      <div className="event-detail__top">
        <span>
          {event.number} / {event.category.toUpperCase()}
        </span>

        <Link href="/events" className="event-detail__back">
          ← BACK TO EVENTS
        </Link>

        <span>IND / 2026</span>
      </div>

      <section className="event-detail__hero">
        <img
          src={event.image}
          alt={event.title}
          className="event-detail__image"
        />

        <div className="event-detail__content">
          <h1>
            {event.title}
            <span>.</span>
          </h1>

          <div className="event-detail__meta">
            <div>
              <small>DATE</small>
              <strong>{event.date}</strong>
            </div>

            <div>
              <small>LOCATION</small>
              <strong>{event.location}</strong>
            </div>

            <div>
              <small>VENUE</small>
              <strong>{event.venue}</strong>
            </div>
          </div>
        </div>

        <div className="event-detail__info">
          <div className="event-detail__about">
            <small>ABOUT</small>

            <p>{event.description}</p>
          </div>

          <div className="event-detail__details">
            <small>DETAILS</small>

            <p>
              {event.fullDate} / {event.time}
              <br />
              {event.venue}
              <br />
              {event.location}
            </p>
          </div>

          <div className="event-detail__price">
            <small>FROM</small>

            <strong>₹{event.price.toLocaleString("en-IN")}</strong>
          </div>

          {event.isPast ? (
            <p className="event-detail__closed">
              THIS EVENT HAS ENDED — BOOKING CLOSED
            </p>
          ) : (
            <TicketDrawer
              event={{
                id: event.id,
                number: event.number,
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location,
                venue: event.venue,
                price: event.price,
                seatRows: event.seatRows,
                seatsPerRow: event.seatsPerRow,
              }}
            />
          )}
        </div>
      </section>
    </main>
  );
}
