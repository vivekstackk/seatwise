import Link from "next/link";
import { notFound } from "next/navigation";
import { events } from "../../data/events";
import TicketDrawer from "../../components/TicketDrawer";

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = events.find((item) => item.id === id);

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
              {event.date} / {event.time}
              <br />
              {event.venue}
              <br />
              {event.location}
            </p>
          </div>

          <div className="event-detail__price">
            <small>FROM</small>

            <strong>
              ₹{event.price.toLocaleString("en-IN")}
            </strong>
          </div>

          <TicketDrawer
  event={{
    title: event.title,
    date: event.date,
    location: event.location,
    venue: event.venue,
    price: event.price,
  }}
/>
        </div>
      </section>
    </main>
  );
}