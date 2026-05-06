import { Router, Request, Response } from "express";
import { db, paymentsTable, appointmentsTable, clientsTable, servicesTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth";
import { CreatePaymentBody } from "@workspace/api-zod";

const router = Router();
type AuthRequest = Request & { salonId: number };

const paymentWithJoins = {
  id: paymentsTable.id,
  salonId: paymentsTable.salonId,
  appointmentId: paymentsTable.appointmentId,
  amount: paymentsTable.amount,
  paymentMethod: paymentsTable.paymentMethod,
  paidAt: paymentsTable.paidAt,
  clientName: clientsTable.name,
  serviceName: servicesTable.name,
  employeeName: employeesTable.name,
};

type PaymentRow = {
  id: number;
  salonId: number;
  appointmentId: number;
  amount: string | null;
  paymentMethod: string;
  paidAt: Date;
  clientName: string;
  serviceName: string;
  employeeName: string;
};

const formatPayment = (r: PaymentRow) => ({
  ...r,
  amount: r.amount ?? "0",
  paidAt: r.paidAt.toISOString(),
});

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const { date, month } = req.query;

  const conditions = [eq(paymentsTable.salonId, salonId)];
  if (date) {
    const dayStart = new Date(date as string + "T00:00:00Z");
    const dayEnd = new Date(date as string + "T23:59:59Z");
    conditions.push(gte(paymentsTable.paidAt, dayStart));
    conditions.push(lte(paymentsTable.paidAt, dayEnd));
  } else if (month) {
    const [year, mon] = (month as string).split("-").map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);
    conditions.push(gte(paymentsTable.paidAt, monthStart));
    conditions.push(lte(paymentsTable.paidAt, monthEnd));
  }

  const rows = await db
    .select(paymentWithJoins)
    .from(paymentsTable)
    .innerJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(...conditions))
    .orderBy(paymentsTable.paidAt);

  res.json(rows.map(formatPayment));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db.insert(paymentsTable).values({ ...parsed.data, salonId }).returning();

  const [row] = await db
    .select(paymentWithJoins)
    .from(paymentsTable)
    .innerJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(eq(paymentsTable.id, payment.id))
    .limit(1);

  res.status(201).json(formatPayment(row));
});

export default router;
