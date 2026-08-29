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

Two values must differ from local:

- `BETTER_AUTH_URL` — the deployed origin. It also builds Stripe's
  `success_url`, so localhost here sends paying customers to their own
  machine.
- `STRIPE_WEBHOOK_SECRET` — the hosted endpoint's secret from the Stripe
  dashboard (add `<origin>/api/webhooks/stripe` as an endpoint for
  `checkout.session.completed`), not the CLI's.

Google OAuth needs `<origin>/api/auth/callback/google` added as an
authorized redirect URI.

`GET /api/health` is the health check: no database, no Stripe, and it
names any missing environment variable (never its value).

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
