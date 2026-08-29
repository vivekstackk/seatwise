"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";

function AccountPageContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [notificationDismissed, setNotificationDismissed] = useState(false);

  /*
   * =========================================================
   * ACCOUNT SUCCESS / WELCOME NOTIFICATION
   * =========================================================
   *
   * ?welcome=1 means the user has just created an account.
   *
   * Without ?welcome=1, an authenticated user sees
   * a simple WELCOME BACK message.
   *
   * Both the text and the visibility are derived from the session and
   * the URL, so they're computed during render. The effect below only
   * owns the auto-hide timer.
   */
  const accountWasJustCreated =
    searchParams.get("welcome") === "1" ||
    searchParams.get("created") === "1" ||
    searchParams.get("success") === "created";

  const notificationName = (session?.user.name || "THERE").toUpperCase();

  const notificationMessage = accountWasJustCreated
    ? `ACCOUNT CREATED SUCCESSFULLY — WELCOME, ${notificationName}`
    : `WELCOME BACK — ${notificationName}`;

  const showNotification = !isPending && !!session && !notificationDismissed;

  useEffect(() => {
    if (isPending || !session) return;

    /*
     * Automatically hide notification after 4.5 seconds.
     */
    const timer = window.setTimeout(() => {
      setNotificationDismissed(true);
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [isPending, session]);

  /*
   * =========================================================
   * AUTH REDIRECT
   * =========================================================
   */
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  /*
   * =========================================================
   * CLOSE ACCOUNT DRAWER
   * =========================================================
   */
  const close = () => {
    router.push("/events");
  };

  /*
   * =========================================================
   * LOADING
   * =========================================================
   *
   * Keep this empty so your existing drawer/loading behavior
   * is not visually changed.
   */
  if (isPending || !session) {
  return (
    <div className="account-loading">
      <div className="account-loading__content">
        <div className="account-loading__brand">
          <span className="account-loading__brand-dot" />
          <span>SEATWISE®</span>
        </div>

        <div className="account-loading__status">
          <span>ACCOUNT</span>
          <span className="account-loading__slash">/</span>
          <span>LOADING</span>
        </div>

        <div className="account-loading__line" />
      </div>
    </div>
  );
}

  const { user } = session;

  const displayName = user.name || "YOUR ACCOUNT";

  const initials =
    user.name
      ?.split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "V";

  return (
    <>
      {/* =========================================================
          BACKDROP
      ========================================================= */}

      <div
        className="ticket-overlay ticket-overlay--open"
        onClick={close}
      />

      {/* =========================================================
          LEFT EDITORIAL PANEL
          KEEPING YOUR EXISTING UI
      ========================================================= */}

      <section
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: "0 auto 0 0",
          width: "50%",
          background: "#0b0b0a",
          color: "#f1efe8",
          zIndex: 9998,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "38px 44px",
          boxSizing: "border-box",
        }}
      >
        {/* Editorial grid */}

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.12,
            backgroundImage: `
              linear-gradient(
                to right,
                transparent calc(25% - 1px),
                #f1efe8 calc(25% - 1px),
                #f1efe8 25%,
                transparent 25%
              ),
              linear-gradient(
                to bottom,
                transparent calc(33.333% - 1px),
                #f1efe8 calc(33.333% - 1px),
                #f1efe8 33.333%,
                transparent 33.333%
              )
            `,
          }}
        />

        {/* TOP */}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid rgba(241,239,232,0.16)",
            paddingBottom: "22px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.65,
            }}
          >
            SEATWISE®
          </span>

          <span
            style={{
              fontSize: "9px",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              opacity: 0.4,
            }}
          >
            ACCOUNT / 01
          </span>
        </div>

        {/* MAIN EDITORIAL AREA */}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            paddingTop: "30px",
            paddingBottom: "30px",
          }}
        >
          {/* Eyebrow */}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "22px",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#ff6b2c",
                display: "inline-block",
              }}
            />

            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                opacity: 0.55,
              }}
            >
              YOUR SEATWISE
            </span>
          </div>

          {/* YOUR */}

          <div
            style={{
              fontSize: "clamp(70px, 8vw, 150px)",
              lineHeight: "0.78",
              fontWeight: 800,
              letterSpacing: "-0.075em",
              textTransform: "uppercase",
              marginLeft: "-7px",
            }}
          >
            YOUR
          </div>

          {/* SEAT */}

          <div
            style={{
              fontSize: "clamp(70px, 8vw, 150px)",
              lineHeight: "0.78",
              fontWeight: 800,
              letterSpacing: "-0.075em",
              textTransform: "uppercase",
              marginLeft: "-7px",
            }}
          >
            SEAT.
          </div>

          <p
            style={{
              maxWidth: "420px",
              fontSize: "12px",
              lineHeight: "1.8",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(241,239,232,0.58)",
              margin: 0,
            }}
          >
            Your experiences, bookings and access — all in one place.
          </p>

          {/* MEMBER CARD */}

          <div
            style={{
              marginTop: "55px",
              maxWidth: "500px",
              borderTop: "1px solid rgba(241,239,232,0.18)",
              borderBottom: "1px solid rgba(241,239,232,0.18)",
              padding: "20px 0",
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "8px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  opacity: 0.4,
                  marginBottom: "8px",
                }}
              >
                MEMBER
              </div>

              <div
                style={{
                  fontSize: "17px",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                }}
              >
                {displayName}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "8px",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: 0.6,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  background: "#ff6b2c",
                  borderRadius: "50%",
                }}
              />

              ACTIVE
            </div>
          </div>
        </div>

        {/* BOTTOM */}

        <div
          style={{
            position: "relative",
            zIndex: 2,
            borderTop: "1px solid rgba(241,239,232,0.16)",
            paddingTop: "18px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "20px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "0.16em",
                opacity: 0.35,
                marginBottom: "7px",
              }}
            >
              ACCESS
            </div>

            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
              }}
            >
              MEMBER
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "0.16em",
                opacity: 0.35,
                marginBottom: "7px",
              }}
            >
              STATUS
            </div>

            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
              }}
            >
              VERIFIED
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "8px",
                letterSpacing: "0.16em",
                opacity: 0.35,
                marginBottom: "7px",
              }}
            >
              SEATWISE
            </div>

            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
              }}
            >
              2026
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          ACCOUNT DRAWER
          YOUR EXISTING UI — NOT REDESIGNED
      ========================================================= */}

      <aside
        className="ticket-drawer ticket-drawer--open"
        style={{
          zIndex: 9999,
        }}
      >
        {/* TOP BAR */}

        <div className="ticket-drawer__top">
          <span>SEATWISE® / ACCOUNT</span>

          <button type="button" onClick={close}>
            CLOSE ×
          </button>
        </div>

        {/* =====================================================
            SUCCESS / WELCOME NOTIFICATION
            ONLY NEW FUNCTIONALITY
        ===================================================== */}

        {showNotification && (
          <div
            role="status"
            aria-live="polite"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              marginTop: "18px",
              marginBottom: "-4px",
              background: "#11110f",
              color: "#f1efe8",
              padding: "14px 16px",
              fontSize: "9px",
              lineHeight: "1.5",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: "accountNoticeIn 0.35s ease-out",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                minWidth: "7px",
                borderRadius: "50%",
                background: "#ff6b2c",
                display: "inline-block",
              }}
            />

            <span>{notificationMessage}</span>
          </div>
        )}

        {/* =====================================================
            ACCOUNT HERO
        ===================================================== */}

        <div className="ticket-drawer__event">
          <span>ACCOUNT</span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "34px",
            }}
          >
            {/* INITIALS BOX */}

            <div
              style={{
                width: "108px",
                height: "108px",
                border: "1px solid #bbb8b0",
                padding: "9px",
                position: "relative",
                flexShrink: 0,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  border: "1px solid #d5d1c8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "30px",
                  letterSpacing: "-0.05em",
                }}
              >
                {initials}
              </div>

              <span
                style={{
                  position: "absolute",
                  right: "-4px",
                  bottom: "9px",
                  width: "7px",
                  height: "7px",
                  background: "#ff6b2c",
                  borderRadius: "50%",
                }}
              />
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(44px, 5vw, 72px)",
                  lineHeight: "0.9",
                  letterSpacing: "-0.07em",
                  fontWeight: 500,
                }}
              >
                {displayName}

                <span style={{ color: "#ff6b2c" }}>.</span>
              </h2>

              <p
                style={{
                  marginTop: "22px",
                  fontSize: "11px",
                  letterSpacing: "0.05em",
                  opacity: 0.65,
                }}
              >
                {user.email}
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================
            PROFILE
        ===================================================== */}

        <div className="account-drawer__fields">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid #bbb8b0",
              paddingTop: "18px",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                opacity: 0.5,
              }}
            >
              01 / PROFILE
            </span>

            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                opacity: 0.5,
              }}
            >
              DETAILS
            </span>
          </div>

          <div className="account-drawer__field">
            <span>FULL NAME</span>
            <strong>{user.name || "—"}</strong>
          </div>

          <div className="account-drawer__field">
            <span>EMAIL ADDRESS</span>
            <strong>{user.email}</strong>
          </div>
        </div>

        {/* =====================================================
            ACCOUNT ACCESS
        ===================================================== */}

        <div
          style={{
            marginTop: "50px",
            borderTop: "1px solid #bbb8b0",
            paddingTop: "18px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "28px",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                opacity: 0.5,
              }}
            >
              02 / YOUR SEATWISE
            </span>

            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                opacity: 0.5,
              }}
            >
              ACCESS
            </span>
          </div>

          <button
            type="button"
            className="account-drawer__secondary"
            onClick={() => router.push("/my-tickets")}
          >
            <span>
              <strong
                style={{
                  display: "block",
                  fontSize: "16px",
                  marginBottom: "7px",
                }}
              >
                MY TICKETS
              </strong>

              <small
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  opacity: 0.5,
                }}
              >
                VIEW YOUR BOOKINGS & EXPERIENCES
              </small>
            </span>

            <span>↗</span>
          </button>

          <button
            type="button"
            className="account-drawer__secondary"
            onClick={() => router.push("/events")}
          >
            <span>
              <strong
                style={{
                  display: "block",
                  fontSize: "16px",
                  marginBottom: "7px",
                }}
              >
                EXPLORE EVENTS
              </strong>

              <small
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  opacity: 0.5,
                }}
              >
                FIND YOUR NEXT EXPERIENCE
              </small>
            </span>

            <span>↗</span>
          </button>
        </div>

        {/* =====================================================
            SESSION
        ===================================================== */}

        <div
          style={{
            marginTop: "48px",
            paddingTop: "18px",
            borderTop: "1px solid #bbb8b0",
            paddingBottom: "45px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "30px",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "9px",
                  letterSpacing: "0.16em",
                  opacity: 0.5,
                  marginBottom: "8px",
                }}
              >
                03 / SESSION
              </span>

              <span
                style={{
                  fontSize: "9px",
                  letterSpacing: "0.16em",
                  opacity: 0.5,
                }}
              >
                ACCOUNT
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "20px",
            }}
          >
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "8px",
                  letterSpacing: "0.16em",
                  opacity: 0.45,
                  marginBottom: "10px",
                }}
              >
                YOU ARE SIGNED IN AS
              </span>

              <span
                style={{
                  fontSize: "12px",
                }}
              >
                {user.email}
              </span>
            </div>

            <button
              type="button"
              className="ticket-confirm"
              onClick={async () => {
                await signOut();
                router.push("/login");
              }}
            >
              <span>SIGN OUT</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================
          ONLY LOCAL ANIMATION
          NO GLOBAL CSS REQUIRED
      ========================================================= */}

      <style jsx>{`
        @keyframes accountNoticeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 900px) {
          section[aria-hidden="true"] {
            display: none !important;
          }
        }

        @media (max-width: 600px) {
          .ticket-drawer {
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <AccountPageContent />
    </Suspense>
  );
}