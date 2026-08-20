import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// drizzle-kit runs as its own CLI process, separate from `next dev` —
// it does NOT get Next.js's automatic .env.local loading. Without this,
// process.env.DIRECT_DATABASE_URL is undefined here even though it's set
// correctly in .env.local, which is exactly the error this fixes:
// "Please provide required params for Postgres driver: [x] url: undefined"
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // IMPORTANT: this must be the DIRECT (unpooled) Neon connection
    // string, not the pooled one used by the running app. Neon's
    // pooled connections go through PgBouncer in transaction mode,
    // which does not reliably support the session-level behavior
    // drizzle-kit needs to apply migrations — this is what caused
    // migrate to hang indefinitely at "applying migrations...".
    // The app's runtime queries (src/lib/db/index.ts) correctly keep
    // using the pooled DATABASE_URL — only migrations need the direct one.
    url: process.env.DIRECT_DATABASE_URL!,
  },
});
