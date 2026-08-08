"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const categories = [
  "All",
  "Music",
  "Comedy",
  "Theatre",
  "Sports",
  "Culture",
];

const events = [
  {
    id: "after-dark",
    number: "01",
    title: "After Dark",
    category: "Music",
    date: "14 AUG",
    location: "Mumbai",
    venue: "NESCO Center",
    image: "/events/img-1.png",
  },
  {
    id: "the-last-light",
    number: "02",
    title: "The Last Light",
    category: "Theatre",
    date: "22 AUG",
    location: "Delhi",
    venue: "Kamani Auditorium",
    image: "/events/img-2.png",
  },
  {
    id: "frequency",
    number: "03",
    title: "Frequency",
    category: "Music",
    date: "30 AUG",
    location: "Bengaluru",
    venue: "Palace Grounds",
    image: "/events/img-3.png",
  },
  {
    id: "stand-alone",
    number: "04",
    title: "Stand Alone",
    category: "Comedy",
    date: "05 SEP",
    location: "Pune",
    venue: "The Box",
    image: "/events/img-4.png",
  },
  {
    id: "between-rooms",
    number: "05",
    title: "Between Rooms",
    category: "Culture",
    date: "12 SEP",
    location: "Mumbai",
    venue: "NMACC",
    image: "/events/img-5.png",
  },
  {
    id: "open-field",
    number: "06",
    title: "Open Field",
    category: "Music",
    date: "19 SEP",
    location: "Goa",
    venue: "Vagator",
    image: "/events/img-6.png",
  },
  {
    id: "movement",
    number: "07",
    title: "Movement",
    category: "Theatre",
    date: "26 SEP",
    location: "Delhi",
    venue: "Studio Safdar",
    image: "/events/img-7.png",
  },
  {
    id: "ninety-minutes",
    number: "08",
    title: "Ninety Minutes",
    category: "Sports",
    date: "03 OCT",
    location: "Kolkata",
    venue: "Salt Lake Stadium",
    image: "/events/img-8.png",
  },
  {
    id: "the-room",
    number: "09",
    title: "The Room",
    category: "Culture",
    date: "11 OCT",
    location: "Jaipur",
    venue: "Jawahar Kala Kendra",
    image: "/events/img-9.png",
  },
];

export default function EventsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [location, setLocation] = useState("All India");
  const [search, setSearch] = useState("");

  const locations = [
    "All India",
    ...Array.from(new Set(events.map((event) => event.location))),
  ];

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesCategory =
        activeCategory === "All" ||
        event.category === activeCategory;

      const matchesLocation =
        location === "All India" ||
        event.location === location;

      const matchesSearch =
        query === "" ||
        event.title.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query) ||
        event.category.toLowerCase().includes(query);

      return (
        matchesCategory &&
        matchesLocation &&
        matchesSearch
      );
    });
  }, [activeCategory, location, search]);

  return (
    <main className="events-page">

      {/* ================================================
          TOP BAR
      ================================================= */}

      <header className="events-page__header">
        <Link href="/" className="events-page__brand">
          SEATWISE<sup>®</sup>
        </Link>

        <div className="events-page__edition">
          IND / 2026
        </div>

        <Link href="/" className="events-page__back">
          ← BACK
        </Link>
      </header>


      {/* ================================================
          HERO
      ================================================= */}

      <section className="events-page__hero">

        <div className="events-page__eyebrow">
          03 / WHAT&apos;S HAPPENING
        </div>

        <h1 className="events-page__title">
          EVENTS
          <span>.</span>
        </h1>

        <div className="events-page__hero-bottom">
          <p>
            LIVE EXPERIENCES
            <br />
            ACROSS INDIA
          </p>

          <p>
            MUSIC / COMEDY / THEATRE
            <br />
            SPORTS / CULTURE
          </p>

          <p>
            {String(filteredEvents.length).padStart(2, "0")} EVENTS
          </p>
        </div>

      </section>


      {/* ================================================
          FILTER
      ================================================= */}

      <section className="events-page__filter">

        <span className="events-page__filter-label">
          FILTER
        </span>

        <div className="events-page__categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`events-page__category ${
                activeCategory === category
                  ? "events-page__category--active"
                  : ""
              }`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

      </section>


      {/* ================================================
          EVENTS
      ================================================= */}
      {/* ================================================
    DISCOVERY CONTROLS
================================================= */}

<section className="events-page__discovery">

  {/* LOCATION */}

  <div className="events-page__control">

    <label
      className="events-page__control-label"
      htmlFor="event-location"
    >
      LOCATION
    </label>

    <div className="events-page__select-wrap">
      <select
        id="event-location"
        className="events-page__select"
        value={location}
        onChange={(event) => setLocation(event.target.value)}
      >
        {locations.map((item) => (
          <option key={item} value={item}>
            {item.toUpperCase()}
          </option>
        ))}
      </select>

      <span
        className="events-page__select-mark"
        aria-hidden="true"
      >
        ↓
      </span>
    </div>

  </div>


  {/* SEARCH */}

  <div className="events-page__control events-page__control--search">

    <label
      className="events-page__control-label"
      htmlFor="event-search"
    >
      SEARCH
    </label>

    <input
      id="event-search"
      type="search"
      value={search}
      onChange={(event) => setSearch(event.target.value)}
      className="events-page__search"
      placeholder="EVENT / VENUE / CITY"
      autoComplete="off"
    />

  </div>


  {/* RESULT COUNT */}

  <div className="events-page__result">

    <span className="events-page__control-label">
      SHOWING
    </span>

    <strong>
      {String(filteredEvents.length).padStart(2, "0")}
    </strong>

    <span>
      EXPERIENCES
    </span>

  </div>

</section>

      <section className="events-page__grid">
{filteredEvents.length === 0 && (
  <div className="events-page__empty">
    <span className="events-page__empty-index">
      00 / RESULTS
    </span>

    <h2 className="events-page__empty-title">
      NO EVENTS<span>.</span>
    </h2>

    <div className="events-page__empty-bottom">
      <p>
        NOTHING MATCHES THIS
        <br />
        COMBINATION.
      </p>

      <button
        type="button"
        onClick={() => {
          setActiveCategory("All");
          setLocation("All India");
          setSearch("");
        }}
      >
        RESET FILTERS
        <span>↗</span>
      </button>
    </div>
  </div>
)}
        {filteredEvents.map((event) => (
          <Link
            href={`/events/${event.id}`}
            className="events-card"
            key={event.id}
          >

            <div className="events-card__image-wrap">

              <img
                src={event.image}
                alt={event.title}
                className="events-card__image"
              />

              <span className="events-card__number">
                {event.number}
              </span>

              <span className="events-card__category">
                {event.category}
              </span>

              <span
                className="events-card__square"
                aria-hidden="true"
              />

            </div>

            <div className="events-card__information">

              <div>
                <h2>{event.title}</h2>

                <p>
                  {event.venue}
                </p>
              </div>

              <div className="events-card__details">

                <span>
                  {event.date}
                </span>

                <span>
                  {event.location}
                </span>

              </div>

            </div>

          </Link>
        ))}

      </section>


      {/* ================================================
          FOOTER
      ================================================= */}

      <footer className="events-page__footer">

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