import { Router, Request, Response } from "express";
import { db, clientsTable, appointmentsTable, servicesTable, employeesTable } from "@workspace/db";
import { eq, and, ilike } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth.js";
import { CreateClientBody, UpdateClientBody } from "@workspace/api-zod";

const router = Router();

type AuthRequest = Request & { salonId: number };

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const search = req.query.search as string | undefined;

  const conditions = [eq(clientsTable.salonId, salonId)];
  if (search) conditions.push(ilike(clientsTable.name, `%${search}%`));

  const clients = await db.select().from(clientsTable).where(and(...conditions)).orderBy(clientsTable.name);
  res.json(clients.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [client] = await db.insert(clientsTable).values({ ...parsed.data, salonId }).returning();
  res.status(201).json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.get("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const [client] = await db.select().from(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.salonId, salonId))).limit(1);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json({ ...client, createdAt: client.createdAt.toISOString() });
});

router.patch("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(clientsTable).set(parsed.data).where(and(eq(clientsTable.id, id), eq(clientsTable.salonId, salonId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.patch("/:id/plan", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const { plan } = req.body as { plan?: string };
  if (plan !== "ativo" && plan !== "gratuito") {
    res.status(400).json({ error: "Plano inválido (ativo ou gratuito)" });
    return;
  }
  const [updated] = await db.update(clientsTable).set({ plan }).where(and(eq(clientsTable.id, id), eq(clientsTable.salonId, salonId))).returning();
  if (!updated) { res.status(404).json({ error: "Client not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  await db.delete(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.salonId, salonId)));
  res.status(204).send();
});

router.get("/:id/appointments", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
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
    })
    .from(appointmentsTable)
    .innerJoin(clientsTable, eq(appointmentsTable.clientId, clientsTable.id))
    .innerJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .innerJoin(employeesTable, eq(appointmentsTable.employeeId, employeesTable.id))
    .where(and(eq(appointmentsTable.salonId, salonId), eq(appointmentsTable.clientId, id)))
    .orderBy(appointmentsTable.startsAt);

  res.json(rows.map(r => ({
    ...r,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    servicePrice: r.servicePrice ?? "0",
    paymentAmount: r.paymentAmount ?? null,
  })));
});

export default router;
