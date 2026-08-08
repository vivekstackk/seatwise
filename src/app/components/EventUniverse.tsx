"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import "./EventUniverse.css";

const events = [
  {
    id: "01",
    eventId: "after-dark",
    image: "/events/img-1.png",
    title: "After Dark",
  },
  {
    id: "02",
    eventId: "the-last-light",
    image: "/events/img-2.png",
    title: "The Last Light",
  },
  {
    id: "03",
    eventId: "frequency",
    image: "/events/img-3.png",
    title: "Frequency",
  },
  {
    id: "04",
    eventId: "stand-alone",
    image: "/events/img-4.png",
    title: "Stand Alone",
  },
  {
    id: "05",
    eventId: "between-rooms",
    image: "/events/img-5.png",
    title: "Between Rooms",
  },
  {
    id: "06",
    eventId: "open-field",
    image: "/events/img-6.png",
    title: "Open Field",
  },
  {
    id: "07",
    eventId: "movement",
    image: "/events/img-7.png",
    title: "Movement",
  },
  {
    id: "08",
    eventId: "ninety-minutes",
    image: "/events/img-8.png",
    title: "Ninety Minutes",
  },
  {
    id: "09",
    eventId: "the-room",
    image: "/events/img-9.png",
    title: "The Room",
  },
];

export default function EventUniverse() {
  const sectionRef =
    useRef<HTMLElement | null>(null);

  const cardsRef =
    useRef<(HTMLAnchorElement | null)[]>([]);

  const rafRef =
    useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const cards =
      cardsRef.current.filter(
        (
          card
        ): card is HTMLAnchorElement =>
          card !== null
      );

    if (!cards.length) {
      return;
    }

    /* =====================================================
       MOTION STATE
    ===================================================== */

    let rotation = -0.4;

    let velocity = 0.0016;
    let targetVelocity = 0.0016;

    let verticalTilt = 0;
    let targetVerticalTilt = 0;

    let intro = 0;

    let lastTime = performance.now();
    let lastPointerMove = performance.now();

    let pointerX = 0;
    let pointerY = 0;

    let dragging = false;

    let previousX = 0;
    let previousY = 0;

    const reducedMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    if (reducedMotion) {
      intro = 1;
    }

    /* =====================================================
       HELPERS
    ===================================================== */

    const clamp = (
      value: number,
      min: number,
      max: number
    ) =>
      Math.max(
        min,
        Math.min(max, value)
      );

    const lerp = (
      a: number,
      b: number,
      amount: number
    ) =>
      a +
      (b - a) *
        amount;

    const easeOutExpo = (
      x: number
    ) =>
      x === 1
        ? 1
        : 1 -
          Math.pow(
            2,
            -10 * x
          );

    /* =====================================================
       POINTER MOVE
    ===================================================== */

    const handlePointerMove = (
      event: PointerEvent
    ) => {
      const rect =
        section.getBoundingClientRect();

      const normalizedX =
        (
          (
            event.clientX -
            rect.left
          ) /
            rect.width -
          0.5
        ) * 2;

      const normalizedY =
        (
          (
            event.clientY -
            rect.top
          ) /
            rect.height -
          0.5
        ) * 2;

      pointerX = clamp(
        normalizedX,
        -1,
        1
      );

      pointerY = clamp(
        normalizedY,
        -1,
        1
      );

      lastPointerMove =
        performance.now();

      targetVelocity =
        pointerX *
        0.0075;

      targetVerticalTilt =
        pointerY *
        0.32;

      /* =================================================
         DRAG ROTATION
      ================================================= */

      if (dragging) {
        const deltaX =
          event.clientX -
          previousX;

        const deltaY =
          event.clientY -
          previousY;

        rotation +=
          deltaX *
          0.009;

        velocity +=
          deltaX *
          0.00012;

        targetVerticalTilt +=
          deltaY *
          0.0018;

        previousX =
          event.clientX;

        previousY =
          event.clientY;
      }
    };

    /* =====================================================
       POINTER DOWN

       Don't start dragging when clicking an event card.
    ===================================================== */

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const target =
        event.target as
          | HTMLElement
          | null;

      if (
        target?.closest(
          ".event-universe__card, .event-universe__view-all"
        )
      ) {
        return;
      }

      dragging = true;

      previousX =
        event.clientX;

      previousY =
        event.clientY;

      section.setPointerCapture?.(
        event.pointerId
      );
    };

    /* =====================================================
       STOP DRAGGING
    ===================================================== */

    const stopDragging = (
      event: PointerEvent
    ) => {
      dragging = false;

      try {
        if (
          section.hasPointerCapture?.(
            event.pointerId
          )
        ) {
          section.releasePointerCapture?.(
            event.pointerId
          );
        }
      } catch {
        // Ignore pointer capture errors.
      }

      lastPointerMove =
        performance.now();
    };

    /* =====================================================
       POINTER LEAVE
    ===================================================== */

    const handleLeave = () => {
      if (!dragging) {
        pointerX = 0;
        pointerY = 0;

        targetVerticalTilt = 0;

        targetVelocity =
          0.0016;
      }
    };

    /* =====================================================
       EVENTS
    ===================================================== */

    section.addEventListener(
      "pointermove",
      handlePointerMove
    );

    section.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    section.addEventListener(
      "pointerup",
      stopDragging
    );

    section.addEventListener(
      "pointercancel",
      stopDragging
    );

    section.addEventListener(
      "pointerleave",
      handleLeave
    );

    /* =====================================================
       ANIMATION
    ===================================================== */

    const animate = (
      time: number
    ) => {
      const delta =
        Math.min(
          (time -
            lastTime) /
            16.666,
          2
        );

      lastTime = time;

      /* =================================================
         INTRO
      ================================================= */

      if (
        !reducedMotion &&
        intro < 1
      ) {
        intro +=
          0.007 *
          delta;

        intro =
          Math.min(
            intro,
            1
          );
      }

      const introEase =
        easeOutExpo(
          intro
        );

      /* =================================================
         IDLE AUTO ROTATION
      ================================================= */

      const idleTime =
        time -
        lastPointerMove;

      if (
        !dragging &&
        idleTime > 900
      ) {
        targetVelocity =
          0.0016;
      }

      /* =================================================
         SMOOTH VELOCITY
      ================================================= */

      velocity = lerp(
        velocity,
        targetVelocity,
        Math.min(
          1,
          0.035 *
            delta
        )
      );

      velocity = clamp(
        velocity,
        -0.012,
        0.012
      );

      /* =================================================
         ROTATION
      ================================================= */

      rotation +=
        velocity *
        delta;

      /* =================================================
         VERTICAL PERSPECTIVE
      ================================================= */

      verticalTilt =
        lerp(
          verticalTilt,
          targetVerticalTilt,
          Math.min(
            1,
            0.045 *
              delta
          )
        );

      /* =================================================
         DIMENSIONS
      ================================================= */

      const width =
        section.clientWidth;

      const height =
        section.clientHeight;

      const mobile =
        width < 768;

      const radiusX =
        mobile
          ? width * 0.43
          : Math.min(
              width * 0.39,
              730
            );

      const radiusY =
        mobile
          ? height * 0.11
          : Math.min(
              height * 0.14,
              125
            );

      /* =================================================
         CENTER
      ================================================= */

      const centerX =
        width * 0.52;

      const centerY =
        height * 0.57;

      /* =================================================
         POSITION CARDS
      ================================================= */

      cards.forEach(
        (
          card,
          index
        ) => {
          const baseAngle =
            (index /
              cards.length) *
            Math.PI *
            2;

          const angle =
            baseAngle +
            rotation;

          /* =================================================
             DEPTH
          ================================================= */

          const zDepth =
            Math.cos(
              angle
            );

          const depth01 =
            (zDepth + 1) /
            2;

          /* =================================================
             ORBIT
          ================================================= */

          const orbitX =
            Math.sin(
              angle
            ) *
            radiusX;

          const orbitY =
            Math.sin(
              angle
            ) *
              radiusY *
              verticalTilt +
            Math.sin(
              angle * 2
            ) *
              radiusY *
              0.17;

          /* =================================================
             IMPERFECTION
          ================================================= */

          const irregularY =
            Math.sin(
              index * 1.91
            ) *
            height *
            0.008;

          const introVariationX =
            Math.sin(
              index * 2.17
            ) * 14;

          const introVariationY =
            Math.cos(
              index * 1.71
            ) * 10;

          const x =
            centerX +
            lerp(
              introVariationX,
              orbitX,
              introEase
            );

          const y =
            centerY +
            lerp(
              introVariationY,
              orbitY +
                irregularY,
              introEase
            );

          /* =================================================
             SCALE
          ================================================= */

          const scale =
            lerp(
              0.38,
              1.18,
              depth01
            ) *
            lerp(
              0.32,
              1,
              introEase
            );

          /* =================================================
             OPACITY
          ================================================= */

          const opacity =
            lerp(
              0.14,
              1,
              depth01
            ) *
            lerp(
              0.18,
              1,
              introEase
            );

          /* =================================================
             BRIGHTNESS
          ================================================= */

          const brightness =
            lerp(
              0.22,
              1,
              depth01
            );

          /* =================================================
             BLUR
          ================================================= */

          const blur =
            lerp(
              2.2,
              0,
              depth01
            );

          /* =================================================
             Z INDEX
          ================================================= */

          const zIndex =
            Math.round(
              depth01 *
                120
            ) + 10;

          /* =================================================
             TRANSFORM
          ================================================= */

          card.style.transform = `
            translate3d(
              ${x}px,
              ${y}px,
              ${zDepth * 100}px
            )
            translate(-50%, -50%)
            scale(${scale})
          `;

          card.style.opacity =
            `${opacity}`;

          card.style.zIndex =
            `${zIndex}`;

          card.style.filter = `
            brightness(${brightness})
            blur(${blur}px)
          `;

          /* =================================================
             SHADOW
          ================================================= */

          const shadowStrength =
            0.06 +
            depth01 *
              0.34;

          const shadowY =
            14 +
            depth01 *
              30;

          const shadowBlur =
            35 +
            depth01 *
              65;

          card.style.boxShadow = `
            0
            ${shadowY}px
            ${shadowBlur}px
            rgba(
              0,
              0,
              0,
              ${shadowStrength}
            )
          `;
        }
      );

      rafRef.current =
        requestAnimationFrame(
          animate
        );
    };

    rafRef.current =
      requestAnimationFrame(
        animate
      );

    /* =====================================================
       CLEANUP
    ===================================================== */

    return () => {
      if (
        rafRef.current
      ) {
        cancelAnimationFrame(
          rafRef.current
        );
      }

      section.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      section.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      section.removeEventListener(
        "pointerup",
        stopDragging
      );

      section.removeEventListener(
        "pointercancel",
        stopDragging
      );

      section.removeEventListener(
        "pointerleave",
        handleLeave
      );
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="event-universe"
      id="event-universe"
    >
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div className="event-universe__glow" />

      <div className="event-universe__grain" />

      {/* =====================================================
          TOP META
      ===================================================== */}

      <div className="event-universe__meta event-universe__meta--left">
        <span>
          02 / DISCOVER
        </span>

        <span>
          SEATWISE ARCHIVE
        </span>
      </div>

      <div className="event-universe__meta event-universe__meta--center">
        LIVE EXPERIENCES / INDIA
      </div>

      <div className="event-universe__meta event-universe__meta--right">
        09 EVENTS
      </div>

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="event-universe__heading">
        <span className="event-universe__eyebrow">
          ENTER THE
        </span>

        <h2>
          EVENT
          <br />
          UNIVERSE

          <span className="event-universe__title-dot">
            .
          </span>
        </h2>
      </div>

      {/* =====================================================
          CENTRAL AXIS
      ===================================================== */}

      <div className="event-universe__axis">
        <span />

        <p>
          MUSIC · COMEDY · THEATRE · SPORTS · CULTURE · LIVE
        </p>

        <span />
      </div>

      {/* =====================================================
          EVENT WORLD
      ===================================================== */}

      <div className="event-universe__world">
        {events.map(
          (
            event,
            index
          ) => (
            <Link
              key={event.id}
              ref={(element) => {
                cardsRef.current[
                  index
                ] =
                  element;
              }}
              href={`/events/${event.eventId}`}
              className="event-universe__card"
              aria-label={`Open ${event.title}`}
              draggable={false}
            >
              <img
                src={event.image}
                alt={event.title}
                draggable={false}
              />

              <div className="event-universe__card-shade" />

              <span className="event-universe__number">
                {event.id}
              </span>

              <div className="event-universe__card-info">
                <span className="event-universe__card-title">
                  {event.title}
                </span>

                <span
                  className="event-universe__card-arrow"
                  aria-hidden="true"
                >
                  <i />
                </span>
              </div>

              <span className="event-universe__card-action">
                OPEN EVENT ↗
              </span>
            </Link>
          )
        )}
      </div>

      {/* =====================================================
          BOTTOM LEFT
      ===================================================== */}

      <div className="event-universe__bottom-left">
        <span>
          MOVE TO EXPLORE
        </span>

        <span>
          09 EXPERIENCES
        </span>
      </div>

      {/* =====================================================
          MOVEMENT INDICATOR
      ===================================================== */}

      <div className="event-universe__movement">
        <div className="event-universe__movement-dot" />

        <span>
          MOVE THROUGH THE UNIVERSE
        </span>
      </div>

      {/* =====================================================
          VIEW ALL
      ===================================================== */}

      <Link
        href="/events"
        className="event-universe__view-all"
      >
        <span>
          VIEW ALL EVENTS
        </span>

        <span
          className="event-universe__view-arrow"
          aria-hidden="true"
        >
          <i />
        </span>
      </Link>
    </section>
  );
}