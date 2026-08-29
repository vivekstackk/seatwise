/**
 * The origin this deployment is actually served from.
 *
 * Better Auth rejects any sign-in / sign-up POST whose `Origin` header
 * doesn't match the origin it was configured with, answering with a bare
 * "Invalid origin". So a `BETTER_AUTH_URL` left at localhost doesn't
 * degrade gracefully on a hosted deploy — it makes authentication fail
 * completely, and with it every server action that looks up a session.
 *
 * Rather than depend on one hand-entered variable being right, resolve
 * the origin in order of specificity:
 *
 *   1. BETTER_AUTH_URL      — explicit, wins when set (custom domains).
 *   2. RENDER_EXTERNAL_URL  — injected automatically by Render, so a
 *                             Render deploy is correct with no config.
 *   3. localhost:PORT       — development default.
 *
 * Trailing slashes are stripped: Better Auth and Stripe both build URLs
 * by concatenation, and `https://host//api/...` is a different origin to
 * some proxies.
 */
function normalise(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

export function getAppOrigin(): string {
  const explicit = process.env.BETTER_AUTH_URL;
  if (explicit) {
    return normalise(explicit);
  }

  const render = process.env.RENDER_EXTERNAL_URL;
  if (render) {
    return normalise(render);
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Every origin allowed to POST to the auth endpoints.
 *
 * Render injects RENDER_EXTERNAL_URL even when BETTER_AUTH_URL is set to
 * something else, and both hostnames can reach the app — trusting both
 * means a half-finished custom-domain migration doesn't lock everyone
 * out mid-flight.
 */
export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([getAppOrigin()]);

  if (process.env.RENDER_EXTERNAL_URL) {
    origins.add(normalise(process.env.RENDER_EXTERNAL_URL));
  }

  return [...origins];
}
