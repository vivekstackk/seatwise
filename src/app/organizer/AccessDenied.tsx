import Link from "next/link";

/**
 * Shared refusal panel for the organizer area. The proxy only bounces
 * signed-out visitors — the session cookie carries no role — so every
 * organizer page has to re-check the role server-side, and each server
 * action checks it again independently.
 */
export default function AccessDenied({
  reason,
}: {
  reason: "signed_out" | "not_organizer";
}) {
  return (
    <main className="organizer organizer--denied">
      <div className="organizer__head">
        <span>SEATWISE® / ORGANIZER</span>
        <Link href="/">← HOME</Link>
      </div>

      <h1>
        ORGANIZERS ONLY<span>.</span>
      </h1>

      <p>
        {reason === "signed_out"
          ? "Sign in with an organizer account to manage events."
          : "This is a buyer account. Event management is restricted to organizer accounts."}
      </p>

      <p className="organizer__muted">
        Roles are granted out of band — there is no self-service
        promotion, because an organizer role also carries gate check-in
        rights. An administrator can run:{" "}
        <code>npm run set-role -- you@example.com organizer</code>
      </p>

      <Link href="/events" className="organizer__link">
        BROWSE EVENTS ↗
      </Link>
    </main>
  );
}
