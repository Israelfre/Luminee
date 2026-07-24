import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db, clientsTable, salonsTable, servicesTable, employeesTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

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

// GET /api/public/booking/:salonId/services
router.get("/booking/:salonId/services", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId as string);
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
  const salonId = parseInt(req.params.salonId as string);
  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.salonId, salonId))
    .orderBy(employeesTable.name);
  res.json(employees.map(e => ({
    id: e.id, name: e.name, specialties: e.specialties ?? [],
  })));
});

// GET /api/public/booking/:salonId/slots?date=2026-05-21&serviceId=1&employeeId=2&duration=60
router.get("/booking/:salonId/slots", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId as string);
  const { date, serviceId, employeeId, duration } = req.query as {
    date: string; serviceId: string; employeeId: string; duration?: string;
  };

  if (!date || !serviceId || !employeeId) {
    res.status(400).json({ error: "date, serviceId e employeeId são obrigatórios" });
    return;
  }

  // Busca o salão para pegar os horários de funcionamento
  const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, salonId)).limit(1);
  if (!salon) { res.status(404).json({ error: "Salão não encontrado" }); return; }

  // Descobre o dia da semana
  const dayOfWeek = new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  const bh = (salon.businessHours as any)?.[dayOfWeek];

  // Se o dia está desabilitado ou não tem horário configurado, retorna vazio
  if (bh && !bh.enabled) {
    res.json([]);
    return;
  }

  // Define os limites do dia com base nos horários de funcionamento
  const openTime = bh?.open ?? "08:00";
  const closeTime = bh?.close ?? "19:00";
  const [openHour, openMin] = openTime.split(":").map(Number);
  const [closeHour, closeMin] = closeTime.split(":").map(Number);

  // Usa duration customizada (múltiplos serviços) ou busca do serviço
  let totalDuration = duration ? parseInt(duration) : 0;
  if (!totalDuration) {
    const [service] = await db.select().from(servicesTable)
      .where(and(eq(servicesTable.id, parseInt(serviceId)), eq(servicesTable.salonId, salonId))).limit(1);
    if (!service) { res.status(404).json({ error: "Serviço não encontrado" }); return; }
    totalDuration = service.durationMinutes;
  }

  const dayStart = new Date(`${date}T00:00:00-03:00`);
  const dayEnd = new Date(`${date}T23:59:59-03:00`);

  const existing = await db.select({
    startsAt: appointmentsTable.startsAt,
    endsAt: appointmentsTable.endsAt,
  }).from(appointmentsTable).where(and(
    eq(appointmentsTable.salonId, salonId),
    eq(appointmentsTable.employeeId, parseInt(employeeId)),
    gte(appointmentsTable.startsAt, dayStart),
    lte(appointmentsTable.startsAt, dayEnd),
  ));

  const slots: { time: string; available: boolean }[] = [];
  const now = new Date();

  for (let hour = openHour; hour < closeHour || (hour === closeHour && 0 < closeMin); hour++) {
    for (let min = (hour === openHour ? openMin : 0); min < 60; min += 30) {
      const timeStr = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotStart = new Date(`${date}T${timeStr}:00-03:00`);
      const slotEnd = new Date(slotStart.getTime() + totalDuration * 60 * 1000);

      // Não mostra horários no passado
      if (slotStart <= now) continue;

      // Não mostra slots que terminam depois do horário de fechamento
      const closeLimit = new Date(`${date}T${closeTime}:00`);
      if (slotEnd > closeLimit) continue;

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

// POST /api/public/booking/:salonId/book (suporta múltiplos serviços)
router.post("/booking/:salonId/book", async (req: Request, res: Response) => {
  const salonId = parseInt(req.params.salonId as string);
  const { clientName, clientPhone, clientEmail, serviceIds, serviceId, employeeId, date, time } = req.body as {
    clientName?: string; clientPhone?: string; clientEmail?: string;
    serviceIds?: number[]; serviceId?: number;
    employeeId?: number; date?: string; time?: string;
  };

  // Suporta serviceIds (múltiplos) ou serviceId (único)
  const ids = serviceIds?.length ? serviceIds : serviceId ? [serviceId] : [];

  if (!clientName?.trim() || ids.length === 0 || !employeeId || !date || !time) {
    res.status(400).json({ error: "Dados incompletos" });
    return;
  }

  const servicesList = await db.select().from(servicesTable)
    .where(and(eq(servicesTable.salonId, salonId), inArray(servicesTable.id, ids)));

  if (servicesList.length === 0) { res.status(404).json({ error: "Serviços não encontrados" }); return; }

  const [employee] = await db.select().from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.salonId, salonId))).limit(1);
  if (!employee) { res.status(404).json({ error: "Profissional não encontrada" }); return; }

  // Busca ou cria cliente pelo telefone
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

  const totalDuration = servicesList.reduce((s, sv) => s + sv.durationMinutes, 0);
  const totalPrice = servicesList.reduce((s, sv) => s + parseFloat(sv.price), 0);
  // Cria a data no horário de Brasília (UTC-3)
  const startsAt = new Date(`${date}T${time}:00-03:00`);
  const endsAt = new Date(startsAt.getTime() + totalDuration * 60 * 1000);

  // Verifica conflito
  const conflict = await db.select({ id: appointmentsTable.id }).from(appointmentsTable)
    .where(and(
      eq(appointmentsTable.salonId, salonId),
      eq(appointmentsTable.employeeId, employeeId),
      gte(appointmentsTable.startsAt, new Date(startsAt.getTime() - totalDuration * 60 * 1000 + 1)),
      lte(appointmentsTable.startsAt, endsAt),
    )).limit(1);

  if (conflict.length > 0) {
    res.status(409).json({ error: "Horário não disponível. Escolha outro." });
    return;
  }

  // Cria um agendamento por serviço (mesma hora, sequencial)
  let currentStart = startsAt;
  const appointments = [];
  for (const service of servicesList) {
    const end = new Date(currentStart.getTime() + service.durationMinutes * 60 * 1000);
    const [apt] = await db.insert(appointmentsTable).values({
      salonId, clientId: client.id, serviceId: service.id, employeeId,
      startsAt: currentStart, endsAt: end,
      status: "scheduled", paymentStatus: "not_due",
      paymentAmount: service.price,
    }).returning();
    appointments.push(apt);
    currentStart = end;
  }

  const d = startsAt.getDate().toString().padStart(2, "0");
  const m = (startsAt.getMonth() + 1).toString().padStart(2, "0");
  const y = startsAt.getFullYear();

  res.status(201).json({
    ok: true,
    appointment: {
      id: appointments[0].id,
      date: `${d}/${m}/${y}`,
      time,
      services: servicesList.map(s => s.name).join(", "),
      employeeName: employee.name,
      clientName: client.name,
      totalPrice: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalPrice),
    },
  });
});

export default router;
