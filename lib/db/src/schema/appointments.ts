import { pgTable, text, serial, integer, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { salonsTable } from "./salons.js";
import { clientsTable } from "./clients.js";
import { servicesTable } from "./services.js";
import { employeesTable } from "./employees.js";

export const appointmentsTable = pgTable("appointments", {
  id: serial("id").primaryKey(),
  salonId: integer("salon_id").notNull().references(() => salonsTable.id, { onDelete: "cascade" }),
  clientId: integer("client_id").notNull().references(() => clientsTable.id, { onDelete: "restrict" }),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "restrict" }),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  // Payment tracking
  paymentStatus: text("payment_status").notNull().default("not_due"), // not_due | pending | paid
  paymentMethod: text("payment_method"),                              // cash | pix | credit | debit | transfer
  paymentAmount: numeric("payment_amount", { precision: 10, scale: 2 }), // actual amount paid/owed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAppointmentSchema = createInsertSchema(appointmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointmentsTable.$inferSelect;
