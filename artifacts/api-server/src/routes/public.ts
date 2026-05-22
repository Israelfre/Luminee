import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db, clientsTable, salonsTable, servicesTable, employeesTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";

const router = Router();

// GET /api/public/salon?salonId=1
router.get("/salon", async (req: Request, res: Response) => {
  const salonId = req.query.salonId ? parseInt(req.query.salonId as string) : undefined;
  let salon;
  if (salonId) {
    [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, salonId)).limit(1);
  } else {
    [salon] = await db.select().from(salonsTable).limit(1);
  }
  if (!salon) { res.status(404).json({ error: "Salão não encontrado" }); return; }
  res.json({ id: salon.id, name: salon.name, logoUrl: salon.logoUrl, phone: salon.phone, whatsapp: salon.whatsapp, instagram: salon.instagram });
});

// POST /api/public/salon-auth/login
router.post("/salon-auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) { res.status(400).json({ error: "E-mail e senha obrigatórios" }); return; }
  const emailNorm = email.toLowerCase().trim();
  const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.email, emailNorm)).limit(1);
  if (!salon) { res.status(401).json({ error: "E-mail ou senha incorretos" }); return; }
  if (!salon.password) { res.status(401).json({ error: "Credenciais inválidas" }); return; }
  const valid = await bcrypt.compare(password, salon.password);
  if (!valid) { res.status(401).json({ error: "E-mail ou senha incorretos" }); return; }
  req.session.salonId = salon.id;
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
  res.json({ ok: true, salonId: salon.id, name: salon.name, sessionId: req.sessionID });
});

// ─── Agendamento online público ───────────────────────────────────────────────

// GET /api/public/booking/:salonId/services
router.get("/booking/:salonId/services", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId);
  const services = await db.select().from(servicesTable)
    .where(eq(servicesTable.salonId, salonId))
    .orderBy(servicesTable.name);
  res.json(services.map(s => ({
    id: s.id, name: s.name, description: s.description,
    price: s.price, durationMinutes: s.durationMinutes, category: s.category,
  })));
});

// GET /api/public/booking/:salonId/employees
router.get("/booking/:salonId/employees", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId);
  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.salonId, salonId))
    .orderBy(employeesTable.name);
  res.json(employees.map(e => ({
    id: e.id, name: e.name, specialties: e.specialties ?? [],
  })));
});

// GET /api/public/booking/:salonId/slots?date=2026-05-21&serviceId=1&employeeId=2
router.get("/booking/:salonId/slots", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId);
  const { date, serviceId, employeeId } = req.query as { date: string; serviceId: string; employeeId: string };

  if (!date || !serviceId || !employeeId) {
    res.status(400).json({ error: "date, serviceId e employeeId são obrigatórios" });
    return;
  }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, parseInt(serviceId)), eq(servicesTable.salonId, salonId))).limit(1);
  if (!service) { res.status(404).json({ error: "Serviço não encontrado" }); return; }

  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);

  const existing = await db.select({ startsAt: appointmentsTable.startsAt, endsAt: appointmentsTable.endsAt })
    .from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.employeeId, parseInt(employeeId)),
      gte(appointmentsTable.startsAt, dayStart),
      lte(appointmentsTable.startsAt, dayEnd),
    ));

  const duration = service.durationMinutes;
  const slots: { time: string; available: boolean }[] = [];

  for (let hour = 8; hour < 19; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotStart = new Date(`${date}T${timeStr}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

      if (slotStart <= new Date()) continue;

      const conflict = existing.some(e => {
        const eStart = new Date(e.startsAt);
        const eEnd = new Date(e.endsAt);
        return slotStart < eEnd && slotEnd > eStart;
      });

      slots.push({ time: timeStr, available: !conflict });
    }
  }

  res.json(slots);
});

// POST /api/public/booking/:salonId/book
router.post("/booking/:salonId/book", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId);
  const { clientName, clientPhone, clientEmail, serviceId, employeeId, date, time } = req.body as {
    clientName?: string; clientPhone?: string; clientEmail?: string;
    serviceId?: number; employeeId?: number; date?: string; time?: string;
  };

  if (!clientName?.trim() || !serviceId || !employeeId || !date || !time) {
    res.status(400).json({ error: "Dados incompletos" });
    return;
  }

  const [service] = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.id, serviceId), eq(servicesTable.salonId, salonId))).limit(1);
  if (!service) { res.status(404).json({ error: "Serviço não encontrado" }); return; }

  const [employee] = await db.select().from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.salonId, salonId))).limit(1);
  if (!employee) { res.status(404).json({ error: "Profissional não encontrada" }); return; }

  // Busca ou cria cliente
  let client;
  if (clientPhone?.trim()) {
    const [found] = await db.select().from(clientsTable)
      .where(and(eq(clientsTable.salonId, salonId), eq(clientsTable.phone, clientPhone.trim()))).limit(1);
    client = found;
  }
  if (!client) {
    const [newClient] = await db.insert(clientsTable).values({
      salonId,
      name: clientName.trim(),
      phone: clientPhone?.trim() || null,
      email: clientEmail?.trim() || null,
      whatsapp: clientPhone?.trim() || null,
      selfRegistered: true,
    }).returning();
    client = newClient;
  }

  const startsAt = new Date(`${date}T${time}:00`);
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60 * 1000);

  // Verifica conflito
  const conflict = await db.select({ id: appointmentsTable.id }).from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.employeeId, employeeId),
      gte(appointmentsTable.startsAt, new Date(startsAt.getTime() - service.durationMinutes * 60 * 1000 + 1)),
      lte(appointmentsTable.startsAt, endsAt),
    )).limit(1);

  if (conflict.length > 0) {
    res.status(409).json({ error: "Horário não disponível. Escolha outro." });
    return;
  }

  const [appointment] = await db.insert(appointmentsTable).values({
    salonId,
    clientId: client.id,
    serviceId,
    employeeId,
    startsAt,
    endsAt,
    status: "scheduled",
    paymentStatus: "not_due",
  }).returning();

  const d = startsAt.getDate().toString().padStart(2, "0");
  const m = (startsAt.getMonth() + 1).toString().padStart(2, "0");
  const y = startsAt.getFullYear();

  res.status(201).json({
    ok: true,
    appointment: {
      id: appointment.id,
      date: `${d}/${m}/${y}`,
      time,
      serviceName: service.name,
      employeeName: employee.name,
      clientName: client.name,
    },
  });
});

export default router;
