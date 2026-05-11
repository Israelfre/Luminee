/**
 * Seed script: creates the initial admin-demo salon if the DB is empty.
 * Run: pnpm --filter @workspace/scripts run seed
 */
import { db, salonsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  const [row] = await db.select({ total: count() }).from(salonsTable);
  if (Number(row?.total) > 0) {
    console.log("DB already has salons — skipping seed.");
    process.exit(0);
  }

  const password = process.env["DEMO_SALON_PASSWORD"] ?? "demo123456";
  const hashed = await bcrypt.hash(password, 10);

  await db.insert(salonsTable).values({
    name: "Luminee Demo",
    email: "demo@luminee.com",
    phone: "(11) 99999-9999",
    password: hashed,
    clerkUserId: null,
    plan: "gratuito",
  });

  console.log(`✅ Demo salon created. Email: demo@luminee.com | Password: ${password}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
