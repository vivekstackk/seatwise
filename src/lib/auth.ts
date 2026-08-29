import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";
import { getAppOrigin, getTrustedOrigins } from "./appUrl";

/**
 * Google is registered only when both credentials are present.
 * Registering it with `undefined as string` (the previous shape) makes
 * /api/auth/sign-in/social fail at request time with an opaque provider
 * error on any deploy that forgot the two variables — better to not
 * offer the provider at all than to offer a broken one.
 */
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const googleSignInEnabled = Boolean(
  googleClientId && googleClientSecret
);

export const auth = betterAuth({
  /**
   * Resolved rather than read straight from BETTER_AUTH_URL. When that
   * variable is missing or still points at localhost on a hosted deploy,
   * Better Auth's origin check rejects every sign-in and sign-up with
   * "Invalid origin" — and because server actions call getSession, seat
   * holds fail too. See src/lib/appUrl.ts.
   */
  baseURL: getAppOrigin(),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    // Matches the existing login/signup UI exactly (email + password
    // fields already exist in login/page.tsx — see FULL NAME / EMAIL /
    // PASSWORD fields). No email verification flow yet; add before
    // real production use.
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: googleSignInEnabled
    ? {
        google: {
          clientId: googleClientId as string,
          clientSecret: googleClientSecret as string,
        },
      }
    : {},
  account: {
    // If someone signs up with email/password using an address, then
    // later clicks "Continue with Google" using that same email,
    // this links the Google login to the SAME existing user instead
    // of creating a second, separate account with no ticket history.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "buyer",
        input: false, // role is never settable by the client — server only
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});

export type Session = typeof auth.$Infer.Session;