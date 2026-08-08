import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

export const auth = betterAuth({
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
