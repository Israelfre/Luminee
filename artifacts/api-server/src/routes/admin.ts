import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { salonsTable, clientsTable, appointmentsTable, type InsertSalon } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "admin@luminee.com";
const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "admin40028922";

const validTokens = new Map<string, string>();

function getToken(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  const token = getToken(req);
  if (!token || !validTokens.has(token)) {
    res.status(401).json({ ok: false, error: "Não autorizado" });
    return;
  }
  next();
}

router.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (
    email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase() &&
    password === ADMIN_PASSWORD
  ) {
    const token = randomUUID();
    validTokens.set(token, ADMIN_EMAIL);
    res.json({ ok: true, email: ADMIN_EMAIL, token });
  } else {
    res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  const token = getToken(req);
  if (token) validTokens.delete(token);
  res.json({ ok: true });
});

router.get("/check", (req: Request, res: Response) => {
  const token = getToken(req);
  if (token && validTokens.has(token)) {
    res.json({ ok: true, email: validTokens.get(token) });
  } else {
    res.status(401).json({ ok: false });
  }
});

// PUBLIC: Salon owner self-registration (no auth required)
router.post("/register", async (req: Request, res: Response) => {
  const { salonName, ownerName, email, phone, password, message } = req.body as {
    salonName?: string; ownerName?: string; email?: string; phone?: string; password?: string; message?: string;
  };
  if (!salonName?.trim()) { res.status(400).json({ error: "Nome do salão obrigatório" }); return; }
  if (!ownerName?.trim()) { res.status(400).json({ error: "Nome do responsável obrigatório" }); return; }
  if (!email?.trim()) { res.status(400).json({ error: "E-mail obrigatório" }); return; }

  const fakeClerkId = `pending_${randomUUID()}`;
  const values: InsertSalon = {
    name: salonName.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    password: password?.trim() || null,
    clerkUserId: fakeClerkId,
    plan: "gratuito",
  };
  const [salon] = await db.insert(salonsTable).values(values).returning();
  req.log?.info({ salonId: salon.id, ownerName, message }, "New salon self-registration");
  res.status(201).json({ ok: true, id: salon.id });
});

// List all salons with stats
router.get("/salons", requireAdmin, async (_req: Request, res: Response) => {
  const salons = await db.select().from(salonsTable).orderBy(salonsTable.createdAt);

  const stats = await Promise.all(salons.map(async (s) => {
    const [clientRow] = await db.select({ total: count() }).from(clientsTable).where(eq(clientsTable.salonId, s.id));
    const [aptRow] = await db.select({ total: count() }).from(appointmentsTable).where(eq(appointmentsTable.salonId, s.id));
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      password: s.password,
      logoUrl: s.logoUrl,
      createdAt: s.createdAt.toISOString(),
      clerkUserId: s.clerkUserId,
      plan: s.plan ?? "gratuito",
      planExpiresAt: s.planExpiresAt ?? null,
      clients: Number(clientRow?.total ?? 0),
      appointments: Number(aptRow?.total ?? 0),
    };
  }));

  res.json(stats);
});

// Create new salon (admin creates on behalf of a salon owner)
router.post("/salons", requireAdmin, async (req: Request, res: Response) => {
  const { name, email, phone, password, plan } = req.body as { name?: string; email?: string; phone?: string; password?: string; plan?: string };
  if (!name?.trim()) { res.status(400).json({ error: "Nome obrigatório" }); return; }

  const fakeClerkId = `admin_created_${randomUUID()}`;
  const values: InsertSalon = {
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    password: password?.trim() || null,
    clerkUserId: fakeClerkId,
    plan: plan === "ativo" ? "ativo" : "gratuito",
  };
  const [salon] = await db.insert(salonsTable).values(values).returning();

  res.status(201).json({ ...salon, createdAt: salon.createdAt.toISOString() });
});

// Update salon plan
router.patch("/salons/:id/plan", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  const { plan } = req.body as { plan?: string };
  if (plan !== "ativo" && plan !== "gratuito") { res.status(400).json({ error: "Plano inválido" }); return; }
  const [updated] = await db.update(salonsTable).set({ plan }).where(eq(salonsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Não encontrado" }); return; }
  res.json({ ok: true, plan: updated.plan });
});

// Delete salon
router.delete("/salons/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string);
  await db.delete(salonsTable).where(eq(salonsTable.id, id));
  res.status(204).send();
});

export default router;
