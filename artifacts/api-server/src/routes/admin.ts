import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  salonsTable,
  clientsTable,
  appointmentsTable,
  adminUsersTable,
  type InsertSalon,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function regenerateSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => (err ? reject(err) : resolve()));
  });
}

function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    res.status(400).json({ ok: false, error: "E-mail e senha obrigatórios" });
    return;
  }

  try {
    const emailNorm = email.toLowerCase().trim();
    const [user] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, emailNorm))
      .limit(1);

    if (!user) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }

    await regenerateSession(req);
    req.session.adminUserId = user.id;
    req.session.adminEmail = user.email;
    delete req.session.salonId;
    await saveSession(req);

    res.json({
      ok: true,
      email: user.email,
      sessionId: req.sessionID,
    });
  } catch (e) {
    req.log?.error({ err: e }, "admin login");
    res.status(500).json({ ok: false, error: "Erro interno" });
  }
});

router.post("/logout", (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === "production";
  req.session.destroy(() => {
    res.clearCookie("luminee.sid", {
      path: "/",
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });
    res.json({ ok: true });
  });
});

router.get("/check", (req: Request, res: Response) => {
  const id = req.session.adminUserId;
  const email = req.session.adminEmail;
  if (id != null && email) {
    res.json({ ok: true, email });
  } else {
    res.status(401).json({ ok: false });
  }
});

/**
 * Cadastro público de salão (auto-registro pelo formulário /registrar).
 * Não exige auth de admin — qualquer pessoa pode solicitar cadastro.
 * O admin depois aprova/configura pelo painel.
 */
router.post("/register", async (req: Request, res: Response) => {
  const { salonName, ownerName, email, phone, password, message } = req.body as {
    salonName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    password?: string;
    message?: string;
  };
  if (!salonName?.trim()) {
    res.status(400).json({ error: "Nome do salão obrigatório" });
    return;
  }
  if (!ownerName?.trim()) {
    res.status(400).json({ error: "Nome do responsável obrigatório" });
    return;
  }
  if (!email?.trim()) {
    res.status(400).json({ error: "E-mail obrigatório" });
    return;
  }
  if (!password?.trim() || password.trim().length < 6) {
    res.status(400).json({ error: "Senha obrigatória (mínimo 6 caracteres)" });
    return;
  }

  // Verifica se e-mail já existe
  const [existing] = await db
    .select({ id: salonsTable.id })
    .from(salonsTable)
    .where(eq(salonsTable.email, email.trim().toLowerCase()))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "E-mail já cadastrado" });
    return;
  }

  const values: InsertSalon = {
    name: salonName.trim(),
    email: email.trim().toLowerCase(),
    phone: phone?.trim() || null,
    password: await bcrypt.hash(password.trim(), 10),
    passwordPlain: password.trim(),
    clerkUserId: null,
    plan: "gratuito",
  };
  const [salon] = await db.insert(salonsTable).values(values).returning();
  req.log?.info({ salonId: salon.id, ownerName, message }, "New salon self-registration");
  res.status(201).json({ ok: true, id: salon.id });
});

router.get("/salons", requireAdmin, async (_req: Request, res: Response) => {
  const salons = await db.select().from(salonsTable).orderBy(salonsTable.createdAt);

  const stats = await Promise.all(
    salons.map(async (s) => {
      const [clientRow] = await db
        .select({ total: count() })
        .from(clientsTable)
        .where(eq(clientsTable.salonId, s.id));
      const [aptRow] = await db
        .select({ total: count() })
        .from(appointmentsTable)
        .where(eq(appointmentsTable.salonId, s.id));
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        logoUrl: s.logoUrl,
        passwordPlain: s.passwordPlain ?? null,
        createdAt: s.createdAt.toISOString(),
        clerkUserId: s.clerkUserId,
        plan: s.plan ?? "gratuito",
        planExpiresAt: s.planExpiresAt ?? null,
        clients: Number(clientRow?.total ?? 0),
        appointments: Number(aptRow?.total ?? 0),
      };
    }),
  );

  res.json(stats);
});

router.post("/salons", requireAdmin, async (req: Request, res: Response) => {
  const { name, email, phone, password, plan } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    plan?: string;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: "Nome obrigatório" });
    return;
  }

  const values: InsertSalon = {
    name: name.trim(),
    email: email?.trim().toLowerCase() || null,
    phone: phone?.trim() || null,
    password: password?.trim() ? await bcrypt.hash(password.trim(), 10) : null,
    passwordPlain: password?.trim() || null,
    clerkUserId: null,
    plan: plan === "ativo" ? "ativo" : "gratuito",
  };
  const [salon] = await db.insert(salonsTable).values(values).returning();

  res.status(201).json({ ...salon, createdAt: salon.createdAt.toISOString() });
});

router.patch("/salons/:id/plan", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  const { plan } = req.body as { plan?: string };
  if (plan !== "ativo" && plan !== "gratuito") {
    res.status(400).json({ error: "Plano inválido" });
    return;
  }
  const [updated] = await db
    .update(salonsTable)
    .set({ plan })
    .where(eq(salonsTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Não encontrado" });
    return;
  }
  res.json({ ok: true, plan: updated.plan });
});

router.delete("/salons/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = parseInt(req.params["id"] as string, 10);
  await db.delete(salonsTable).where(eq(salonsTable.id, id));
  res.status(204).send();
});

export default router;
