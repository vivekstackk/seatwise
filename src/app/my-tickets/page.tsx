"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { events, type Event } from "../data/events";

type Booking = {
  bookingId: string;
  eventId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  venue: string;
  price: number;
  seats: string[];
  total: number;
  quantity: number;
  bookedAt: string;
};

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTicket, setSelectedTicket] =
    useState<Booking | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("seatwise-bookings");

    if (!stored) {
      setBookings([]);
      return;
    }

    try {
      const parsed: unknown = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        setBookings([]);
        return;
      }

      const validBookings: Booking[] = parsed.filter(
        (item): item is Booking => {
          if (
            typeof item !== "object" ||
            item === null
          ) {
            return false;
          }

          const booking = item as Partial<Booking>;

          return (
            typeof booking.eventId === "string" &&
            typeof booking.title === "string" &&
            Array.isArray(booking.seats)
          );
        }
      );

      setBookings(validBookings);
    } catch (error) {
      console.error(
        "Could not load SeatWise bookings:",
        error
      );

      setBookings([]);
    }
  }, []);

  /*
   * Newest booking first.
   */
  const upcomingBookings = [...bookings].reverse();

  const closeTicket = () => {
    setSelectedTicket(null);
  };

  /*
   * =====================================================
   * DOWNLOAD TICKET
   * =====================================================
   *
   * Captures only the large ticket itself and
   * creates a clean A4 PDF.
   */
  const downloadTicket = async () => {
    if (!ticketRef.current || !selectedTicket) {
      return;
    }

    try {
      const canvas = await html2canvas(
        ticketRef.current,
        {
          scale: 3,
          useCORS: true,
          backgroundColor: "#f2f0e9",
        }
      );

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;

      const margin = 14;

      const availableWidth =
        pageWidth - margin * 2;

      const imageHeight =
        (canvas.height * availableWidth) /
        canvas.width;

      let imageWidth = availableWidth;
      let finalHeight = imageHeight;

      /*
       * Keep the ticket comfortably inside
       * the A4 page.
       */
      const maxHeight = pageHeight - margin * 2;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;

        imageWidth =
          (canvas.width * finalHeight) /
          canvas.height;
      }

      const x =
        (pageWidth - imageWidth) / 2;

      const y =
        (pageHeight - finalHeight) / 2;

      pdf.addImage(
        imageData,
        "PNG",
        x,
        y,
        imageWidth,
        finalHeight
      );

      const safeTitle =
        selectedTicket.title
          .replace(/[^a-z0-9]/gi, "-")
          .replace(/-+/g, "-")
          .toLowerCase();

      const bookingId =
        selectedTicket.bookingId || "SW26";

      pdf.save(
        `${safeTitle}-${bookingId}.pdf`
      );
    } catch (error) {
      console.error(
        "Could not download SeatWise ticket:",
        error
      );
    }
  };

  return (
    <main className="my-tickets-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="my-tickets-header">

        <div>

          <span className="my-tickets-kicker">
            SEATWISE® / IND / 2026
          </span>

          <h1>
            MY
            <br />
            TICKETS<span>.</span>
          </h1>

        </div>

        <div className="my-tickets-header__right">

          <span>
            04 / YOUR BOOKINGS
          </span>

          <Link href="/events">
            EXPLORE EVENTS ↗
          </Link>

        </div>

      </header>


      {/* =====================================================
          BOOKING SUMMARY
      ====================================================== */}

      <section className="my-tickets-intro">

        <div>

          <span>
            YOUR UPCOMING
          </span>

          <strong>
            EXPERIENCES
          </strong>

        </div>

        <div className="my-tickets-count">

          <strong>
            {String(bookings.length).padStart(2, "0")}
          </strong>

          <span>
            {bookings.length === 1
              ? "BOOKING"
              : "BOOKINGS"}
          </span>

        </div>

      </section>


      {/* =====================================================
          EMPTY STATE
      ====================================================== */}

      {upcomingBookings.length === 0 ? (

        <section className="my-tickets-empty">

          <div className="my-tickets-empty__number">
            00
          </div>

          <div>

            <span>
              NO TICKETS.
            </span>

            <h2>
              YOU HAVEN&apos;T BOOKED
              <br />
              ANY EXPERIENCES YET.
            </h2>

            <Link
              href="/events"
              className="my-tickets-empty__button"
            >
              EXPLORE EVENTS
              <span>↗</span>
            </Link>

          </div>

        </section>

      ) : (

        /* =====================================================
           TICKET GRID
        ====================================================== */

        <section className="my-tickets-grid">

          {upcomingBookings.map(
            (booking, index) => {

              const event: Event | undefined =
                events.find(
                  (item: Event) =>
                    item.id === booking.eventId
                );

              /*
               * IMPORTANT:
               *
               * bookingId may be duplicated in old
               * localStorage data.
               *
               * Adding eventId + bookedAt + index
               * guarantees a unique React key.
               */

              const ticketKey = [
                booking.bookingId || "ticket",
                booking.eventId || "event",
                booking.bookedAt || "time",
                index,
              ].join("-");

              const quantity =
                booking.quantity ||
                booking.seats?.length ||
                0;

              const seats =
                booking.seats?.length > 0
                  ? booking.seats.join(" · ")
                  : "—";

              const total =
                Number(booking.total) || 0;

              return (

                <article
                  key={ticketKey}
                  className={`saved-ticket ${
                    index === 0 &&
                    upcomingBookings.length === 1
                      ? "saved-ticket--featured"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedTicket(booking)
                  }
                >

                  {/* =================================================
                      TICKET TOP
                  ================================================== */}

                  <div className="saved-ticket__top">

                    <span>
                      SEATWISE®
                    </span>

                    <span>
                      {String(index + 1).padStart(
                        2,
                        "0"
                      )}
                      {" / "}
                      {String(
                        upcomingBookings.length
                      ).padStart(2, "0")}
                    </span>

                  </div>


                  {/* =================================================
                      EVENT IMAGE
                  ================================================== */}

                  {event?.image && (

                    <div className="saved-ticket__image-wrap">

                      <img
                        src={event.image}
                        alt={booking.title}
                        className="saved-ticket__image"
                      />

                      <span className="saved-ticket__image-label">
                        LIVE EVENT
                      </span>

                    </div>

                  )}


                  {/* =================================================
                      MAIN INFORMATION
                  ================================================== */}

                  <div className="saved-ticket__body">

                    <span className="saved-ticket__label">

                      ADMIT{" "}

                      {String(quantity).padStart(
                        2,
                        "0"
                      )}

                    </span>

                    <h2>
                      {booking.title}
                    </h2>

                    <div className="saved-ticket__details">

                      <div>

                        <span>
                          DATE
                        </span>

                        <strong>
                          {booking.date || "—"}
                        </strong>

                      </div>


                      <div>

                        <span>
                          LOCATION
                        </span>

                        <strong>
                          {(
                            booking.location ||
                            "—"
                          ).toUpperCase()}
                        </strong>

                      </div>


                      <div>

                        <span>
                          VENUE
                        </span>

                        <strong>
                          {(
                            booking.venue ||
                            "—"
                          ).toUpperCase()}
                        </strong>

                      </div>


                      <div>

                        <span>
                          SEATS
                        </span>

                        <strong>
                          {seats}
                        </strong>

                      </div>

                    </div>

                  </div>


                  {/* =================================================
                      TEAR LINE
                  ================================================== */}

                  <div className="saved-ticket__tear">

                    <span />
                    <span />

                  </div>


                  {/* =================================================
                      BOTTOM
                  ================================================== */}

                  <div className="saved-ticket__bottom">

                    <div>

                      <strong>
                        {booking.bookingId ||
                          "SW26"}
                      </strong>

                      <small>
                        {booking.date || "—"}
                        {" / "}
                        {booking.time || "—"}
                      </small>

                    </div>

                    <div className="saved-ticket__price">

                      ₹
                      {total.toLocaleString(
                        "en-IN"
                      )}

                    </div>

                  </div>


                  {/* =================================================
                      OPEN TICKET
                  ================================================== */}

                  <button
                    type="button"
                    className="saved-ticket__open"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedTicket(booking);
                    }}
                  >
                    OPEN TICKET
                    <span>↗</span>
                  </button>

                </article>

              );
            }
          )}

        </section>

      )}


      {/* =====================================================
          FULL TICKET VIEWER
      ====================================================== */}

      {selectedTicket && (

        <div
          className="ticket-viewer"
          onClick={closeTicket}
        >

          <div
            className="ticket-viewer__panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* =================================================
                VIEWER HEADER
            ================================================== */}

            <div className="ticket-viewer__header">

              <span>
                SEATWISE® / TICKET
              </span>

              <button
                type="button"
                onClick={closeTicket}
              >
                CLOSE ×
              </button>

            </div>


            {/* =================================================
                STATUS
            ================================================== */}

            <div className="ticket-viewer__status">

              <span>
                ✓
              </span>

              YOUR PLACE IS CLAIMED

            </div>


            {/* =================================================
                LARGE TICKET
            ================================================== */}

            <div
              ref={ticketRef}
              className="large-ticket"
            >

              {/* Ticket header */}

              <div className="large-ticket__top">

                <span>
                  SEATWISE®
                </span>

                <span>
                  IND / 2026
                </span>

              </div>


              {/* Ticket label */}

              <div className="large-ticket__label">

                LIVE EVENT / ADMIT{" "}

                {String(
                  selectedTicket.quantity ||
                  selectedTicket.seats?.length ||
                  0
                ).padStart(2, "0")}

              </div>


              {/* Ticket title */}

              <h2>
                {selectedTicket.title.toUpperCase()}
              </h2>


              {/* =================================================
                  DETAILS
              ================================================== */}

              <div className="large-ticket__details">

                <div>

                  <span>
                    DATE
                  </span>

                  <strong>
                    {selectedTicket.date || "—"}
                  </strong>

                </div>


                <div>

                  <span>
                    TIME
                  </span>

                  <strong>
                    {selectedTicket.time || "—"}
                  </strong>

                </div>


                <div>

                  <span>
                    LOCATION
                  </span>

                  <strong>
                    {(
                      selectedTicket.location ||
                      "—"
                    ).toUpperCase()}
                  </strong>

                </div>


                <div>

                  <span>
                    VENUE
                  </span>

                  <strong>
                    {(
                      selectedTicket.venue ||
                      "—"
                    ).toUpperCase()}
                  </strong>

                </div>


                <div className="large-ticket__seats">

                  <span>
                    SEATS
                  </span>

                  <strong>
                    {selectedTicket.seats?.length
                      ? selectedTicket.seats.join(
                          " · "
                        )
                      : "—"}
                  </strong>

                </div>

              </div>


              {/* =================================================
                  TEAR LINE
              ================================================== */}

              <div className="large-ticket__tear">

                <span />
                <span />

              </div>


              {/* =================================================
                  TICKET BOTTOM
              ================================================== */}

              <div className="large-ticket__bottom">

                <div>

                  <strong>
                    {selectedTicket.bookingId ||
                      "SW26"}
                  </strong>

                  <small>
                    VALID FOR ENTRY /
                    SEATWISE®
                  </small>

                </div>


                <div className="large-ticket__qr">
                  SW
                </div>

              </div>


              {/* =================================================
                  PRICE / BOOKING DATE
              ================================================== */}

              <div className="large-ticket__footer">

                <strong>

                  ₹
                  {(
                    Number(
                      selectedTicket.total
                    ) || 0
                  ).toLocaleString("en-IN")}

                </strong>

                <span>

                  BOOKED{" "}

                  {selectedTicket.bookedAt
                    ? new Date(
                        selectedTicket.bookedAt
                      ).toLocaleDateString(
                        "en-IN"
                      )
                    : "—"}

                </span>

              </div>

            </div>


            {/* =================================================
                TICKET ACTIONS
            ================================================== */}

            <div className="ticket-viewer__actions">

              <button
                type="button"
                className="ticket-viewer__download"
                onClick={downloadTicket}
              >
                DOWNLOAD TICKET
                <span>↓</span>
              </button>

              <button
                type="button"
                className="ticket-viewer__done"
                onClick={closeTicket}
              >
                DONE
                <span>↗</span>
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="my-tickets-footer">

        <span>
          SEATWISE®
        </span>

        <span>
          DISCOVER / BOOK / BE THERE
        </span>

        <span>
          © 2026
        </span>

      </footer>

    </main>
  );
}