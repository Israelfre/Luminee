import { Router, Request, Response } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth.js";
import { CreateServiceBody, UpdateServiceBody } from "@workspace/api-zod";

const router = Router();
type AuthRequest = Request & { salonId: number };

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const category = req.query.category as string | undefined;
  const conditions = [eq(servicesTable.salonId, salonId)];
  if (category) conditions.push(eq(servicesTable.category, category));
  const services = await db.select().from(servicesTable).where(and(...conditions)).orderBy(servicesTable.name);
  res.json(services.map(s => ({ ...s, price: s.price ?? "0", createdAt: s.createdAt.toISOString() })));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db.insert(servicesTable).values({ ...parsed.data, salonId }).returning();
  res.status(201).json({ ...service, price: service.price ?? "0", createdAt: service.createdAt.toISOString() });
});

router.patch("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(servicesTable).set(parsed.data).where(and(eq(servicesTable.id, id), eq(servicesTable.salonId, salonId))).returning();
  if (!updated) {
    res.status(404).json({ error: "Service not found" });
    return;
  }
  res.json({ ...updated, price: updated.price ?? "0", createdAt: updated.createdAt.toISOString() });
});

router.delete("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = parseInt(req.params["id"] as string);
  await db.delete(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.salonId, salonId)));
  res.status(204).send();
});

export default router;
