# SeatWise

Seat-level event ticketing. The core of it is a seat hold that only one
buyer can ever win, proven by an automated concurrency test rather than
by hoping.

## Stack

- Next.js 16.3 (App Router, Turbopack). Note: `middleware.ts` is called
  `proxy.ts` in this version — see `AGENTS.md`.
- Neon serverless Postgres over the HTTP driver + Drizzle ORM. The HTTP
  driver has **no transactions**, which is why the hold is written as a
  single data-modifying CTE instead of a transaction.
- Better Auth (email/password + Google), Stripe Checkout, HMAC-signed QR
  tickets.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill it in
npx drizzle-kit migrate            # needs DIRECT_DATABASE_URL
npm run db:seed
npm run dev
```

Stripe webhooks locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`. It changes
every time `stripe listen` restarts, and a stale value makes the webhook
reject every event — payment succeeds and no ticket is ever issued.

### When a payment leaves no ticket

The webhook is not the only way an order gets fulfilled. Returning from
Checkout, and loading `/my-tickets`, both ask Stripe directly whether the
session was paid and issue the tickets on the spot — so a missing
listener, an unregistered endpoint or a stale `whsec_…` no longer means a
paid order with no ticket. Fulfilment is idempotent, so the push and pull
paths can race harmlessly.

Register the webhook anyway: it is the fast path, and the pull only runs
while someone is looking.

If the payment genuinely has not cleared, the drawer stops on a "PAYMENT
TAKEN / YOUR TICKET ISN'T ISSUED YET" panel with the order reference and
a CHECK AGAIN button, rather than an animation that never ends.

One case fulfilment refuses: a seat that has since been ticketed on
another order. That happens when an old order was paid, never fulfilled,
its hold expired, and the seat was resold. Issuing there would put two
valid tickets on one seat, so the order is left `pending` and logged as
`seat_conflict` — an oversell to settle out of band, which is why the
guard exists rather than a second ticket.

## Verification

```bash
npm run test:concurrency
```

This is the most important check in the project. It fires 20 parallel
holds at one seat ten times over (exactly one must win each time),
proves the 8-seat-per-buyer cap holds under parallel requests, and
proves a release frees the seat for someone else while ignoring a
release requested by a non-owner. Re-run it after **any** change to
`src/lib/db/holds.ts`.

```bash
npm run build
npm run lint
```

## Roles

There is no self-service role promotion, because organizer also carries
gate check-in rights. Roles are granted out of band:

```bash
npm run set-role -- someone@example.com organizer
```

`buyer` (default) books seats. `staff` can check tickets in at
`/checkin`. `organizer` can do that plus manage its own events at
`/organizer`. `admin` is both.

The nine seeded demo events have a null `organizer_id` on purpose — they
are fixtures, so they are not editable through the organizer UI.

## Deploying (Render)

`render.yaml` records the build/start commands and the full environment
variable list. Set every `sync: false` variable in the dashboard before
deploying: the build itself imports the database and Stripe clients, so
a missing variable fails the build rather than surfacing later.

Migrations are not run by the build. Apply them yourself against
whatever database Render's `DATABASE_URL` points at — with
`DIRECT_DATABASE_URL` set to that database's unpooled string — before
the first deploy and after any schema change:

```bash
npx drizzle-kit migrate
```

Skipping this fails in ways that don't look like a missing migration.
Better Auth validates its tables against the Drizzle schema at runtime,
so one absent column takes out only the feature that touches it: a
`verification` table without `updated_at` breaks Google sign-in with a
500 while email/password keeps working, and an `account` table without
`scope` / `access_token_expires_at` / `refresh_token_expires_at` is worse
than that — Google succeeds, comes back, and silently creates no account,
because the adapter's error is swallowed and reported as
`unable_to_create_user`. Those three columns land in `0003`.

Two values must differ from local:

- `BETTER_AUTH_URL` — **leave it unset on Render.** The app falls back to
  `RENDER_EXTERNAL_URL`, which Render injects and which is always the real
  origin. Set it only for a custom domain, and then only to that exact
  origin. A localhost value here is worse than nothing: Better Auth
  rejects every sign-in and sign-up with `Invalid origin`, and because
  server actions look up a session, seat holds fail too.
- `STRIPE_WEBHOOK_SECRET` — the hosted endpoint's secret from the Stripe
  dashboard (add `<origin>/api/webhooks/stripe` as an endpoint for
  `checkout.session.completed`), not the CLI's.

Google OAuth needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` set —
with either missing, the provider is not registered and the "Continue
with Google" button says so instead of failing obscurely. Email and
password still work. Google Cloud Console needs
`<origin>/api/auth/callback/google` as an authorized redirect URI.

A first Google sign-in creates the user from the Google profile: `name`
and `image` come from Google's userinfo response, `email_verified` from
Google, and `role` defaults to `buyer`. `/account` shows the Google
picture when there is one and falls back to initials. A failure inside
the callback now returns to `/login?error=<code>` and the form prints the
code, rather than landing on Better Auth's own error page.

`GET /api/health` is the health check: no database, no Stripe, and it
names any missing environment variable (never its value). It also reports
`authOrigin` — if that doesn't match the address in your browser, sign-in
is broken and that is why — and `googleRedirectUri`, the exact string
sent to Google. `Error 400: redirect_uri_mismatch` means that string is
not registered verbatim under **Authorized redirect URIs** on the OAuth
client named by `GOOGLE_CLIENT_ID`; paste it from here rather than
retyping it, and note that "Authorized JavaScript origins" is a different
field that does not satisfy it.

### "Service waking up / application loading"

On Render's free plan the instance is spun down after ~15 minutes idle
and that interstitial is served while it cold-starts, which takes up to
about a minute. It is the plan's behavior, not a fault — but if it never
resolves, check `/api/health` and the deploy logs, in that order. A
paid instance, or an external uptime ping, removes the spin-down.

Camera QR scanning at `/checkin` needs a secure context: it works on the
deployed HTTPS origin and on `localhost`, and not over a plain-HTTP LAN
address.

## Out of scope

Cancellations and refunds. A ticket can be voided in the database
(`status = 'cancelled'`, which check-in refuses distinctly from "already
used"), but there is no refund flow.
