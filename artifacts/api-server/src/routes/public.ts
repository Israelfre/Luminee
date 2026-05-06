import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db, clientsTable, salonsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/salon", async (req: Request, res: Response) => {
  const salonId = req.query.salonId ? parseInt(req.query.salonId as string) : undefined;

  let salon;
  if (salonId) {
    [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, salonId)).limit(1);
  } else {
    [salon] = await db.select().from(salonsTable).limit(1);
  }

  if (!salon) {
    res.status(404).json({ error: "Salão não encontrado" });
    return;
  }

  res.json({
    id: salon.id,
    name: salon.name,
    logoUrl: salon.logoUrl,
    phone: salon.phone,
    whatsapp: salon.whatsapp,
    instagram: salon.instagram,
  });
});

router.post("/register", async (req: Request, res: Response) => {
  const { name, email, phone, username, password, salonId } = req.body as {
    name?: string;
    email?: string;
    phone?: string;
    username?: string;
    password?: string;
    salonId?: number;
  };

  if (!name || !username || !password) {
    res.status(400).json({ error: "Nome, usuário e senha são obrigatórios" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    return;
  }

  let resolvedSalonId: number;
  if (salonId) {
    const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, salonId)).limit(1);
    if (!salon) {
      res.status(404).json({ error: "Salão não encontrado" });
      return;
    }
    resolvedSalonId = salon.id;
  } else {
    const [salon] = await db.select().from(salonsTable).limit(1);
    if (!salon) {
      res.status(404).json({ error: "Salão não encontrado" });
      return;
    }
    resolvedSalonId = salon.id;
  }

  const existing = await db.select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.salonId, resolvedSalonId), eq(clientsTable.username, username)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Este nome de usuário já está em uso" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [client] = await db.insert(clientsTable).values({
    salonId: resolvedSalonId,
    name,
    email: email || null,
    phone: phone || null,
    whatsapp: phone || null,
    username,
    passwordHash,
    selfRegistered: true,
  }).returning();

  res.status(201).json({
    id: client.id,
    name: client.name,
    email: client.email,
    username: client.username,
    createdAt: client.createdAt.toISOString(),
  });
});

export default router;
