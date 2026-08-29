import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe for the host (Render health check / uptime pings).
 *
 * Deliberately touches nothing: no database, no Stripe, no session. A
 * health check that queries Postgres turns a slow database into a
 * restart loop, and on Neon's free tier it also keeps waking the
 * compute for no reason. This answers "is the Node process serving
 * HTTP", which is the only question a platform health check should ask.
 *
 * It also reports which required environment variables are missing —
 * by name only, never by value — because the usual cause of a deploy
 * that boots but 500s on every page is one unset variable.
 */
const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TICKET_SIGNING_SECRET",
] as const;

export async function GET() {
  const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

  return NextResponse.json(
    {
      ok: missingEnv.length === 0,
      uptimeSeconds: Math.round(process.uptime()),
      missingEnv,
    },
    {
      status: missingEnv.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
