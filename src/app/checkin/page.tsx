"use client";

import { useState } from "react";
import { checkInTicket } from "@/lib/db/seats";

export default function CheckInPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await checkInTicket(token.trim());
      setResult(res);
    } catch (err) {
      setResult({ status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        maxWidth: "480px",
        margin: "0 auto",
        padding: "6rem 1.5rem 4rem",
      }}
    >
      <p
        style={{
          fontSize: "0.75rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#6b7280",
          marginBottom: "0.5rem",
        }}
      >
        SeatWise / Check-In
      </p>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "2rem" }}>
        Scan Ticket
      </h1>

      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.5rem" }}>
        No camera scanner yet — paste the ticket&apos;s token below (found on
        the ticket in My Tickets) to simulate a scan.
      </p>

      <textarea
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste qr_token here"
        rows={3}
        style={{
          width: "100%",
          padding: "0.9rem",
          border: "1px solid #d1d5db",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          marginBottom: "1rem",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleScan}
        disabled={loading || !token.trim()}
        style={{
          width: "100%",
          padding: "0.9rem",
          background: "#111827",
          color: "#fff",
          border: "none",
          fontSize: "0.8rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
          marginBottom: "1.5rem",
        }}
      >
        {loading ? "Checking..." : "Verify & Check In"}
      </button>

      {result && (
        <div
          style={{
            padding: "1rem",
            border: "1px solid",
            borderColor:
              result.status === "valid" ? "#16a34a" : "#dc2626",
            background:
              result.status === "valid" ? "#f0fdf4" : "#fef2f2",
          }}
        >
          {result.status === "valid" && (
            <>
              <strong style={{ color: "#16a34a" }}>VALID — CHECKED IN</strong>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                {result.eventTitle} — Seat {result.seatId}
              </p>
            </>
          )}

          {result.status === "already_used" && (
            <>
              <strong style={{ color: "#dc2626" }}>ALREADY USED</strong>
              <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>
                Seat {result.seatId} was checked in at{" "}
                {new Date(result.usedAt).toLocaleString("en-IN")}
              </p>
            </>
          )}

          {result.status === "not_found" && (
            <strong style={{ color: "#dc2626" }}>INVALID TICKET</strong>
          )}

          {result.status === "error" && (
            <strong style={{ color: "#dc2626" }}>
              Something went wrong. Try again.
            </strong>
          )}
        </div>
      )}
    </main>
  );
}