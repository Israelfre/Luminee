import { pgTable, text, serial, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export interface BusinessHours {
  [day: string]: { open: string; close: string; enabled: boolean };
}

export const salonsTable = pgTable("salons", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  password: text("password"),
  plan: text("plan").notNull().default("gratuito"),
  planExpiresAt: date("plan_expires_at"),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  businessHours: jsonb("business_hours").$type<BusinessHours>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSalonSchema = createInsertSchema(salonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSalon = z.infer<typeof insertSalonSchema>;
export type Salon = typeof salonsTable.$inferSelect;
