"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { events, type Event } from "../data/events";
import { getMyTickets } from "@/lib/db/seats";

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
  ticketsDetail: { seatId: string; qrToken: string }[];
  total: number;
  quantity: number;
  bookedAt: string;
  isExpired: boolean;
};

export default function MyTicketsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMyTickets()
      .then((data) => setBookings(data as Booking[]))
      .catch((error) => {
        console.error("Could not load tickets:", error);
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const upcomingBookings = bookings;

  const closeTicket = () => setSelectedTicket(null);

  const downloadTicket = async () => {
    if (!ticketRef.current || !selectedTicket) return;

    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#f2f0e9",
      });

      const imageData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 14;
      const availableWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * availableWidth) / canvas.width;

      let imageWidth = availableWidth;
      let finalHeight = imageHeight;

      const maxHeight = pageHeight - margin * 2;

      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        imageWidth = (canvas.width * finalHeight) / canvas.height;
      }

      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - finalHeight) / 2;

      pdf.addImage(imageData, "PNG", x, y, imageWidth, finalHeight);

      const safeTitle = selectedTicket.title
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .toLowerCase();

      pdf.save(`${safeTitle}-${selectedTicket.bookingId || "SW26"}.pdf`);
    } catch (error) {
      console.error("Could not download SeatWise ticket:", error);
    }
  };

  return (
    <main className="my-tickets-page">

      <header className="my-tickets-header">
        <div>
          <span className="my-tickets-kicker">SEATWISE® / IND / 2026</span>
          <h1>MY<br />TICKETS<span>.</span></h1>
        </div>

        <div className="my-tickets-header__right">
          <span>04 / YOUR BOOKINGS</span>
          <Link href="/events">EXPLORE EVENTS ↗</Link>
        </div>
      </header>

      <section className="my-tickets-intro">
        <div>
          <span>YOUR UPCOMING</span>
          <strong>EXPERIENCES</strong>
        </div>

        <div className="my-tickets-count">
          <strong>{String(bookings.length).padStart(2, "0")}</strong>
          <span>{bookings.length === 1 ? "BOOKING" : "BOOKINGS"}</span>
        </div>
      </section>

      {loading ? (
        <section className="my-tickets-empty">
          <div className="my-tickets-empty__number">00</div>
          <div>
            <span>LOADING.</span>
            <h2>FETCHING YOUR TICKETS<span>.</span></h2>
          </div>
        </section>
      ) : upcomingBookings.length === 0 ? (
        <section className="my-tickets-empty">
          <div className="my-tickets-empty__number">00</div>
          <div>
            <span>NO TICKETS.</span>
            <h2>YOU HAVEN&apos;T BOOKED<br />ANY EXPERIENCES YET.</h2>
            <Link href="/events" className="my-tickets-empty__button">
              EXPLORE EVENTS<span>↗</span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="my-tickets-grid">
          {upcomingBookings.map((booking, index) => {
            const event: Event | undefined = events.find(
              (item: Event) => item.id === booking.eventId
            );

            const ticketKey = [
              booking.bookingId || "ticket",
              booking.eventId || "event",
              booking.bookedAt || "time",
              index,
            ].join("-");

            const quantity = booking.quantity || booking.seats?.length || 0;
            const seats = booking.seats?.length > 0 ? booking.seats.join(" · ") : "—";
            const total = Number(booking.total) || 0;

            return (
              <article
                key={ticketKey}
                className={`saved-ticket ${
                  index === 0 && upcomingBookings.length === 1
                    ? "saved-ticket--featured"
                    : ""
                }`}
                onClick={() => setSelectedTicket(booking)}
              >
                <div className="saved-ticket__top">
                  <span>SEATWISE®</span>
                  <span>
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {String(upcomingBookings.length).padStart(2, "0")}
                  </span>
                </div>

                {event?.image && (
                  <div className="saved-ticket__image-wrap">
                    <img src={event.image} alt={booking.title} className="saved-ticket__image" />
                    <span className="saved-ticket__image-label">
                      {booking.isExpired ? "EXPIRED" : "LIVE EVENT"}
                    </span>
                  </div>
                )}

                <div className="saved-ticket__body">
                  <span className="saved-ticket__label">
                    ADMIT {String(quantity).padStart(2, "0")}
                  </span>

                  <h2>{booking.title}</h2>

                  <div className="saved-ticket__details">
                    <div><span>DATE</span><strong>{booking.date || "—"}</strong></div>
                    <div><span>LOCATION</span><strong>{(booking.location || "—").toUpperCase()}</strong></div>
                    <div><span>VENUE</span><strong>{(booking.venue || "—").toUpperCase()}</strong></div>
                    <div><span>SEATS</span><strong>{seats}</strong></div>
                  </div>
                </div>

                <div className="saved-ticket__tear"><span /><span /></div>

                <div className="saved-ticket__bottom">
                  <div>
                    <strong>{booking.bookingId || "SW26"}</strong>
                    <small>{booking.date || "—"} / {booking.time || "—"}</small>
                  </div>
                  <div className="saved-ticket__price">₹{total.toLocaleString("en-IN")}</div>
                </div>

                <button
                  type="button"
                  className="saved-ticket__open"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTicket(booking);
                  }}
                >
                  OPEN TICKET<span>↗</span>
                </button>
              </article>
            );
          })}
        </section>
      )}

      {selectedTicket && (
        <div className="ticket-viewer" onClick={closeTicket}>
          <div className="ticket-viewer__panel" onClick={(e) => e.stopPropagation()}>

            <div className="ticket-viewer__header">
              <span>SEATWISE® / TICKET</span>
              <button type="button" onClick={closeTicket}>CLOSE ×</button>
            </div>

            <div className="ticket-viewer__status">
              <span>{selectedTicket.isExpired ? "✕" : "✓"}</span>
              {selectedTicket.isExpired ? "THIS EVENT HAS PASSED" : "YOUR PLACE IS CLAIMED"}
            </div>

            <div ref={ticketRef} className="large-ticket">
              <div className="large-ticket__top">
                <span>SEATWISE®</span>
                <span>IND / 2026</span>
              </div>

              <div className="large-ticket__label">
                LIVE EVENT / ADMIT{" "}
                {String(selectedTicket.quantity || selectedTicket.seats?.length || 0).padStart(2, "0")}
              </div>

              <h2>{selectedTicket.title.toUpperCase()}</h2>

              <div className="large-ticket__details">
                <div><span>DATE</span><strong>{selectedTicket.date || "—"}</strong></div>
                <div><span>TIME</span><strong>{selectedTicket.time || "—"}</strong></div>
                <div><span>LOCATION</span><strong>{(selectedTicket.location || "—").toUpperCase()}</strong></div>
                <div><span>VENUE</span><strong>{(selectedTicket.venue || "—").toUpperCase()}</strong></div>
                <div className="large-ticket__seats">
                  <span>SEATS</span>
                  <strong>{selectedTicket.seats?.length ? selectedTicket.seats.join(" · ") : "—"}</strong>
                </div>
              </div>

              <div className="large-ticket__tear"><span /><span /></div>

              <div className="large-ticket__bottom">
                <div>
                  <strong>{selectedTicket.bookingId || "SW26"}</strong>
                  <small>VALID FOR ENTRY / SEATWISE®</small>
                </div>
                <div className="large-ticket__qr">SW</div>
              </div>

              <div className="large-ticket__footer">
                <strong>₹{(Number(selectedTicket.total) || 0).toLocaleString("en-IN")}</strong>
                <span>
                  BOOKED{" "}
                  {selectedTicket.bookedAt
                    ? new Date(selectedTicket.bookedAt).toLocaleDateString("en-IN")
                    : "—"}
                </span>
              </div>
            </div>

            {selectedTicket.ticketsDetail && selectedTicket.ticketsDetail.length > 0 && (
              <div style={{ padding: "0 1.5rem 1rem", fontSize: "0.7rem", color: "#6b7280" }}>
                <strong style={{ display: "block", marginBottom: "0.4rem" }}>
                  TICKET TOKENS (dev/demo only)
                </strong>
                {selectedTicket.ticketsDetail.map((t) => (
                  <div key={t.seatId} style={{ fontFamily: "monospace", marginBottom: "0.2rem", wordBreak: "break-all" }}>
                    {t.seatId}: {t.qrToken}
                  </div>
                ))}
              </div>
            )}

            <div className="ticket-viewer__actions">
              <button type="button" className="ticket-viewer__download" onClick={downloadTicket}>
                DOWNLOAD TICKET<span>↓</span>
              </button>
              <button type="button" className="ticket-viewer__done" onClick={closeTicket}>
                DONE<span>↗</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <footer className="my-tickets-footer">
        <span>SEATWISE®</span>
        <span>DISCOVER / BOOK / BE THERE</span>
        <span>© 2026</span>
      </footer>

    </main>
  );
}