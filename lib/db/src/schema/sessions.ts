import { pgTable, varchar, json, timestamp } from "drizzle-orm/pg-core";

/** Tabela usada por `connect-pg-simple` (mesmo layout do gestorx7). */
export const sessionsTable = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
