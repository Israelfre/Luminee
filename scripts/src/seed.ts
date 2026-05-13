/**
 * Seed: 1) usuário admin na tabela `admin_users` (se vazia)
 *       2) salão demo (se não houver salões)
 *
 * Run: pnpm --filter @workspace/scripts run seed
 *
 * Credenciais vêm só de variáveis de ambiente (ficheiro `.env` na raiz do repo, gitignored).
 * Não há defaults de senha/e-mail no código — ver `.env.example`.
 */
import "./load-env-for-seed";
import { db, salonsTable, adminUsersTable } from "@workspace/db";
import { count } from "drizzle-orm";
import bcrypt from "bcryptjs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(
      `${name} é obrigatório para o seed (defina na raiz do repo em .env — ver .env.example).`,
    );
  }
  return v.trim();
}

async function seed() {
  const [adminCountRow] = await db.select({ total: count() }).from(adminUsersTable);
  if (Number(adminCountRow?.total) === 0) {
    const adminEmail = requireEnv("ADMIN_EMAIL").toLowerCase();
    const adminPassword = requireEnv("ADMIN_PASSWORD");
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await db.insert(adminUsersTable).values({
      email: adminEmail,
      passwordHash,
    });
    console.log(`✅ Admin criado: ${adminEmail}`);
  } else {
    console.log("Admin já existe — ignorando criação de admin.");
  }

  const [row] = await db.select({ total: count() }).from(salonsTable);
  if (Number(row?.total) > 0) {
    console.log("DB já tem salões — pulando seed de salão demo.");
    process.exit(0);
  }

  const demoEmail = requireEnv("DEMO_SALON_EMAIL").toLowerCase();
  const demoPassword = requireEnv("DEMO_SALON_PASSWORD");
  const hashed = await bcrypt.hash(demoPassword, 10);

  await db.insert(salonsTable).values({
    name: "Luminee Demo",
    email: demoEmail,
    phone: "(11) 99999-9999",
    password: hashed,
    clerkUserId: null,
    plan: "gratuito",
  });

  console.log(`✅ Salão demo criado: ${demoEmail}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
