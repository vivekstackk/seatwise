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

  /**
   * Demo show times, relative to whenever the seed is run.
   *
   * These were hardcoded 2026 dates, which quietly rotted: once the real
   * date passed them the events became unbookable (correctly — a past
   * event closes booking), and a catalogue of dead shows reads as "the
   * app is broken". Relative offsets make `npm run db:seed` a "roll the
   * demo forward" command.
   *
   * The first offset is deliberately negative: one ended event keeps the
   * ENDED / BOOKING CLOSED path visible in the demo instead of only
   * existing in the code.
   *
   * The date part is taken in IST, not the host's zone — on a UTC host
   * shortly before midnight, "today + 7" would otherwise land a day
   * early. The explicit +05:30 then pins the absolute instant, so the
   * same script seeds the same real moment wherever it runs.
   */
  function istDaysFromNow(days: number, timeOfDay: string): Date {
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const istDate = target.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });

    return new Date(`${istDate}T${timeOfDay}:00+05:30`);
  }

  // Postgres stores the UTC-equivalent literal digits (20:00 IST ->
  // 14:30), because starts_at carries no timezone tag. Everything that
  // displays it converts back through Asia/Kolkata — see src/lib/db/events.ts.
  const seedEvents = [
    {
      id: "after-dark",
      number: "01",
      title: "After Dark",
      category: "Music",
      startsAt: istDaysFromNow(-5, "20:00"),
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
      startsAt: istDaysFromNow(8, "19:30"),
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
      startsAt: istDaysFromNow(15, "19:00"),
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
      startsAt: istDaysFromNow(22, "20:30"),
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
      startsAt: istDaysFromNow(29, "18:30"),
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
      startsAt: istDaysFromNow(36, "17:00"),
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
      startsAt: istDaysFromNow(43, "19:30"),
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
      startsAt: istDaysFromNow(50, "19:00"),
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
      startsAt: istDaysFromNow(58, "18:00"),
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