import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — SeatWise",
  description:
    "SeatWise is live event ticketing built around the exact seat: one buyer per seat, guaranteed by the database, on a map that updates while you watch.",
};

/*
 * Deliberately static. Nothing on this page reads the database or the
 * session, so unlike /events it has no reason to opt out of prerendering.
 * The numbers quoted below are the real ones and are load-bearing: 10
 * minutes is the seat_holds interval, 8 is the buyer cap enforced by the
 * 0001_buyer_hold_cap trigger, and 2 seconds is the SSE poll in
 * /api/events/[id]/stream. Change one there, change it here.
 */

const capabilities = [
  {
    number: "01",
    title: "Exact seats",
    body: "Every seat in the house is drawn with its own row, number and price. You choose the one you want rather than accepting whatever a tier hands you.",
  },
  {
    number: "02",
    title: "One winner per seat",
    body: "Two people reaching for the same seat in the same second is the normal case, not the edge case. The database decides who gets it — not the browser, not the server — so the second tap is refused instead of double-sold.",
  },
  {
    number: "03",
    title: "A map that moves",
    body: "Seats grey out as other people claim them, streamed to your browser every two seconds. You are looking at the state of the room right now, not a snapshot from when the page loaded.",
  },
  {
    number: "04",
    title: "A ticket that scans",
    body: "Each seat gets its own signed QR code, and the gate marks it used the first time it is read. A screenshot forwarded to a friend gets turned away at the door.",
  },
];

const steps = [
  {
    number: "01",
    label: "Find",
    body: "Browse what is actually on sale. Every listing is a published event with real inventory behind it.",
  },
  {
    number: "02",
    label: "Choose",
    body: "Open the seat map and take the seats you want. Each one is held in your name for ten minutes — long enough to decide, short enough that nobody can sit on the good seats all afternoon.",
  },
  {
    number: "03",
    label: "Pay",
    body: "Checkout runs through Stripe in rupees. Your held seats convert to sold the moment payment clears, and the order is reconciled against Stripe directly rather than trusting a single webhook to arrive.",
  },
  {
    number: "04",
    label: "Arrive",
    body: "Your tickets live under My Tickets, one QR per seat, downloadable as a PDF. Show it at the gate and walk in.",
  },
];

const figures = [
  { value: "10", unit: "MIN", label: "Seat hold" },
  { value: "08", unit: "MAX", label: "Seats per buyer" },
  { value: "02", unit: "SEC", label: "Map refresh" },
  { value: "01", unit: "ONLY", label: "Winner per seat" },
];

const stack = [
  { name: "Next.js", role: "App Router, server actions" },
  { name: "Postgres", role: "Neon, serverless" },
  { name: "Drizzle", role: "Schema and migrations" },
  { name: "Better Auth", role: "Sessions and Google sign-in" },
  { name: "Stripe", role: "Checkout in INR" },
  { name: "SSE", role: "Live seat updates" },
];

export default function AboutPage() {
  return (
    <main className="about-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="about-header">
        <div>
          <span className="about-kicker">SEATWISE® / IND / 2026</span>
          <h1>ABOUT<br />SEATWISE<span>.</span></h1>
        </div>

        <div className="about-header__right">
          <span>06 / INSIDE SEATWISE</span>
          <Link href="/events">EXPLORE EVENTS ↗</Link>
          <Link href="/">← BACK HOME</Link>
        </div>
      </header>

      {/* =====================================================
          STATEMENT
      ===================================================== */}

      <section className="about-statement">
        <span className="about-statement__eyebrow">WHAT THIS IS</span>

        <p className="about-statement__lead">
          SeatWise is live event ticketing for India, built around one
          idea: the seat is the product. You pick the exact seat — not a
          tier, not a best-available guess — and from the moment you touch
          it, it is nobody else&apos;s.
        </p>

        <p className="about-statement__body">
          That sounds obvious until two thousand people open the same seat
          map for the same show at the same minute. Most systems handle
          that by overselling and apologising later. SeatWise handles it by
          making the seat impossible to hold twice, and by proving that
          with an automated test that fires twenty simultaneous claims at a
          single seat and expects nineteen of them to be refused.
        </p>
      </section>

      {/* =====================================================
          FIGURES
      ===================================================== */}

      <section className="about-figures">
        {figures.map((figure) => (
          <div key={figure.label} className="about-figure">
            <strong>
              {figure.value}
              <em>{figure.unit}</em>
            </strong>
            <span>{figure.label}</span>
          </div>
        ))}
      </section>

      {/* =====================================================
          CAPABILITIES
      ===================================================== */}

      <section className="about-block">
        <div className="about-block__head">
          <span>01 / WHAT IT DOES</span>
          <h2>FOUR THINGS,<br />DONE PROPERLY<span>.</span></h2>
        </div>

        <div className="about-rows">
          {capabilities.map((item) => (
            <article key={item.number} className="about-row">
              <span className="about-row__number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section className="about-block about-block--light">
        <div className="about-block__head">
          <span>02 / HOW A SEAT BECOMES YOURS</span>
          <h2>FIND. CHOOSE.<br />PAY. ARRIVE<span>.</span></h2>
        </div>

        <div className="about-steps">
          {steps.map((step) => (
            <article key={step.number} className="about-step">
              <span className="about-step__number">{step.number}</span>
              <strong>{step.label}</strong>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* =====================================================
          FOR ORGANISERS
      ===================================================== */}

      <section className="about-organiser">
        <div>
          <span>03 / FOR ORGANISERS</span>
          <h2>RUN THE ROOM<span>.</span></h2>
          <p>
            Create an event, lay out the seating, set the price, publish.
            Sales appear as they happen, and the door scanner is
            role-gated, so only your staff can check anybody in.
          </p>
        </div>

        <Link href="/organizer" className="about-organiser__link">
          ORGANISER CONSOLE<span>↗</span>
        </Link>
      </section>

      {/* =====================================================
          STACK
      ===================================================== */}

      <section className="about-stack">
        <span className="about-stack__label">04 / BUILT ON</span>

        <div className="about-stack__grid">
          {stack.map((item) => (
            <div key={item.name} className="about-stack__item">
              <strong>{item.name}</strong>
              <span>{item.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* =====================================================
          CLOSING CTA
      ===================================================== */}

      <section className="about-cta">
        <div>
          <span>READY?</span>
          <h2>PICK YOUR SEAT<span>.</span></h2>
        </div>

        <Link href="/events" className="about-cta__button">
          EXPLORE EVENTS<span>↗</span>
        </Link>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="about-footer">
        <span>SEATWISE®</span>
        <span>DISCOVER / BOOK / BE THERE</span>
        <span>© 2026</span>
      </footer>

    </main>
  );
}
