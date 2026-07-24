import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

export function createPgPoolConfig(): pg.PoolConfig {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  const connectionString = dbUrl.trim();
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

let _pool: pg.Pool | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getPool(): pg.Pool {
  if (!_pool) {
    const config = createPgPoolConfig();
    if (process.env.VERCEL) {
      config.max = 1;
      config.idleTimeoutMillis = 10000;
      config.connectionTimeoutMillis = 10000;
    }
    _pool = new Pool(config);
  }
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

// Lazy proxies so existing code using `pool` and `db` directly continues to work
export const pool: pg.Pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db: ReturnType<typeof drizzle<typeof schema>> = new Proxy(
  {} as ReturnType<typeof drizzle<typeof schema>>,
  {
    get(_target, prop) {
      return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
    },
  },
);

export * from "./schema";
