import { Router, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { UpdateSalonBody, RegisterSalonBody } from "@workspace/api-zod";

const router = Router();

async function resolveSalon(userId: string | null | undefined) {
  if (userId) {
    const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.clerkUserId, userId)).limit(1);
    if (salon) return salon;
  }
  // Demo fallback: first salon in DB
  const [demo] = await db.select().from(salonsTable).limit(1);
  return demo ?? null;
}

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const salon = await resolveSalon(userId);
  if (!salon) {
    res.status(404).json({ error: "Salon not found" });
    return;
  }
  res.json({ ...salon, createdAt: salon.createdAt.toISOString() });
});

router.patch("/me", requireAuth, async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const parsed = UpdateSalonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const salon = await resolveSalon(userId);
  if (!salon) {
    res.status(404).json({ error: "Salon not found" });
    return;
  }

  const [updated] = await db.update(salonsTable).set(parsed.data).where(eq(salonsTable.id, salon.id)).returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.post("/register", requireAuth, async (req: Request, res: Response) => {
  const { userId } = getAuth(req);
  const parsed = RegisterSalonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (userId) {
    const [existing] = await db.select().from(salonsTable).where(eq(salonsTable.clerkUserId, userId)).limit(1);
    if (existing) {
      res.status(409).json({ error: "Salon already registered" });
      return;
    }
  }

  const clerkId = userId ?? `demo_${Date.now()}`;
  const [salon] = await db.insert(salonsTable).values({ ...parsed.data, clerkUserId: clerkId }).returning();
  res.status(201).json({ ...salon, createdAt: salon.createdAt.toISOString() });
});

export default router;
