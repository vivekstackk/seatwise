import Link from "next/link";
import { getCheckInAccess } from "@/lib/db/seats";
import CheckInScanner from "./CheckInScanner";

// Reads the live session role, so it must never be prerendered.
export const dynamic = "force-dynamic";

/**
 * Gate check-in.
 *
 * Previously this page was open to any signed-in account, which meant
 * any buyer who could read a token could burn someone else's ticket —
 * the "each ticket admits once" guarantee was effectively decorative.
 * The proxy only redirects signed-out visitors (the session cookie
 * carries no role), so the role check has to happen here, server-side,
 * and again inside the checkInTicket action itself.
 */
export default async function CheckInPage() {
  const access = await getCheckInAccess();

  if (!access.allowed) {
    return (
      <main className="checkin">
        <div className="checkin__head">
          <span>SEATWISE® / CHECK-IN</span>
          <Link href="/">← HOME</Link>
        </div>

        <h1>
          STAFF ONLY<span>.</span>
        </h1>

        <p className="checkin__note">
          {access.reason === "signed_out"
            ? "Sign in with a staff account to check tickets in."
            : "This account is a buyer account. Check-in is restricted to organizer or staff accounts."}
        </p>

        <p className="checkin__note checkin__note--muted">
          Roles are assigned out of band — there is no self-service
          promotion. An administrator can grant access with:{" "}
          <code>npm run set-role -- you@example.com organizer</code>
        </p>

        <Link href="/my-tickets" className="checkin__link">
          GO TO MY TICKETS ↗
        </Link>
      </main>
    );
  }

  return <CheckInScanner staffName={access.name ?? "STAFF"} role={access.role} />;
}
