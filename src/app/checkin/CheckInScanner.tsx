"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkInTicket } from "@/lib/db/seats";
import type { CheckInResult } from "@/lib/db/holds";

type Outcome = CheckInResult | { status: "error"; message: string };

/**
 * Gate scanner.
 *
 * The camera path decodes frames locally with jsQR and then calls the
 * same server action the paste box does, so there is exactly one
 * check-in code path and the "valid -> used" transition stays a single
 * conditional UPDATE in the database.
 *
 * jsQR is loaded lazily: it is ~40 KB of decoder that nothing else in
 * the app needs, and the paste fallback has to keep working on browsers
 * or contexts where the camera is unavailable (getUserMedia requires a
 * secure context — https, or localhost during development).
 */
export default function CheckInScanner({
  staffName,
  role,
}: {
  staffName: string;
  role: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  // Guards against the decode loop firing the same token dozens of
  // times a second while the ticket is still in front of the lens.
  const busyRef = useRef(false);
  const lastRef = useRef<{ token: string; at: number }>({ token: "", at: 0 });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [scannedSeat, setScannedSeat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ admitted: 0, rejected: 0 });

  /** Accepts a bare token, or a URL that carries one as ?token=. */
  const extractToken = (raw: string): string => {
    const value = raw.trim();
    if (!value.includes("token=")) return value;

    try {
      return new URL(value).searchParams.get("token")?.trim() || value;
    } catch {
      return value.split("token=")[1]?.split("&")[0]?.trim() || value;
    }
  };

  const submit = useCallback(async (rawToken: string) => {
    const value = extractToken(rawToken);
    if (!value) return;

    const now = Date.now();
    if (lastRef.current.token === value && now - lastRef.current.at < 4000) {
      return;
    }
    lastRef.current = { token: value, at: now };

    busyRef.current = true;
    setLoading(true);
    setOutcome(null);

    try {
      const result = await checkInTicket(value);
      setOutcome(result);
      setScannedSeat("seatId" in result ? result.seatId : null);
      setCounts((c) =>
        result.status === "valid"
          ? { ...c, admitted: c.admitted + 1 }
          : { ...c, rejected: c.rejected + 1 }
      );
    } catch (err) {
      setOutcome({
        status: "error",
        message:
          err instanceof Error ? err.message : "Something went wrong. Try again.",
      });
    } finally {
      setLoading(false);
      // Short cooldown so the operator can read the verdict before the
      // next frame is decoded.
      setTimeout(() => {
        busyRef.current = false;
      }, 1200);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);
  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "This browser can't open a camera here. getUserMedia needs a secure context — use https, or localhost in development. Paste the token instead."
      );
      return;
    }

    try {
      const jsQR = (await import("jsqr")).default;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOn(true);

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);

        const canvas = canvasRef.current;
        if (!canvas || !video.videoWidth || busyRef.current) return;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "dontInvert",
        });

        if (code?.data) {
          void submit(code.data);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      stopCamera();
      setCameraError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Allow it in the browser, or paste the token below."
          : "Couldn't start the camera. Paste the token below instead."
      );
    }
  }, [stopCamera, submit]);

  // Release the camera when the operator navigates away — a live
  // MediaStream keeps the device light on until its tracks are stopped.
  useEffect(() => stopCamera, [stopCamera]);
  return (
    <main className="checkin">
      <div className="checkin__head">
        <span>SEATWISE® / CHECK-IN</span>
        <Link href="/">← HOME</Link>
      </div>

      <h1>
        SCAN TICKET<span>.</span>
      </h1>

      <div className="checkin__operator">
        <span>
          {staffName.toUpperCase()} / {role.toUpperCase()}
        </span>

        <span>
          ADMITTED {String(counts.admitted).padStart(2, "0")} / REJECTED{" "}
          {String(counts.rejected).padStart(2, "0")}
        </span>
      </div>

      <div className="checkin__camera">
        <video
          ref={videoRef}
          className={cameraOn ? "checkin__video" : "checkin__video is-hidden"}
          muted
          playsInline
        />

        <canvas ref={canvasRef} className="checkin__canvas" />

        {!cameraOn && (
          <div className="checkin__camera-idle">
            <span>CAMERA OFF</span>
          </div>
        )}

        {cameraOn && <div className="checkin__reticle" aria-hidden="true" />}
      </div>

      <div className="checkin__camera-actions">
        {cameraOn ? (
          <button type="button" onClick={stopCamera}>
            STOP CAMERA
          </button>
        ) : (
          <button type="button" onClick={startCamera}>
            START CAMERA
          </button>
        )}
      </div>

      {cameraError && <p className="checkin__error">{cameraError}</p>}
      <form
        className="checkin__manual"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(token);
        }}
      >
        <label htmlFor="checkin-token">OR PASTE TOKEN</label>

        <textarea
          id="checkin-token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste the ticket token (or its check-in URL)"
          rows={3}
          spellCheck={false}
        />

        <button type="submit" disabled={loading || !token.trim()}>
          {loading ? "CHECKING…" : "VERIFY & CHECK IN"}
        </button>
      </form>

      {outcome && (
        <div
          className={`checkin__result checkin__result--${
            outcome.status === "valid" ? "ok" : "bad"
          }`}
          role="status"
          aria-live="polite"
        >
          {outcome.status === "valid" && (
            <>
              <strong>VALID — CHECKED IN</strong>
              <p>
                {outcome.eventTitle} / SEAT {outcome.seatId}
              </p>
            </>
          )}

          {outcome.status === "already_used" && (
            <>
              <strong>ALREADY USED — DO NOT ADMIT</strong>
              <p>
                Seat {outcome.seatId} was checked in
                {outcome.usedAt
                  ? ` at ${outcome.usedAt.toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}`
                  : " earlier"}
                .
              </p>
            </>
          )}

          {outcome.status === "cancelled" && (
            <>
              <strong>CANCELLED TICKET — DO NOT ADMIT</strong>
              <p>Seat {outcome.seatId} is no longer valid for entry.</p>
            </>
          )}

          {outcome.status === "not_found" && (
            <strong>INVALID TICKET — NOT IN SYSTEM</strong>
          )}

          {outcome.status === "error" && (
            <>
              <strong>COULDN&apos;T CHECK THIS TICKET</strong>
              <p>{outcome.message}</p>
            </>
          )}

          {scannedSeat && outcome.status === "valid" && (
            <span className="checkin__result-seat">{scannedSeat}</span>
          )}
        </div>
      )}
    </main>
  );
}
