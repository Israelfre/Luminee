import { Router, Request, Response } from "express";
import { db, employeesTable, appointmentsTable, clientsTable, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth";
import { CreateEmployeeBody, UpdateEmployeeBody } from "@workspace/api-zod";

const router = Router();
type AuthRequest = Request & { salonId: number };

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const employees = await db.select().from(employeesTable).where(eq(employeesTable.salonId, salonId)).orderBy(employeesTable.name);
  res.json(employees.map(e => ({
    ...e,
    commissionPct: e.commissionPct ? parseFloat(e.commissionPct) : null,
    createdAt: e.createdAt.toISOString(),
  })));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { commissionPct, ...rest } = parsed.data;
  const [employee] = await db.insert(employeesTable).values({
    ...rest,
    salonId,
    commissionPct: commissionPct != null ? String(commissionPct) : null,
  }).returning();
  res.status(201).json({
    ...employee,
    commissionPct: employee.commissionPct ? parseFloat(employee.commissionPct) : null,
    createdAt: employee.createdAt.toISOString(),
  });
});

router.patch("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const parsed = UpdateEmployeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { commissionPct, ...rest } = parsed.data;
  const [updated] = await db.update(employeesTable)
    .set({ ...rest, ...(commissionPct != null ? { commissionPct: String(commissionPct) } : {}) })
    .where(and(eq(employeesTable.id, id), eq(employeesTable.salonId, salonId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  res.json({
    ...updated,
    commissionPct: updated.commissionPct ? parseFloat(updated.commissionPct) : null,
    createdAt: updated.createdAt.toISOString(),
  });
});

router.delete("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  await db.delete(employeesTable).where(and(eq(employeesTable.id, id), eq(employeesTable.salonId, salonId)));
  res.status(204).send();
});

router.get("/:id/schedule", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const employeeId = parseInt(req.params["id"] as string);
  const date = req.query.date as string;

  const dayStart = new Date(date + "T00:00:00Z");
  const dayEnd = new Date(date + "T23:59:59Z");

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
    .where(and(eq(appointmentsTable.salonId, salonId), eq(appointmentsTable.employeeId, employeeId)));

  res.json(rows.map(r => ({
    ...r,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    servicePrice: r.servicePrice ?? "0",
  })));
});

export default router;
