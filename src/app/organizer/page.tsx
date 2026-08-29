import Link from "next/link";
import { getOrganizerAccess, listMyEvents } from "@/lib/db/organizer";
import AccessDenied from "./AccessDenied";
import EventActions from "./EventActions";

// Reads the live session role and live sales figures.
export const dynamic = "force-dynamic";

export default async function OrganizerPage() {
  const access = await getOrganizerAccess();

  if (!access.allowed) {
    return <AccessDenied reason={access.reason} />;
  }

  const events = await listMyEvents();

  const totals = events.reduce(
    (acc, event) => ({
      sold: acc.sold + event.sold,
      revenue: acc.revenue + event.revenueRupees,
      live: acc.live + (event.status === "published" ? 1 : 0),
    }),
    { sold: 0, revenue: 0, live: 0 }
  );

  return (
    <main className="organizer">
      <div className="organizer__head">
        <span>SEATWISE® / ORGANIZER</span>
        <Link href="/">← HOME</Link>
      </div>

      <header className="organizer__hero">
        <h1>
          YOUR EVENTS<span>.</span>
        </h1>

        <div className="organizer__hero-meta">
          <span>{access.name?.toUpperCase() ?? "ORGANIZER"}</span>
          <Link href="/organizer/new" className="organizer__cta">
            NEW EVENT ↗
          </Link>
        </div>
      </header>

      <section className="organizer__stats">
        <div>
          <span>EVENTS</span>
          <strong>{String(events.length).padStart(2, "0")}</strong>
        </div>
        <div>
          <span>PUBLISHED</span>
          <strong>{String(totals.live).padStart(2, "0")}</strong>
        </div>
        <div>
          <span>SEATS SOLD</span>
          <strong>{totals.sold}</strong>
        </div>
        <div>
          <span>REVENUE</span>
          <strong>₹{totals.revenue.toLocaleString("en-IN")}</strong>
        </div>
      </section>

      {events.length === 0 ? (
        <section className="organizer__empty">
          <h2>
            NOTHING HERE YET<span>.</span>
          </h2>
          <p>
            The nine demo events belong to the seed data, not to an
            organizer account, so they aren&apos;t listed here. Create your
            first event to see it appear on /events the moment you publish
            it.
          </p>
          <Link href="/organizer/new" className="organizer__cta">
            CREATE YOUR FIRST EVENT ↗
          </Link>
        </section>
      ) : (
        <section className="organizer__list">
          {events.map((event) => (
            <article className="organizer-row" key={event.id}>
              <div className="organizer-row__main">
                <span className="organizer-row__number">{event.number}</span>

                <div>
                  <h2>{event.title}</h2>
                  <p>
                    {event.fullDate} / {event.time} — {event.venue},{" "}
                    {event.location}
                  </p>
                </div>
              </div>

              <div className="organizer-row__figures">
                <div>
                  <span>STATUS</span>
                  <strong
                    className={
                      event.status === "published"
                        ? "is-live"
                        : event.isPast
                          ? "is-past"
                          : "is-draft"
                    }
                  >
                    {event.isPast ? "ENDED" : event.status.toUpperCase()}
                  </strong>
                </div>

                <div>
                  <span>SOLD</span>
                  <strong>
                    {event.sold} / {event.capacity}
                  </strong>
                </div>

                <div>
                  <span>REVENUE</span>
                  <strong>₹{event.revenueRupees.toLocaleString("en-IN")}</strong>
                </div>

                <div>
                  <span>PRICE</span>
                  <strong>₹{event.price.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              <div className="organizer-row__links">
                <Link href={`/organizer/${event.id}`}>MANAGE ↗</Link>
                {event.status === "published" && (
                  <Link href={`/events/${event.id}`}>VIEW PUBLIC PAGE ↗</Link>
                )}
              </div>

              <EventActions
                id={event.id}
                status={event.status}
                sold={event.sold}
              />
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
