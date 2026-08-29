import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Next.js 16 renamed "middleware.ts" to "proxy.ts" (see AGENTS.md —
 * this repo is on a version with breaking changes vs. older training
 * data). Same runtime behavior, new file name and export name.
 *
 * Cheap, cookie-only gate — no DB round trip. This only checks that a
 * session cookie *exists and is well-formed*, not that the session is
 * still valid server-side. Expired/revoked sessions still pass this
 * check and get caught by the real session lookup wherever the page
 * or action actually reads user data. That's an acceptable trade-off
 * here: redirect obviously-logged-out visitors immediately, let the
 * slow path (real DB session check) happen only for requests that
 * already look authenticated.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // /checkin and /organizer are gated here for the cheap signed-out
  // case only. Role is NOT checked in the proxy: the cookie carries no
  // role claim, so the real gate lives in the server actions and page
  // loaders (requireStaff / requireOrganizer) where the session and its
  // role are read from the database.
  matcher: ["/my-tickets", "/account", "/checkin", "/organizer/:path*"],
};
