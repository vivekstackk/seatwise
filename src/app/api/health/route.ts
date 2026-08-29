import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/appUrl";

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
 *
 * `authOrigin` and `googleSignIn` are reported for the same reason.
 * Those two are behind the failures that look nothing like a config
 * problem from the outside: a wrong origin shows up as "Invalid origin"
 * on sign-up, and absent Google credentials show up as a sign-in button
 * that refuses. Comparing `authOrigin` against the address in the
 * browser bar diagnoses the first in one glance.
 *
 * `googleRedirectUri` is the exact string this deployment sends to
 * Google as `redirect_uri`. Google's `Error 400: redirect_uri_mismatch`
 * means it is not registered on the OAuth client verbatim — one
 * character, one trailing slash or http-vs-https is enough — so having
 * the literal value to paste removes the guesswork. It is derived from
 * the origin and contains no credential.
 */
const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
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
      authOrigin: getAppOrigin(),
      authOriginSource: process.env.BETTER_AUTH_URL
        ? "BETTER_AUTH_URL"
        : process.env.RENDER_EXTERNAL_URL
        ? "RENDER_EXTERNAL_URL"
        : "localhost-fallback",
      googleSignIn:
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
          ? "configured"
          : "disabled",
      googleRedirectUri: `${getAppOrigin()}/api/auth/callback/google`,
      // Enough of the client ID to confirm this deployment is using the
      // same OAuth client you edited in the console — the other common
      // cause of redirect_uri_mismatch is the URI being registered on a
      // different client. The `.apps.googleusercontent.com` suffix is
      // stripped first: every client ID ends with it, so a plain tail
      // distinguishes nothing.
      googleClientIdTail: process.env.GOOGLE_CLIENT_ID
        ? `…${process.env.GOOGLE_CLIENT_ID.replace(
            /\.apps\.googleusercontent\.com$/,
            ""
          ).slice(-6)}`
        : null,
    },
    {
      status: missingEnv.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
