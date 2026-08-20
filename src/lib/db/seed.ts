import { config } from "dotenv";

// Same issue as drizzle.config.ts: this script runs as its own
// process, separate from `next dev`, so .env.local isn't loaded
// automatically. Must happen before ./index is imported, since that
// file reads process.env.DATABASE_URL at import time and throws if
// it's missing — hence the dynamic imports below instead of static
// ones at the top of the file.
config({ path: ".env.local" });

async function main() {
  const { db } = await import("./index");
  const { events } = await import("./schema");

  // Same 9 events currently hardcoded in src/app/data/events.ts.
  // Once this seed has run, Phase 3 will point the frontend at
  // real DB rows instead of that static file.
  //
  // IMPORTANT: every date below has an explicit +05:30 (IST) offset.
  // Without it, "new Date('...T20:00:00')" gets parsed as LOCAL time
  // of whatever machine runs this script — meaning the same code
  // seeds a different real-world instant depending on where it's
  // run (this bit us: tested on a UTC machine, run on an IST one).
  // The +05:30 makes the absolute instant unambiguous regardless of
  // the machine's timezone. Postgres then stores the UTC-equivalent
  // literal digits (e.g. 20:00 IST -> stored as 14:30), since the
  // starts_at column has no timezone tag — always convert back to
  // IST when displaying this to users later (Phase 3/4 frontend work).
  const seedEvents = [
    {
      id: "after-dark",
      number: "01",
      title: "After Dark",
      category: "Music",
      startsAt: new Date("2026-08-14T20:00:00+05:30"),
      location: "Mumbai",
      venue: "NESCO Center",
      image: "/events/img-1.png",
      description:
        "An immersive late-night music experience built around sound, light and movement.",
      priceCents: 149900,
    },
    {
      id: "the-last-light",
      number: "02",
      title: "The Last Light",
      category: "Theatre",
      startsAt: new Date("2026-08-22T19:30:00+05:30"),
      location: "Delhi",
      venue: "Kamani Auditorium",
      image: "/events/img-2.png",
      description:
        "A contemporary theatre performance exploring memory, distance and the final moments of light.",
      priceCents: 89900,
    },
    {
      id: "frequency",
      number: "03",
      title: "Frequency",
      category: "Music",
      startsAt: new Date("2026-08-30T19:00:00+05:30"),
      location: "Bengaluru",
      venue: "Palace Grounds",
      image: "/events/img-3.png",
      description:
        "A large-scale live music experience bringing rhythm, atmosphere and thousands of people together.",
      priceCents: 179900,
    },
    {
      id: "stand-alone",
      number: "04",
      title: "Stand Alone",
      category: "Comedy",
      startsAt: new Date("2026-09-05T20:30:00+05:30"),
      location: "Pune",
      venue: "The Box",
      image: "/events/img-4.png",
      description:
        "An intimate evening of sharp observations, stories and live stand-up comedy.",
      priceCents: 69900,
    },
    {
      id: "between-rooms",
      number: "05",
      title: "Between Rooms",
      category: "Culture",
      startsAt: new Date("2026-09-12T18:30:00+05:30"),
      location: "Mumbai",
      venue: "NMACC",
      image: "/events/img-5.png",
      description:
        "A spatial cultural experience moving between installation, performance and contemporary art.",
      priceCents: 99900,
    },
    {
      id: "open-field",
      number: "06",
      title: "Open Field",
      category: "Music",
      startsAt: new Date("2026-09-19T17:00:00+05:30"),
      location: "Goa",
      venue: "Vagator",
      image: "/events/img-6.png",
      description:
        "An open-air music gathering shaped by sunset, landscape and uninterrupted sound.",
      priceCents: 199900,
    },
    {
      id: "movement",
      number: "07",
      title: "Movement",
      category: "Theatre",
      startsAt: new Date("2026-09-26T19:30:00+05:30"),
      location: "Delhi",
      venue: "Studio Safdar",
      image: "/events/img-7.png",
      description:
        "An experimental performance where physical movement becomes the primary language.",
      priceCents: 79900,
    },
    {
      id: "ninety-minutes",
      number: "08",
      title: "Ninety Minutes",
      category: "Sports",
      startsAt: new Date("2026-10-03T19:00:00+05:30"),
      location: "Kolkata",
      venue: "Salt Lake Stadium",
      image: "/events/img-8.png",
      description:
        "Ninety minutes of live stadium energy, competition and collective anticipation.",
      priceCents: 129900,
    },
    {
      id: "the-room",
      number: "09",
      title: "The Room",
      category: "Culture",
      startsAt: new Date("2026-10-11T18:00:00+05:30"),
      location: "Jaipur",
      venue: "Jawahar Kala Kendra",
      image: "/events/img-9.png",
      description:
        "An intimate cultural installation exploring people, architecture and shared space.",
      priceCents: 59900,
    },
  ];

  for (const event of seedEvents) {
    await db
      .insert(events)
      .values(event)
      .onConflictDoUpdate({
        target: events.id,
        set: { ...event },
      });
    console.log(`Seeded: ${event.id}`);
  }

  console.log(`\nDone — ${seedEvents.length} events seeded.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});