import Link from "next/link";
import { getOrganizerAccess, type EventInput } from "@/lib/db/organizer";
import { dateToIstInput } from "@/lib/istTime";
import AccessDenied from "../AccessDenied";
import EventForm from "../EventForm";

export const dynamic = "force-dynamic";

/** Tomorrow, 8:00 PM IST — the shape almost every seeded show has. */
function defaultStart(): string {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${dateToIstInput(tomorrow).slice(0, 10)}T20:00`;
}

export default async function NewEventPage() {
  const access = await getOrganizerAccess();

  if (!access.allowed) {
    return <AccessDenied reason={access.reason} />;
  }

  const initial: EventInput = {
    title: "",
    category: "Music",
    startsAtLocal: defaultStart(),
    location: "",
    venue: "",
    image: "/events/img-1.png",
    description: "",
    priceRupees: 1499,
    seatRows: 8,
    seatsPerRow: 10,
    status: "draft",
  };

  return (
    <main className="organizer">
      <div className="organizer__head">
        <span>SEATWISE® / ORGANIZER</span>
        <Link href="/organizer">← YOUR EVENTS</Link>
      </div>

      <header className="organizer__hero">
        <h1>
          NEW EVENT<span>.</span>
        </h1>

        <div className="organizer__hero-meta">
          <span>
            SAVED AS A DRAFT BY DEFAULT — PUBLISH WHEN YOU&apos;RE READY
          </span>
        </div>
      </header>

      <EventForm mode="create" initial={initial} />
    </main>
  );
}
