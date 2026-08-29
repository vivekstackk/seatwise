"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  holdSeats,
  releaseSeat,
  getSeatStatus,
  createCheckout,
  getOrderStatus,
  syncOrder,
} from "@/lib/db/seats";
import { useSession } from "@/lib/auth-client";
import { compareSeatIds, seatRowLabels } from "@/lib/seatGrid";

type Props = {
  event: {
    id: string;
    number?: string;
    title: string;
    date: string;
    location: string;
    venue: string;
    price: number;
    time?: string;
    /** Grid dimensions from the events row — no longer assumed 8 x 10. */
    seatRows: number;
    seatsPerRow: number;
  };
};

// bestsellerSeats below is still fake/cosmetic data — it just marks
// which seats show the "•" bestseller badge, it has no bearing on
// booking correctness, so it's left as-is for now.

const bestsellerSeats = [
  "A1",
  "A2",
  "A5",
  "A6",
  "B5",
  "B6",
  "C5",
  "C6",
  "D5",
  "D6",
];

const MAX_SEATS_PER_BOOKING = 6;

type SeatFilter =
  | "ALL"
  | "BESTSELLER"
  | "SELECTED";

type TicketDetail = { seatId: string; qrDataUrl: string };

function TicketDrawerInner({
  event,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read only to decide whether to ask for sign-in before spending a
  // round trip on a hold that cannot succeed. The server action stays the
  // authority — this is a UX shortcut, never the access check.
  const { data: session, isPending: sessionPending } = useSession();
  const signedIn = Boolean(session);

  const rows = useMemo(
    () => seatRowLabels(event.seatRows),
    [event.seatRows]
  );
  const seatsPerRow = event.seatsPerRow;

  // Arriving back from Stripe is knowable at first render, so the drawer
  // opens as initial state rather than being switched on from an effect
  // (which would render the closed drawer first, then immediately again).
  const returningFromCheckout =
    searchParams.get("payment") === "success" &&
    Boolean(searchParams.get("session_id"));

  const [open, setOpen] = useState(returningFromCheckout);
  const [selectedSeats, setSelectedSeats] =
    useState<string[]>([]);
  const [confirmed, setConfirmed] =
    useState(false);
  const [printing, setPrinting] =
    useState(returningFromCheckout);
  const [filter, setFilter] =
    useState<SeatFilter>("ALL");
  const [bookingCode, setBookingCode] =
    useState("");
  const [heldOrSoldSeats, setHeldOrSoldSeats] =
    useState<string[]>([]);
  const [seatError, setSeatError] =
    useState<string | null>(null);
  const [issuedTickets, setIssuedTickets] =
    useState<TicketDetail[]>([]);
  // Set when the payment redirect came back but no ticket exists yet —
  // holds the Stripe session id so the user can re-check without
  // reloading. Distinct from `confirmed`: money moved, ticket did not.
  const [ticketPending, setTicketPending] =
    useState<string | null>(null);
  const [pendingChecking, setPendingChecking] =
    useState(false);
  // Shown when a signed-out visitor tries to book. A panel with a way
  // out, rather than a red line reading "Something went wrong" — which is
  // what this looked like before, and which blamed the seat map for the
  // user simply not having an account yet.
  const [authPrompt, setAuthPrompt] =
    useState(false);

  // Sign-in sends the visitor back to this event rather than to the
  // generic /events list, so the seat they were reaching for is still on
  // screen when they return.
  const loginHref = `/login?next=${encodeURIComponent(
    `/events/${event.id}`
  )}`;
  const signupHref = `${loginHref}&mode=signup`;

  useEffect(() => {
    if (!open) return;

    const source = new EventSource(`/api/events/${event.id}/stream`);

    // The stream sends *named* `seats` frames. onmessage only fires for
    // unnamed events, so listening there received nothing at all while
    // still looking like a healthy connection.
    const onSeats = (e: MessageEvent) => {
      try {
        setHeldOrSoldSeats(JSON.parse(e.data));
      } catch {
        // ignore malformed message
      }
    };

    source.addEventListener("seats", onSeats as EventListener);

    source.onerror = () => {
      // EventSource reconnects automatically on its own.
      console.warn("Seat status stream disconnected — reconnecting");
    };

    return () => {
      source.removeEventListener("seats", onSeats as EventListener);
      source.close();
    };
  }, [open, event.id]);

  // Handles the redirect back from real Stripe Checkout. Stripe
  // redirects here immediately on success, but the webhook that
  // actually converts the hold into a ticket runs as a separate,
  // slightly-delayed async call — so this polls getOrderStatus
  // until the ticket really exists, rather than trusting the URL
  // alone.
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus !== "success" || !sessionId) {
      return;
    }

    let attempts = 0;
    let stopped = false;

    // The webhook is a separate inbound call from Stripe, not part of the
    // redirect. On a cold-started free instance it can land tens of
    // seconds after the browser is already back here, so 22.5s of
    // patience (the old 15 attempts) gave up while it was still in
    // flight. 40 x 1.5s = 60s.
    const maxAttempts = 40;

    const poll = setInterval(async () => {
      if (stopped) {
        return;
      }

      attempts++;

      let result: Awaited<ReturnType<typeof getOrderStatus>> | null = null;

      try {
        // First attempt, then roughly every 12s: ask Stripe directly
        // rather than waiting for its webhook, which may never arrive at
        // all. In between, read the database — that costs nothing and
        // catches the webhook landing on its own.
        result =
          attempts === 1 || attempts % 8 === 0
            ? await syncOrder(sessionId)
            : await getOrderStatus(sessionId);
      } catch (err) {
        // A throw here used to kill the callback before it could reach
        // the give-up branch below, so one failed round trip left the
        // printing animation running forever with no way out.
        console.error("Order status lookup failed:", err);
      }

      if (result?.status === "paid") {
        stopped = true;
        clearInterval(poll);
        setSelectedSeats(result.seats);
        setIssuedTickets(result.ticketsDetail);
        setBookingCode(sessionId.slice(-10).toUpperCase());
        setPrinting(false);
        setConfirmed(true);
        router.replace(`/events/${event.id}`);
      } else if (attempts >= maxAttempts) {
        stopped = true;
        clearInterval(poll);
        setPrinting(false);
        // Deliberately NOT "payment confirmed": all this code knows is
        // that the order is still `pending`, which is exactly the state
        // an unprocessed webhook leaves behind. Claiming otherwise sent
        // people to My Tickets to look for something that isn't there.
        setTicketPending(sessionId);
        router.replace(`/events/${event.id}`);
      }
    }, 1500);

    return () => {
      stopped = true;
      clearInterval(poll);
    };
  }, [searchParams, event.id, router]);

  /**
   * Re-check a payment that finished without a ticket. Goes to Stripe,
   * not just to the database, so this actually issues the ticket if the
   * payment did succeed and only the webhook went missing.
   */
  const recheckTicket = async () => {
    if (!ticketPending || pendingChecking) {
      return;
    }

    setPendingChecking(true);
    setSeatError(null);

    try {
      const result = await syncOrder(ticketPending);

      if (result.status === "paid") {
        setSelectedSeats(result.seats);
        setIssuedTickets(result.ticketsDetail);
        setBookingCode(ticketPending.slice(-10).toUpperCase());
        setTicketPending(null);
        setConfirmed(true);
      } else {
        setSeatError(
          "STILL NOT ISSUED — THE PAYMENT CONFIRMATION HASN'T REACHED THE SERVER YET."
        );
      }
    } catch (err) {
      console.error("Order status lookup failed:", err);
      setSeatError("COULDN'T REACH THE SERVER. TRY AGAIN IN A MOMENT.");
    } finally {
      setPendingChecking(false);
    }
  };

  const total =
    selectedSeats.length * event.price;

  const seatCount =
    selectedSeats.length;

  const sortedSeats = useMemo(() => {
    return [...selectedSeats].sort(compareSeatIds);
  }, [selectedSeats]);

  const openDrawer = () => {
    setOpen(true);
    setConfirmed(false);
    setPrinting(false);
    setFilter("ALL");
    setSeatError(null);
    setIssuedTickets([]);
    setTicketPending(null);
    setAuthPrompt(false);
  };

  const closeDrawer = () => {
    if (printing) {
      return;
    }

    setOpen(false);
    setConfirmed(false);
    setPrinting(false);
    setSelectedSeats([]);
    setIssuedTickets([]);
    setTicketPending(null);
    setSeatError(null);
    setFilter("ALL");
    setAuthPrompt(false);
  };

  const toggleSeat = async (seat: string) => {
    if (heldOrSoldSeats.includes(seat)) {
      return;
    }

    // Ask up front. `sessionPending` is respected so a slow session
    // fetch doesn't accuse a signed-in user of being signed out.
    if (!sessionPending && !signedIn) {
      setSeatError(null);
      setAuthPrompt(true);
      return;
    }

    setSeatError(null);

    if (selectedSeats.includes(seat)) {
      setSelectedSeats((current) =>
        current.filter((item) => item !== seat)
      );

      try {
        await releaseSeat(event.id, seat);
      } catch (err) {
        console.error("Failed to release seat:", err);
      }

      return;
    }

    if (selectedSeats.length >= MAX_SEATS_PER_BOOKING) {
      setSeatError(
        `You can book up to ${MAX_SEATS_PER_BOOKING} seats at a time.`
      );
      return;
    }

    setSelectedSeats((current) => [...current, seat]);

    try {
      const result = await holdSeats(event.id, [seat]);

      // The session expired between render and click, or the shortcut
      // above was skipped because the session was still loading.
      if ("needsAuth" in result) {
        setSelectedSeats((current) =>
          current.filter((item) => item !== seat)
        );
        setAuthPrompt(true);
        return;
      }

      if (result.held.includes(seat)) {
        return;
      }

      setSelectedSeats((current) =>
        current.filter((item) => item !== seat)
      );

      setSeatError(
        result.capExceeded
          ? "You've reached the 8-seat hold limit for this event."
          : `Seat ${seat} was just taken by someone else.`
      );

      const freshStatus = await getSeatStatus(event.id);
      setHeldOrSoldSeats(freshStatus);
    } catch (err: unknown) {
      setSelectedSeats((current) =>
        current.filter((item) => item !== seat)
      );

      console.error("Failed to hold seat:", err);
      setSeatError("Something went wrong holding that seat. Try again.");
    }
  };

  const isVisibleByFilter = (
    seat: string
  ) => {
    if (filter === "ALL") {
      return true;
    }

    if (filter === "BESTSELLER") {
      return bestsellerSeats.includes(seat);
    }

    if (filter === "SELECTED") {
      return selectedSeats.includes(seat);
    }

    return true;
  };

  const confirmBooking = async () => {
    if (seatCount === 0) {
      return;
    }

    setSeatError(null);

    if (!sessionPending && !signedIn) {
      setAuthPrompt(true);
      return;
    }

    try {
      const result = await createCheckout(event.id);

      if ("needsAuth" in result) {
        setAuthPrompt(true);
        return;
      }

      window.location.href = result.url;
    } catch (err: unknown) {
      console.error("Checkout failed:", err);
      setSeatError("Something went wrong starting checkout. Try again.");
    }
  };

  return (
    <>
      <button
        type="button"
        className="event-detail__ticket-button"
        onClick={openDrawer}
      >
        <span>
          GET TICKETS
        </span>

        <span className="event-detail__ticket-arrow">
          ↗
        </span>
      </button>

      <div
        className={`ticket-overlay ${
          open
            ? "ticket-overlay--open"
            : ""
        }`}
        onClick={closeDrawer}
      />

      <aside
        className={`ticket-drawer ${
          open
            ? "ticket-drawer--open"
            : ""
        }`}
      >

        {printing ? (
          <div className="ticket-printing">

            <div className="ticket-printing__top">

              <span>
                SEATWISE® / BOOKING
              </span>

              <span>
                PROCESSING
              </span>

            </div>

            <div className="ticket-printing__center">

              <div className="ticket-printing__paper">

                <div className="ticket-printing__paper-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <div className="ticket-printing__paper-title">
                  SEATWISE®
                </div>

                <div className="ticket-printing__paper-event">
                  {event.title.toUpperCase()}
                </div>

                <div className="ticket-printing__paper-details">

                  <span>
                    {event.date}
                  </span>

                  <span>
                    {event.location.toUpperCase()}
                  </span>

                  <span>
                    {sortedSeats.join(" · ")}
                  </span>

                </div>

              </div>

              <div className="ticket-printing__status">

                PRINTING YOUR TICKET

                <span>
                  •••
                </span>

              </div>

            </div>

            <div className="ticket-printing__bottom">

              <span>
                PLEASE WAIT
              </span>

              <span>
                SEATWISE® / 2026
              </span>

            </div>

          </div>

        ) : ticketPending ? (

          /* =====================================================
             PAID, BUT NO TICKET YET — a terminal state the user
             can act on. Previously the printing animation simply
             ran out and left a misleading one-line error.
          ===================================================== */

          <div className="ticket-pending">

            <div className="ticket-drawer__top">

              <span>
                SEATWISE® / BOOKING
              </span>

              <button
                type="button"
                onClick={closeDrawer}
              >
                CLOSE ×
              </button>

            </div>

            <div className="ticket-pending__body">

              <span className="ticket-pending__eyebrow">
                PAYMENT TAKEN
              </span>

              <strong>
                YOUR TICKET ISN&apos;T ISSUED YET.
              </strong>

              <p>
                WE ASKED STRIPE DIRECTLY AND IT HASN&apos;T CONFIRMED THIS
                PAYMENT YET. NOTHING IS LOST — YOUR ORDER AND ITS
                REFERENCE ARE SAVED, AND THE TICKET APPEARS IN MY TICKETS
                AS SOON AS THE PAYMENT CLEARS.
              </p>

              <span className="ticket-pending__ref">
                REF {ticketPending.slice(-10).toUpperCase()}
              </span>

              {seatError && (
                <p className="ticket-pending__error" role="status">
                  {seatError}
                </p>
              )}

              <div className="ticket-pending__actions">

                <button
                  type="button"
                  className="ticket-pending__retry"
                  onClick={recheckTicket}
                  disabled={pendingChecking}
                >
                  {pendingChecking ? "CHECKING..." : "CHECK AGAIN ↻"}
                </button>

                <Link
                  href="/my-tickets"
                  className="ticket-pending__link"
                >
                  MY TICKETS ↗
                </Link>

                <button
                  type="button"
                  className="ticket-pending__done"
                  onClick={closeDrawer}
                >
                  DONE
                </button>

              </div>

            </div>

          </div>

        ) : !confirmed ? (

          <>
            <div className="ticket-drawer__top">

              <span>
                SEATWISE® / BOOKING
              </span>

              <button
                type="button"
                onClick={closeDrawer}
              >
                CLOSE ×
              </button>

            </div>

            <div className="ticket-drawer__event">

              <span>
                {event.number || "01"} / EVENT
              </span>

              <h2>
                {event.title}
              </h2>

              <p>
                {event.date} /{" "}
                {event.location}
                <br />
                {event.venue}
              </p>

            </div>

            <section className="seat-selection">

              <div className="seat-selection__heading">

                <div>

                  <span>
                    SELECT YOUR PLACE
                  </span>

                  <h3>
                    CHOOSE SEATS
                  </h3>

                </div>

                <div className="seat-selection__counter">
                  {String(
                    seatCount
                  ).padStart(2, "0")}{" "}
                  / {String(MAX_SEATS_PER_BOOKING).padStart(2, "0")}
                </div>

              </div>

              {seatError && (
                <p
                  style={{
                    fontSize: "12px",
                    letterSpacing: "0.05em",
                    color: "#c0392b",
                    margin: "0 0 16px",
                  }}
                >
                  {seatError}
                </p>
              )}

              <div className="seat-filters">

                <button
                  type="button"
                  className={
                    filter === "ALL"
                      ? "seat-filter seat-filter--active"
                      : "seat-filter"
                  }
                  onClick={() =>
                    setFilter("ALL")
                  }
                >
                  ALL
                </button>

                <button
                  type="button"
                  className={
                    filter ===
                    "BESTSELLER"
                      ? "seat-filter seat-filter--active"
                      : "seat-filter"
                  }
                  onClick={() =>
                    setFilter(
                      "BESTSELLER"
                    )
                  }
                >
                  BESTSELLER
                </button>

                <button
                  type="button"
                  className={
                    filter === "SELECTED"
                      ? "seat-filter seat-filter--active"
                      : "seat-filter"
                  }
                  onClick={() =>
                    setFilter("SELECTED")
                  }
                >
                  SELECTED {seatCount}
                </button>

              </div>

              <div className="seat-stage">
                STAGE
              </div>

              <div className="seat-map-scroll">

                <div className="seat-map">

                  {rows.map((row) => (

                    <div
                      className="seat-row"
                      key={row}
                    >

                      <span className="seat-row__label">
                        {row}
                      </span>

                      <div className="seat-row__seats">

                        {Array.from(
                          {
                            length:
                              seatsPerRow,
                          },
                          (_, index) => {

                            const seatNumber =
                              index + 1;

                            const seat =
                              `${row}${seatNumber}`;

                            const isBooked =
                              heldOrSoldSeats.includes(
                                seat
                              );

                            const isSelected =
                              selectedSeats.includes(
                                seat
                              );

                            const isBestseller =
                              bestsellerSeats.includes(
                                seat
                              );

                            const isVisible =
                              isVisibleByFilter(
                                seat
                              );

                            return (
                              <button
                                key={seat}
                                type="button"
                                disabled={
                                  isBooked ||
                                  !isVisible
                                }
                                aria-label={`Seat ${seat}`}
                                className={[
                                  "seat",

                                  isBooked
                                    ? "seat--booked"
                                    : "",

                                  isSelected
                                    ? "seat--selected"
                                    : "",

                                  isBestseller
                                    ? "seat--bestseller"
                                    : "",

                                  !isVisible
                                    ? "seat--hidden"
                                    : "",
                                ]
                                  .filter(
                                    Boolean
                                  )
                                  .join(" ")}
                                onClick={() =>
                                  toggleSeat(
                                    seat
                                  )
                                }
                              >

                                {seatNumber}

                                {isBestseller &&
                                  !isBooked &&
                                  !isSelected && (
                                    <i className="seat__mark">
                                      •
                                    </i>
                                  )}

                              </button>
                            );
                          }
                        )}

                      </div>

                    </div>

                  ))}

                </div>

              </div>

              <div className="seat-legend">

                <span>
                  <i className="seat-legend__dot seat-legend__dot--available" />
                  AVAILABLE
                </span>

                <span>
                  <i className="seat-legend__dot seat-legend__dot--selected" />
                  SELECTED
                </span>

                <span>
                  <i className="seat-legend__dot seat-legend__dot--booked" />
                  BOOKED
                </span>

                <span>
                  <i className="seat-legend__dot seat-legend__dot--best" />
                  BESTSELLER
                </span>

              </div>

            </section>

            <div className="selected-seats">

              <div>

                <span>
                  YOUR SEATS
                </span>

                <strong>
                  {sortedSeats.length > 0
                    ? sortedSeats.join(
                        " · "
                      )
                    : "NONE SELECTED"}
                </strong>

              </div>

              <div>

                <span>
                  PRICE / SEAT
                </span>

                <strong>
                  ₹
                  {event.price.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

            </div>

            <div className="ticket-drawer__bottom">

              <div className="ticket-total">

                <span>
                  TOTAL
                </span>

                <strong>
                  ₹
                  {total.toLocaleString(
                    "en-IN"
                  )}
                </strong>

              </div>

              <button
                type="button"
                className="ticket-confirm"
                disabled={
                  seatCount === 0
                }
                onClick={
                  confirmBooking
                }
              >

                {seatCount === 0
                  ? "SELECT SEATS"
                  : "CONFIRM BOOKING"}

                <span>
                  ↗
                </span>

              </button>

              <small>
                MAXIMUM {MAX_SEATS_PER_BOOKING} SEATS PER BOOKING
              </small>

            </div>

          </>

        ) : (

          <div className="booking-confirmed">

            <div className="ticket-drawer__top">

              <span>
                BOOKING CONFIRMED
              </span>

              <button
                type="button"
                onClick={closeDrawer}
              >
                CLOSE ×
              </button>

            </div>

            <div className="booking-confirmed__message">

              <span>
                ✓ &nbsp; YOUR PLACE IS CLAIMED
              </span>

            </div>

            <div className="booking-ticket">

              <div className="booking-ticket__top">

                <span>
                  SEATWISE®
                </span>

                <span>
                  IND / 2026
                </span>

              </div>

              <span className="booking-ticket__label">
                LIVE EVENT / ADMIT{" "}
                {seatCount}
              </span>

              <h2>
                {event.title.toUpperCase()}
              </h2>

              <div className="booking-ticket__details">

                <div>

                  <span>
                    DATE
                  </span>

                  <strong>
                    {event.date}
                  </strong>

                </div>

                <div>

                  <span>
                    LOCATION
                  </span>

                  <strong>
                    {event.location.toUpperCase()}
                  </strong>

                </div>

                <div>

                  <span>
                    VENUE
                  </span>

                  <strong>
                    {event.venue.toUpperCase()}
                  </strong>

                </div>

                <div>

                  <span>
                    TIME
                  </span>

                  <strong>
                    {event.time ||
                      "08:00 PM"}
                  </strong>

                </div>

                <div className="booking-ticket__seats">

                  <span>
                    SEATS
                  </span>

                  <strong>
                    {sortedSeats.join(
                      " · "
                    )}
                  </strong>

                </div>

              </div>

              <div className="booking-ticket__tear">

                <i />
                <i />

              </div>

              <div className="booking-ticket__bottom">

                <div>

                  <strong>
                    {bookingCode}
                  </strong>

                  <strong>
                    ₹
                    {total.toLocaleString(
                      "en-IN"
                    )}
                  </strong>

                  <small>
                    {bookingCode} /
                    VALID FOR ENTRY /
                    SEATWISE®
                  </small>

                </div>

                <div className="booking-ticket__qr">

                  {/* One real, scannable code per seat — the signed
                      tickets.qr_token, rendered server-side. This used
                      to be a 10x10 grid of empty <i> elements: it
                      looked like a QR code and encoded nothing, so a
                      ticket could never actually be scanned at a gate. */}
                  {issuedTickets.length > 0 ? (
                    <div className="booking-ticket__qr-list">
                      {issuedTickets.map((ticket) => (
                        <figure
                          className="booking-ticket__qr-item"
                          key={ticket.seatId}
                        >
                          <img
                            src={ticket.qrDataUrl}
                            alt={`Entry QR code for seat ${ticket.seatId}`}
                          />

                          <figcaption>
                            {ticket.seatId}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <span>
                      SW
                    </span>
                  )}

                </div>

              </div>

              <button
                type="button"
                className="ticket-confirm booking-ticket__done"
                onClick={closeDrawer}
              >

                DONE

                <span>
                  ↗
                </span>

              </button>

            </div>

          </div>

        )}

        {/* =====================================================
            SIGN-IN GATE — floats over whichever branch above is
            showing, so the seat map stays visible behind it and
            the user can see exactly what they were reaching for.
        ===================================================== */}

        {authPrompt && (
          <div className="auth-gate" role="dialog" aria-modal="true">

            <div className="auth-gate__card">

              <span className="auth-gate__eyebrow">
                SIGN IN REQUIRED
              </span>

              <strong>
                A SEAT IS HELD IN YOUR NAME.
              </strong>

              <p>
                SEATWISE HOLDS EACH SEAT FOR ONE BUYER AT A TIME, SO WE
                NEED AN ACCOUNT TO HOLD IT AGAINST. IT TAKES A MOMENT —
                YOU&apos;LL COME STRAIGHT BACK TO THIS SEAT MAP.
              </p>

              <div className="auth-gate__actions">

                <Link href={loginHref} className="auth-gate__primary">
                  <span>SIGN IN</span>
                  <span>↗</span>
                </Link>

                <Link href={signupHref} className="auth-gate__secondary">
                  CREATE ACCOUNT ↗
                </Link>

                <button
                  type="button"
                  className="auth-gate__dismiss"
                  onClick={() => setAuthPrompt(false)}
                >
                  KEEP LOOKING
                </button>

              </div>

            </div>

          </div>
        )}

      </aside>
    </>
  );
}

export default function TicketDrawer(props: Props) {
  return (
    <Suspense
      fallback={
        <button type="button" className="event-detail__ticket-button">
          <span>GET TICKETS</span>
          <span className="event-detail__ticket-arrow">↗</span>
        </button>
      }
    >
      <TicketDrawerInner {...props} />
    </Suspense>
  );
}