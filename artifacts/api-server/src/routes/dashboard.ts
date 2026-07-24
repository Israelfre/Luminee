import { Router, Request, Response } from "express";
import { db, appointmentsTable, paymentsTable, clientsTable, servicesTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte, count, sum, sql } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth.js";

const router = Router();
type AuthRequest = Request & { salonId: number };

// Receita: usa apenas appointments com paymentStatus = paid
// (evita duplicação com a tabela payments)
async function calcRevenue(salonId: number, from: Date, to: Date): Promise<string> {
  const [fromAppointments] = await db
    .select({ total: sum(appointmentsTable.paymentAmount) })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.paymentStatus, "paid"),
      gte(appointmentsTable.startsAt, from),
      lte(appointmentsTable.startsAt, to),
    ));

  return parseFloat(fromAppointments.total ?? "0").toFixed(2);
}

router.get("/summary", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000 - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [todayAppts] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      gte(appointmentsTable.startsAt, todayStart),
      lte(appointmentsTable.startsAt, todayEnd),
    ));

  const [completedToday] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.status, "completed"),
      gte(appointmentsTable.startsAt, todayStart),
      lte(appointmentsTable.startsAt, todayEnd),
    ));

  const [cancelledToday] = await db
    .select({ count: count() })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.status, "cancelled"),
      gte(appointmentsTable.startsAt, todayStart),
      lte(appointmentsTable.startsAt, todayEnd),
    ));

  const [newClientsRow] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(and(
      eq(clientsTable.salonId, salonId),
      gte(clientsTable.createdAt, monthStart),
      lte(clientsTable.createdAt, monthEnd),
    ));

  const [totalClientsRow] = await db
    .select({ count: count() })
    .from(clientsTable)
    .where(eq(clientsTable.salonId, salonId));

  const [totalEmployeesRow] = await db
    .select({ count: count() })
    .from(employeesTable)
    .where(eq(employeesTable.salonId, salonId));

  const todayRevenue = await calcRevenue(salonId, todayStart, todayEnd);
  const monthRevenue = await calcRevenue(salonId, monthStart, monthEnd);

  res.json({
    todayAppointments: todayAppts.count,
    todayRevenue,
    monthRevenue,
    newClientsThisMonth: newClientsRow.count,
    completedToday: completedToday.count,
    cancelledToday: cancelledToday.count,
    totalClients: totalClientsRow.count,
    totalEmployees: totalEmployeesRow.count,
  });
});

router.get("/top-services", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db
    .select({
      serviceId: servicesTable.id,
      serviceName: servicesTable.name,
      count: count(appointmentsTable.id),
      revenue: sum(paymentsTable.amount),
    })
    .from(appointmentsTable)
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(paymentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      gte(appointmentsTable.startsAt, monthStart),
    ))
    .groupBy(servicesTable.id, servicesTable.name)
    .orderBy(sql`count(${appointmentsTable.id}) desc`)
    .limit(5);

  res.json(rows.map(r => ({ ...r, revenue: r.revenue ?? "0" })));
});

router.get("/revenue-trend", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const days: { date: string; revenue: string; appointmentCount: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
    const dateStr = dayStart.toISOString().split("T")[0];

    const revenue = await calcRevenue(salonId, dayStart, dayEnd);

    const [apptRow] = await db
      .select({ count: count() })
      .from(appointmentsTable)
      .where(and(
        eq(appointmentsTable.salonId, salonId),
        gte(appointmentsTable.startsAt, dayStart),
        lte(appointmentsTable.startsAt, dayEnd),
      ));

    days.push({ date: dateStr, revenue, appointmentCount: apptRow.count });
  }

  res.json(days);
});

router.get("/upcoming-appointments", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const now = new Date();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const rows = await db
    .select({
      id: appointmentsTable.id,
      salonId: appointmentsTable.salonId,
      clientId: appointmentsTable.clientId,
      serviceId: appointmentsTable.serviceId,
      employeeId: appointmentsTable.employeeId,
      startsAt: appointmentsTable.startsAt,
      endsAt: appointmentsTable.endsAt,
      status: appointmentsTable.status,
      notes: appointmentsTable.notes,
      createdAt: appointmentsTable.createdAt,
      clientName: clientsTable.name,
      serviceName: servicesTable.name,
      servicePrice: servicesTable.price,
      employeeName: employeesTable.name,
    })
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      gte(appointmentsTable.startsAt, now),
      lte(appointmentsTable.startsAt, todayEnd),
      eq(appointmentsTable.status, "scheduled"),
    ))
    .orderBy(appointmentsTable.startsAt)
    .limit(10);

  res.json(rows.map(r => ({
    ...r,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    servicePrice: r.servicePrice ?? "0",
  })));
});

export default router;
