"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

const baseMenuItems = [
  {
    number: "01",
    title: "Home",
    href: "#top",
    meta: "Claim your place",
  },
  {
    number: "02",
    title: "Universe",
    href: "#event-universe",
    meta: "Explore experiences",
  },
  {
    number: "03",
    title: "Events",
    href: "/events",
    meta: "What's happening",
  },
  {
    number: "04",
    title: "My Tickets",
    href: "/my-tickets",
    meta: "Your booked experiences",
  },
  {
    number: "06",
    title: "About",
    href: "#about",
    meta: "Inside SeatWise",
  },
];

export default function SiteMenu() {
  const [open, setOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<number | null>(null);
  const { data: session } = useSession();

  // "Account" used to always point at /login, even for a signed-in
  // user, which is why clicking it while logged in showed the login
  // form again instead of an actual account view.
  const accountItem = session
    ? {
        number: "05",
        title: "Account",
        href: "/account",
        meta: session.user.name || session.user.email,
      }
    : {
        number: "05",
        title: "Account",
        href: "/login",
        meta: "Sign in / Create account",
      };

  const menuItems = [
    ...baseMenuItems.slice(0, 4),
    accountItem,
    ...baseMenuItems.slice(4),
  ];

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setActiveItem(null);
  };

  return (
    <>
      {/* =====================================================
          MENU TRIGGER
      ===================================================== */}

      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`seatwise-menu-trigger ${
          open ? "seatwise-menu-trigger--open" : ""
        }`}
      >
        <span className="seatwise-menu-trigger__label">
          {open ? "Close" : "Menu"}
        </span>

        <span className="seatwise-menu-trigger__circle">
          <span className="seatwise-menu-trigger__line seatwise-menu-trigger__line--one" />
          <span className="seatwise-menu-trigger__line seatwise-menu-trigger__line--two" />
        </span>
      </button>

      {/* =====================================================
          FULLSCREEN MENU
      ===================================================== */}

      <div
        className={`seatwise-menu ${
          open ? "seatwise-menu--open" : ""
        }`}
        aria-hidden={!open}
      >
        {/* Background structure */}

        <div className="seatwise-menu__grid" />

        {/* =====================================================
            TOP
        ===================================================== */}

        <div className="seatwise-menu__top">
          <div>
            <div className="seatwise-menu__brand">
              SEATWISE
              <sup>®</sup>
            </div>

            <div className="seatwise-menu__brand-sub">
              LIVE EVENT TICKETING
            </div>
          </div>

          <div className="seatwise-menu__edition">
            IND / 2026
          </div>
        </div>

        {/* =====================================================
            MAIN NAVIGATION
        ===================================================== */}

        <nav className="seatwise-menu__nav">
          {menuItems.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="seatwise-menu__item"
              style={{
                transitionDelay: open
                  ? `${140 + index * 70}ms`
                  : "0ms",
              }}
              onMouseEnter={() => setActiveItem(index)}
              onMouseLeave={() => setActiveItem(null)}
              onClick={closeMenu}
            >
              <span className="seatwise-menu__number">
                {item.number}
              </span>

              <span className="seatwise-menu__title">
                {item.title}
              </span>

              <span className="seatwise-menu__meta">
                {item.meta}
              </span>

              <span
                className={`seatwise-menu__dot ${
                  activeItem === index
                    ? "seatwise-menu__dot--active"
                    : ""
                }`}
              />
            </a>
          ))}
        </nav>

        {/* =====================================================
            BOTTOM INFORMATION
        ===================================================== */}

        <div className="seatwise-menu__bottom">
          <span>
            DISCOVER / BOOK / BE THERE
          </span>

          <span>
            LIVE EXPERIENCES / INDIA
          </span>

          <span>
            © 2026 SEATWISE
          </span>
        </div>
      </div>
    </>
  );
}