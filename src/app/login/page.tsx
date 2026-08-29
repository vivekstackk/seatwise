"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";

const authVideos = [
  "/auth%20vid/vid%201.mp4",
  "/auth%20vid/vid%202.mp4",
  "/auth%20vid/vid%203.mp4",
  "/auth%20vid/vid%204.mp4",
];

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // `?mode=signup` opens on the create-account form. The seat map's
  // sign-in gate links there for its CREATE ACCOUNT action, so that
  // button lands on the form it names instead of on sign-in.
  const [mode, setMode] = useState<"login" | "signup">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { data: session, isPending } = useSession();

  /*
   * Where to go once signed in. The seat map sends people here with
   * `?next=/events/<id>` so they land back on the seat they were trying
   * to hold instead of on the generic listing.
   *
   * Only same-origin paths are honoured. An absolute URL — or a
   * protocol-relative `//evil.example` — would turn this form into an
   * open redirect, which is a credible phishing primitive on a page that
   * has just asked for a password.
   */
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  useEffect(() => {
    // Already logged in — visiting /login directly (e.g. via the nav
    // link) should send them to their account, not show the form
    // again. This is what was happening before this fix.
    if (!isPending && session) {
      router.replace(nextPath ?? "/account");
    }
  }, [isPending, session, router, nextPath]);

  /*
   * A failed OAuth callback is a server-side redirect, so the
   * signIn.social() promise below has long since resolved and cannot
   * report it. Better Auth appends `?error=<code>` to the
   * errorCallbackURL we hand it, which is this page — without reading it
   * the user just reappears on the sign-in form with no explanation,
   * which is exactly how the missing `account.scope` /
   * `access_token_expires_at` / `refresh_token_expires_at` columns
   * presented: Google succeeded, no account was created, no message.
   *
   * Derived during render rather than pushed into state by an effect, so
   * there is one source of truth for what the form is showing. The two
   * handlers below clear the parameter when the user tries again.
   */
  const oauthErrorCode = searchParams.get("error");

  const shownError =
    authError ??
    (oauthErrorCode
      ? `GOOGLE SIGN-IN FAILED — ${oauthErrorCode
          .replace(/_/g, " ")
          .toUpperCase()}`
      : null);

  /** Drop ?error=… so a retry isn't shown alongside a stale failure. */
  const clearOauthError = () => {
    if (oauthErrorCode) {
      // Keep ?next — losing it here would silently strand a visitor who
      // came from a seat map back on the generic events list.
      router.replace(
        nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"
      );
    }
  };

  const [activeVideo, setActiveVideo] = useState(0);
  const [nextVideo, setNextVideo] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const nextVideoRef = useRef<HTMLVideoElement | null>(null);

  /*
   * Start the next video slightly before
   * the current video finishes.
   */
  const handleTimeUpdate = () => {
    const video = activeVideoRef.current;

    if (!video || isTransitioning || !video.duration) {
      return;
    }

    const remaining = video.duration - video.currentTime;

    /*
     * Begin crossfade during the final 1.2 seconds.
     */
    if (remaining <= 1.2) {
      startTransition();
    }
  };

  const startTransition = () => {
    if (isTransitioning) {
      return;
    }

    const upcoming =
      (activeVideo + 1) % authVideos.length;

    setNextVideo(upcoming);
    setIsTransitioning(true);
  };

  /*
   * When the next video is ready,
   * start it underneath the current one.
   */
  useEffect(() => {
    if (
      nextVideo === null ||
      !nextVideoRef.current
    ) {
      return;
    }

    const video = nextVideoRef.current;

    video.currentTime = 0;

    const playNext = async () => {
      try {
        await video.play();
      } catch {
        // Browser autoplay restrictions are ignored
      }
    };

    if (video.readyState >= 3) {
      playNext();
    } else {
      video.addEventListener(
        "canplay",
        playNext,
        { once: true }
      );
    }

    return () => {
      video.removeEventListener(
        "canplay",
        playNext
      );
    };
  }, [nextVideo]);

  /*
   * Finish the crossfade after the CSS transition.
   */
  useEffect(() => {
    if (!isTransitioning || nextVideo === null) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveVideo(nextVideo);
      setNextVideo(null);
      setIsTransitioning(false);
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isTransitioning, nextVideo]);

  /*
   * Fallback in case a video ends before
   * the time-update transition fires.
   */
  const handleVideoEnded = () => {
    if (!isTransitioning) {
      startTransition();
    }
  };

  return (
    <main className="auth-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="auth-header">

        <Link
          href="/"
          className="auth-brand"
        >
          SEATWISE<sup>®</sup>
        </Link>

        <span className="auth-edition">
          IND / 2026
        </span>

        <Link
          href="/"
          className="auth-back"
        >
          ← BACK
        </Link>

      </header>


      {/* =====================================================
          MAIN
      ===================================================== */}

      <section className="auth-main">

        {/* =====================================================
            LEFT EDITORIAL SIDE
        ===================================================== */}

        <div className="auth-intro">

          {/* =================================================
              VIDEO BACKGROUND
          ================================================= */}

          <div
            className="auth-intro__video"
            aria-hidden="true"
          >

            {/* CURRENT VIDEO */}

            <video
              ref={activeVideoRef}
              src={authVideos[activeVideo]}
              autoPlay
              muted
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              className={
                isTransitioning
                  ? "auth-video auth-video--fade-out"
                  : "auth-video auth-video--active"
              }
            />


            {/* NEXT VIDEO */}

            {nextVideo !== null && (
              <video
                ref={nextVideoRef}
                src={authVideos[nextVideo]}
                muted
                playsInline
                preload="auto"
                className="auth-video auth-video--fade-in"
              />
            )}

          </div>


          {/* =================================================
              DARK / BLEND OVERLAY
          ================================================= */}

          <div
            className="auth-intro__video-overlay"
            aria-hidden="true"
          />


          {/* =================================================
              EDITORIAL CONTENT
          ================================================= */}

          <span className="auth-eyebrow">

            {mode === "login"
              ? "05 / YOUR ACCOUNT"
              : "05 / JOIN SEATWISE"}

          </span>


          <h1>

            {mode === "login" ? (
              <>
                WELCOME
                <br />
                BACK<span>.</span>
              </>
            ) : (
              <>
                CLAIM
                <br />
                YOUR PLACE<span>.</span>
              </>
            )}

          </h1>


          <p>

            {mode === "login"
              ? "SIGN IN TO ACCESS YOUR BOOKINGS, TICKETS AND UPCOMING EXPERIENCES."
              : "CREATE YOUR SEATWISE ACCOUNT AND KEEP EVERY EXPERIENCE IN ONE PLACE."}

          </p>


          <div className="auth-intro__bottom">

            <span>DISCOVER</span>

            <span>BOOK</span>

            <span>BE THERE</span>

          </div>

        </div>


        {/* =====================================================
            FORM SIDE
        ===================================================== */}

        <div className="auth-form-wrap">

          {/* FORM HEADER */}

          <div className="auth-form-header">

            <div>

              <span>
                {mode === "login"
                  ? "SIGN IN"
                  : "CREATE ACCOUNT"}
              </span>

              <strong>
                {mode === "login"
                  ? "YOUR SEAT AWAITS"
                  : "WELCOME TO SEATWISE"}
              </strong>

            </div>

            <span className="auth-form-number">

              {mode === "login"
                ? "01"
                : "02"}

            </span>

          </div>


          {/* FORM */}

          <form
            className="auth-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setAuthError(null);
              clearOauthError();

              const formData = new FormData(event.currentTarget);
              const email = String(formData.get("email") ?? "");
              const password = String(formData.get("password") ?? "");
              const name = String(formData.get("name") ?? "");

              // Basic guard — real validation still happens server-side
              // inside Better Auth; this just avoids an empty-field
              // round trip.
              if (!email || !password) {
                setAuthError("Email and password are required.");
                return;
              }

              setIsSubmitting(true);

              const result =
                mode === "signup"
                  ? await signUp.email({ email, password, name })
                  : await signIn.email({ email, password });

              setIsSubmitting(false);

              if (result.error) {
                // Better Auth returns a message safe to show the user
                // (e.g. "Invalid email or password") — never leak
                // internals here.
                setAuthError(
                  result.error.message ?? "Something went wrong. Try again."
                );
                return;
              }

              router.push(
                nextPath ??
                  (mode === "signup" ? "/account?welcome=1" : "/events")
              );
            }}
          >

            {/* FULL NAME */}

            {mode === "signup" && (
              <label className="auth-field">

                <span>
                  FULL NAME
                </span>

                <input
                  type="text"
                  name="name"
                  placeholder="YOUR NAME"
                  autoComplete="name"
                />

              </label>
            )}


            {/* EMAIL */}

            <label className="auth-field">

              <span>
                EMAIL ADDRESS
              </span>

              <input
                type="email"
                name="email"
                placeholder="YOUR@EMAIL.COM"
                autoComplete="email"
                required
              />

            </label>


            {/* PASSWORD */}

            <label className="auth-field">

              <span>
                PASSWORD
              </span>

              <input
                type="password"
                name="password"
                placeholder="••••••••"
                autoComplete={
                  mode === "login"
                    ? "current-password"
                    : "new-password"
                }
                required
              />

            </label>


            {/* FORGOT PASSWORD */}

            {mode === "login" && (
              <div className="auth-forgot">

                <button
                  type="button"
                  onClick={() => {}}
                >
                  FORGOT PASSWORD?
                </button>

              </div>
            )}


            {/* AUTH ERROR */}

            {shownError && (
              <p className="auth-error" role="alert">
                {shownError}
              </p>
            )}


            {/* SUBMIT */}

            <button
              type="submit"
              className="auth-submit"
              disabled={isSubmitting}
            >

              <span>
                {isSubmitting
                  ? "PLEASE WAIT..."
                  : mode === "login"
                  ? "SIGN IN"
                  : "CREATE ACCOUNT"}
              </span>

              <span>
                ↗
              </span>

            </button>

          </form>


          {/* =================================================
              DIVIDER
          ================================================= */}

          <div className="auth-divider">

            <span />

            <small>
              OR
            </small>

            <span />

          </div>


          {/* =================================================
              GOOGLE
          ================================================= */}

          <button
            type="button"
            className="auth-google"
            onClick={async () => {
              setAuthError(null);
              clearOauthError();

              const { error } = await signIn.social({
                provider: "google",
                // Returning buyer → straight to their bookings, unless
                // they arrived from a seat map (?next=…).
                callbackURL: nextPath ?? "/account",
                // First Google sign-in creates the user from the Google
                // profile (name and picture come back in the userinfo
                // response), so it gets the welcome treatment instead.
                newUserCallbackURL: nextPath ?? "/account?welcome=1",
                // Without this a failure inside the callback lands on
                // Better Auth's own /api/auth/error page, which says
                // nothing this app's user can act on. Send them back
                // here; the effect above turns ?error=… into a message.
                errorCallbackURL: "/login",
              });

              if (!error) {
                return;
              }

              /*
               * This used to report "unavailable" for every failure,
               * which asserted a cause it had not checked. It cost real
               * debugging time: the actual fault was a 500 from a
               * missing `verification.updated_at` column, and the button
               * insisted the provider was not configured.
               *
               * "Unavailable" is now claimed only when the provider
               * genuinely is not registered — Better Auth answers 404
               * for that. Anything else surfaces what the server
               * actually said.
               */
              const notConfigured =
                error.status === 404 ||
                /provider/i.test(error.message ?? "");

              setAuthError(
                notConfigured
                  ? "GOOGLE SIGN-IN IS UNAVAILABLE — USE EMAIL AND PASSWORD"
                  : `GOOGLE SIGN-IN FAILED${
                      error.status ? ` (${error.status})` : ""
                    } — ${(
                      error.message ?? "NO DETAIL RETURNED"
                    ).toUpperCase()}`
              );
            }}
          >

            <span className="auth-google__icon">
              G
            </span>

            <span>
              CONTINUE WITH GOOGLE
            </span>

            <span>
              ↗
            </span>

          </button>


          {/* =================================================
              SWITCH LOGIN / SIGNUP
          ================================================= */}

          <div className="auth-switch">

            <span>

              {mode === "login"
                ? "NEW TO SEATWISE?"
                : "ALREADY HAVE AN ACCOUNT?"}

            </span>

            <button
              type="button"
              onClick={() =>
                setMode(
                  mode === "login"
                    ? "signup"
                    : "login"
                )
              }
            >

              {mode === "login"
                ? "CREATE ACCOUNT"
                : "SIGN IN"}{" "}

              ↗

            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="auth-footer">

        <span>
          SEATWISE®
        </span>

        <span>
          LIVE EVENT TICKETING
        </span>

        <span>
          © 2026
        </span>

      </footer>

    </main>
  );
}
/**
 * `useSearchParams` needs a Suspense boundary for this route to keep
 * prerendering — same shape as /account. The fallback is null because the
 * form's own markup is what the boundary resolves to almost immediately.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
