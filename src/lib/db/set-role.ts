import { config } from "dotenv";
config({ path: ".env.local" });

/**
 * Grants or revokes staff/organizer access:
 *
 *   npm run set-role -- someone@example.com organizer
 *   npm run set-role -- someone@example.com buyer
 *
 * Roles are deliberately assigned out of band. There is no HTTP
 * endpoint that promotes an account, and Better Auth is configured with
 * `role: { input: false }` so a sign-up request can't set its own role.
 * Otherwise anyone could self-promote and check in (i.e. invalidate)
 * other people's tickets.
 */
const VALID_ROLES = ["buyer", "organizer", "staff", "admin"] as const;

async function main() {
  const [email, role] = process.argv.slice(2);

  if (!email || !role) {
    console.error("Usage: npm run set-role -- <email> <role>");
    console.error(`Roles: ${VALID_ROLES.join(" | ")}`);
    process.exit(1);
  }

  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    console.error(`Unknown role "${role}". Use one of: ${VALID_ROLES.join(", ")}`);
    process.exit(1);
  }

  const { db } = await import("./index");
  const { user } = await import("./schema");
  const { sql } = await import("drizzle-orm");

  // Case-insensitive match: whether Better Auth normalised the address
  // at sign-up isn't something this script should have to assume.
  const updated = await db
    .update(user)
    .set({ role, updatedAt: new Date() })
    .where(sql`lower(${user.email}) = ${email.trim().toLowerCase()}`)
    .returning({ id: user.id, email: user.email, role: user.role });

  if (updated.length === 0) {
    console.error(
      `No account found for ${email}. The user has to sign up once before a role can be granted.`
    );
    process.exit(1);
  }

  console.log(`${updated[0].email} is now "${updated[0].role}".`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
