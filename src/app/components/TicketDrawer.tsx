"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  event: {
    number?: string;
    title: string;
    date: string;
    location: string;
    venue: string;
    price: number;
    time?: string;
  };
};

const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
const seatsPerRow = 10;

// Simulated booked seats.
// Later these can come from Firebase/database.
const bookedSeats = [
  "A3",
  "A4",
  "B7",
  "B8",
  "C2",
  "C3",
  "D6",
  "E5",
  "F9",
  "G1",
  "G2",
  "H8",
];

// Simulated bestseller seats.
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

type SeatFilter =
  | "ALL"
  | "BESTSELLER"
  | "SELECTED";

export default function TicketDrawer({
  event,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] =
    useState<string[]>([]);
  const [confirmed, setConfirmed] =
    useState(false);
  const [printing, setPrinting] =
    useState(false);
  const [filter, setFilter] =
    useState<SeatFilter>("ALL");
  const [bookingCode, setBookingCode] =
    useState("");

  const total =
    selectedSeats.length * event.price;

  const seatCount =
    selectedSeats.length;

  const sortedSeats = useMemo(() => {
    return [...selectedSeats].sort((a, b) => {
      const rowA = a.charCodeAt(0);
      const rowB = b.charCodeAt(0);

      if (rowA !== rowB) {
        return rowA - rowB;
      }

      return (
        Number(a.slice(1)) -
        Number(b.slice(1))
      );
    });
  }, [selectedSeats]);

  /*
   * =====================================================
   * OPEN BOOKING DRAWER
   * =====================================================
   */

  const openDrawer = () => {
    setOpen(true);
    setConfirmed(false);
    setPrinting(false);
    setFilter("ALL");
  };

  /*
   * =====================================================
   * CLOSE BOOKING DRAWER
   * =====================================================
   */

  const closeDrawer = () => {
    // Don't allow accidental closing while
    // the ticket is printing.
    if (printing) {
      return;
    }

    setOpen(false);
    setConfirmed(false);
    setPrinting(false);
    setSelectedSeats([]);
    setFilter("ALL");
  };

  /*
   * =====================================================
   * SEAT SELECTION
   * =====================================================
   */

  const toggleSeat = (seat: string) => {
    if (bookedSeats.includes(seat)) {
      return;
    }

    setSelectedSeats((current) => {
      // Remove selected seat
      if (current.includes(seat)) {
        return current.filter(
          (item) => item !== seat
        );
      }

      // Maximum 6 seats
      if (current.length >= 6) {
        return current;
      }

      return [...current, seat];
    });
  };

  /*
   * =====================================================
   * FILTER SEATS
   * =====================================================
   */

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

  /*
   * =====================================================
   * SAVE BOOKING
   *
   * This happens ONLY after the mock payment
   * succeeds.
   *
   * My Tickets can read this later.
   * =====================================================
   */

  const saveBooking = (code: string) => {
    try {
      const existingBookings = JSON.parse(
        localStorage.getItem(
          "seatwise-bookings"
        ) || "[]"
      );

      const booking = {
        id:
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`,

        bookingCode: code,

        eventNumber:
          event.number || "01",

        title: event.title,

        date: event.date,

        location: event.location,

        venue: event.venue,

        time:
          event.time || "08:00 PM",

        seats: sortedSeats,

        seatCount,

        pricePerSeat: event.price,

        total,

        bookedAt:
          new Date().toISOString(),
      };

      const updatedBookings = [
        ...existingBookings,
        booking,
      ];

      localStorage.setItem(
        "seatwise-bookings",
        JSON.stringify(updatedBookings)
      );

      window.dispatchEvent(
        new CustomEvent(
          "seatwise:booking-created",
          {
            detail: booking,
          }
        )
      );
    } catch (error) {
      console.error(
        "Unable to save booking:",
        error
      );
    }
  };

  /*
   * =====================================================
   * PAYMENT RETURN
   *
   * Payment page puts the successful payment
   * information in sessionStorage.
   *
   * When we return here:
   *
   * PAYMENT
   *   ↓
   * SAME DRAWER
   *   ↓
   * PRINTING
   *   ↓
   * CONFIRMED
   * =====================================================
   */

  useEffect(() => {
    const paymentSuccess =
      sessionStorage.getItem(
        "seatwise-payment-success"
      );

    if (!paymentSuccess) {
      return;
    }

    try {
      const paymentData =
        JSON.parse(paymentSuccess);

      if (
        !paymentData ||
        !Array.isArray(
          paymentData.seats
        ) ||
        paymentData.seats.length === 0
      ) {
        sessionStorage.removeItem(
          "seatwise-payment-success"
        );

        return;
      }

      /*
       * Restore the seats selected before
       * payment.
       */
      setSelectedSeats(
        paymentData.seats
      );

      /*
       * Restore booking code.
       */
      setBookingCode(
        paymentData.bookingCode || ""
      );

      /*
       * Open the existing drawer.
       */
      setOpen(true);

      setConfirmed(false);

      /*
       * Start the SAME existing printing
       * animation.
       */
      setPrinting(true);

      /*
       * Save booking only after payment.
       */
      const restoredSeats =
        paymentData.seats as string[];

      const restoredTotal =
        restoredSeats.length *
        event.price;

      try {
        const existingBookings =
          JSON.parse(
            localStorage.getItem(
              "seatwise-bookings"
            ) || "[]"
          );

        const booking = {
          id:
            typeof crypto !== "undefined" &&
            typeof crypto.randomUUID ===
              "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`,

          bookingCode:
            paymentData.bookingCode,

          eventNumber:
            event.number || "01",

          title: event.title,

          date: event.date,

          location: event.location,

          venue: event.venue,

          time:
            event.time || "08:00 PM",

          seats: restoredSeats,

          seatCount:
            restoredSeats.length,

          pricePerSeat: event.price,

          total: restoredTotal,

          bookedAt:
            new Date().toISOString(),
        };

        localStorage.setItem(
          "seatwise-bookings",
          JSON.stringify([
            ...existingBookings,
            booking,
          ])
        );

        window.dispatchEvent(
          new CustomEvent(
            "seatwise:booking-created",
            {
              detail: booking,
            }
          )
        );
      } catch (error) {
        console.error(
          "Unable to save paid booking:",
          error
        );
      }

      /*
       * IMPORTANT:
       *
       * Remove the payment signal immediately.
       * Otherwise refreshing the page could replay
       * the printing animation.
       */
      sessionStorage.removeItem(
        "seatwise-payment-success"
      );

      /*
       * IMPORTANT:
       * The printing transition is handled by the
       * dedicated [printing] effect below.
       *
       * Do NOT start the timer here. Keeping the timer
       * inside the payment-return effect can be unreliable
       * when Next.js remounts/re-renders this component.
       */
    } catch (error) {
      console.error(
        "Unable to restore payment:",
        error
      );

      sessionStorage.removeItem(
        "seatwise-payment-success"
      );
    }
  }, [event]);

  /*
   * =====================================================
   * PRINTING -> FINAL TICKET
   *
   * This is deliberately separated from the payment
   * return effect.
   *
   * Flow:
   * PAYMENT SUCCESS
   *   ↓
   * printing = true
   *   ↓ 2.8 seconds
   * printing = false
   * confirmed = true
   *
   * The cleanup only cancels the current timer when
   * the printing phase actually ends/unmounts.
   * =====================================================
   */
  useEffect(() => {
    if (!printing) {
      return;
    }

    const timer = window.setTimeout(() => {
      setPrinting(false);
      setConfirmed(true);
    }, 2800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [printing]);

  /*
   * =====================================================
   * CONFIRM BOOKING
   *
   * This NO LONGER prints immediately.
   *
   * It first sends the user to payment.
   * =====================================================
   */

  const confirmBooking = () => {
    if (seatCount === 0) {
      return;
    }

    const code =
      "SW26-" +
      Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

    setBookingCode(code);

    /*
     * Save temporary booking information.
     * This is NOT a confirmed booking yet.
     */
    sessionStorage.setItem(
      "seatwise-pending-payment",
      JSON.stringify({
        bookingCode: code,

        eventNumber:
          event.number || "01",

        title: event.title,

        date: event.date,

        location: event.location,

        venue: event.venue,

        time:
          event.time || "08:00 PM",

        seats: sortedSeats,

        price: event.price,

        total,

        /*
         * IMPORTANT:
         * Remember the exact event-detail URL we came from.
         *
         * Payment uses this to return to this same event page,
         * so TicketDrawer can immediately show the printing
         * animation after payment.
         */
        returnPath:
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}${window.location.hash}`
            : "/events",
      })
    );

    /*
     * Go to payment.
     */
    router.push("/payment");
  };

  return (
    <>
      {/* =====================================================
          ORIGINAL GET TICKETS BUTTON
      ===================================================== */}

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


      {/* =====================================================
          OVERLAY
      ===================================================== */}

      <div
        className={`ticket-overlay ${
          open
            ? "ticket-overlay--open"
            : ""
        }`}
        onClick={closeDrawer}
      />


      {/* =====================================================
          BOOKING DRAWER
      ===================================================== */}

      <aside
        className={`ticket-drawer ${
          open
            ? "ticket-drawer--open"
            : ""
        }`}
      >

        {/* ===================================================
            PRINTING ANIMATION
        =================================================== */}

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

        ) : !confirmed ? (

          <>
            {/* =================================================
                BOOKING HEADER
            ================================================== */}

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


            {/* =================================================
                EVENT TITLE
            ================================================== */}

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


            {/* =================================================
                SEAT SELECTION
            ================================================== */}

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
                  / 06
                </div>

              </div>


              {/* =================================================
                  SEAT FILTERS
              ================================================== */}

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


              {/* =================================================
                  STAGE
              ================================================== */}

              <div className="seat-stage">
                STAGE
              </div>


              {/* =================================================
                  SCROLLABLE SEAT MAP
              ================================================== */}

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
                              bookedSeats.includes(
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


              {/* =================================================
                  LEGEND
              ================================================== */}

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


            {/* =================================================
                SELECTED SEATS
            ================================================== */}

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


            {/* =================================================
                TOTAL + CONFIRM
            ================================================== */}

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
                MAXIMUM 6 SEATS PER BOOKING
              </small>

            </div>

          </>

        ) : (

          /* =====================================================
             FINAL PRINTED TICKET
          ====================================================== */

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


            {/* =================================================
                PRINTED TICKET / BILL
            ================================================== */}

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


              {/* EVENT DETAILS */}

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


              {/* =================================================
                  TEAR LINE
              ================================================== */}

              <div className="booking-ticket__tear">

                <i />
                <i />

              </div>


              {/* =================================================
                  BILL / TICKET LOWER SECTION
              ================================================== */}

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


                {/* =================================================
                    FAKE QR / TICKET CODE
                ================================================== */}

                <div className="booking-ticket__qr">

                  <div className="booking-ticket__qr-grid">

                    {Array.from(
                      { length: 100 },
                      (_, index) => (
                        <i key={index} />
                      )
                    )}

                  </div>

                  <span>
                    SW
                  </span>

                </div>

              </div>


              {/* =================================================
                  DONE
              ================================================== */}

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

      </aside>
    </>
  );
}