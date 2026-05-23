import { Router, Request, Response } from "express";
import { db, appointmentsTable, clientsTable, servicesTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth";
import { CreateAppointmentBody, UpdateAppointmentBody } from "@workspace/api-zod";

const router = Router();
type AuthRequest = Request & { salonId: number };

const appointmentWithJoins = {
  id: appointmentsTable.id,
  salonId: appointmentsTable.salonId,
  clientId: appointmentsTable.clientId,
  serviceId: appointmentsTable.serviceId,
  employeeId: appointmentsTable.employeeId,
  startsAt: appointmentsTable.startsAt,
  endsAt: appointmentsTable.endsAt,
  status: appointmentsTable.status,
  notes: appointmentsTable.notes,
  paymentStatus: appointmentsTable.paymentStatus,
  paymentMethod: appointmentsTable.paymentMethod,
  paymentAmount: appointmentsTable.paymentAmount,
  createdAt: appointmentsTable.createdAt,
  clientName: clientsTable.name,
  clientWhatsapp: clientsTable.whatsapp,
  clientPhone: clientsTable.phone,
  serviceName: servicesTable.name,
  servicePrice: servicesTable.price,
  employeeName: employeesTable.name,
};

type AppointmentRow = {
  id: number;
  salonId: number;
  clientId: number;
  serviceId: number;
  employeeId: number;
  startsAt: Date;
  endsAt: Date;
  status: string;
  notes: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  paymentAmount: string | null;
  createdAt: Date;
  clientName: string;
  clientWhatsapp: string | null;
  clientPhone: string | null;
  serviceName: string;
  servicePrice: string | null;
  employeeName: string;
};

const formatAppointment = (r: AppointmentRow) => ({
  ...r,
  startsAt: r.startsAt.toISOString(),
  endsAt: r.endsAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
  servicePrice: r.servicePrice ?? "0",
  paymentAmount: r.paymentAmount ?? null,
});

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const { date, status, employeeId } = req.query;

  const conditions = [eq(appointmentsTable.salonId, salonId)];
  if (date) {
    const dayStart = new Date(date as string + "T00:00:00-03:00");
    const dayEnd = new Date(date as string + "T23:59:59-03:00");
    conditions.push(gte(appointmentsTable.startsAt, dayStart));
    conditions.push(lte(appointmentsTable.startsAt, dayEnd));
  }
  if (status) conditions.push(eq(appointmentsTable.status, status as string));
  if (employeeId) conditions.push(eq(appointmentsTable.employeeId, parseInt(employeeId as string)));

  const rows = await db
    .select(appointmentWithJoins)
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(...conditions))
    .orderBy(appointmentsTable.startsAt);

  res.json(rows.map(formatAppointment));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, parsed.data.serviceId)).limit(1);
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);

  const [appointment] = await db.insert(appointmentsTable).values({
    salonId,
    clientId: parsed.data.clientId,
    serviceId: parsed.data.serviceId,
    employeeId: parsed.data.employeeId,
    startsAt,
    endsAt,
    notes: parsed.data.notes,
    status: "scheduled",
  }).returning();

  const [row] = await db
    .select(appointmentWithJoins)
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(eq(appointmentsTable.id, appointment.id))
    .limit(1);

  res.status(201).json(formatAppointment(row));
});

router.get("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);

  const [row] = await db
    .select(appointmentWithJoins)
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.salonId, salonId)))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(formatAppointment(row));
});

router.patch("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.endsAt) {
    // Explicit endsAt override (e.g. extend appointment time)
    updateData.endsAt = new Date(parsed.data.endsAt);
  }
  if (parsed.data.startsAt) {
    const startsAt = new Date(parsed.data.startsAt);
    if (!parsed.data.endsAt) {
      // Recalculate endsAt from service duration when startsAt changes
      const [existingAppt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id)).limit(1);
      if (existingAppt) {
        const serviceId = parsed.data.serviceId ?? existingAppt.serviceId;
        const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);
        if (service) {
          updateData.endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000);
        }
      }
    }
    updateData.startsAt = startsAt;
  }

  await db.update(appointmentsTable).set(updateData).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.salonId, salonId)));

  const [row] = await db
    .select(appointmentWithJoins)
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(eq(appointmentsTable.id, id))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Appointment not found" });
    return;
  }
  res.json(formatAppointment(row));
});

router.delete("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  await db.delete(appointmentsTable).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.salonId, salonId)));
  res.status(204).send();
});

export default router;
