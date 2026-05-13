import { Router, Request, Response } from "express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth";
import { UpdateSalonBody } from "@workspace/api-zod";

const router = Router();

router.get("/me", requireSalon, async (req: Request, res: Response) => {
  const salonId = (req as Request & { salonId: number }).salonId;
  const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.id, salonId)).limit(1);
  if (!salon) {
    res.status(404).json({ error: "Salon not found" });
    return;
  }
  res.json({ ...salon, createdAt: salon.createdAt.toISOString() });
});

router.patch("/me", requireSalon, async (req: Request, res: Response) => {
  const salonId = (req as Request & { salonId: number }).salonId;
  const parsed = UpdateSalonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [updated] = await db
    .update(salonsTable)
    .set(parsed.data)
    .where(eq(salonsTable.id, salonId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Salon not found" });
    return;
  }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

/** Fluxo antigo (Clerk); cadastro público é `POST /api/admin/register`. */
router.post("/register", (_req: Request, res: Response) => {
  res.status(410).json({
    error: "Use o cadastro público em /registrar ou criação pelo painel admin.",
  });
});

export default router;
