import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export function createPgPoolConfig(): pg.PoolConfig {
  const connectionString = process.env.DATABASE_URL!.trim();
  if (/sslmode=\s*disable/i.test(connectionString)) {
    return { connectionString };
  }

  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

  const targetsLocal =
    /@localhost(?:[:/]|$)|@127\.0\.0\.1(?:[:/]|$)|:\/\/localhost[\/:]/i.test(
      connectionString,
    );

  const dockerInternal =
    /@(?:postgres|pgsql|db)(?::\d+)?\//i.test(connectionString);

  const hosted =
    /\.render\.com/i.test(connectionString) ||
    /\.internal\b/i.test(connectionString) ||
    /@dpg-/i.test(connectionString) ||
    /supabase\.co|neon\.tech|pooler\.|rds\.amazonaws\.com/i.test(
      connectionString,
    );

  const sslModeInUrl =
    /sslmode=\s*(require|verify-full|verify-ca|prefer|allow)/i.test(
      connectionString,
    );

  const prod = process.env.NODE_ENV === "production";

  const useSsl =
    sslModeInUrl ||
    hosted ||
    (prod && !targetsLocal && !dockerInternal);

  return {
    connectionString,
    ...(useSsl ? { ssl: { rejectUnauthorized } } : {}),
  };
}

export const pool = new Pool(createPgPoolConfig());
export const db = drizzle(pool, { schema });

export * from "./schema";
