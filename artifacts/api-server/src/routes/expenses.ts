import { Router, Request, Response } from "express";
import { db, expensesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireSalon } from "../middlewares/requireAuth.js";
import { CreateExpenseBody } from "@workspace/api-zod";

const router = Router();
type AuthRequest = Request & { salonId: number };

const formatExpense = (r: typeof expensesTable.$inferSelect) => ({
  ...r,
  amount: r.amount ?? "0",
  paidAt: r.paidAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
});

router.get("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const { month } = req.query;

  const conditions = [eq(expensesTable.salonId, salonId)];
  if (month) {
    const [year, mon] = (month as string).split("-").map(Number);
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0, 23, 59, 59);
    conditions.push(gte(expensesTable.paidAt, monthStart));
    conditions.push(lte(expensesTable.paidAt, monthEnd));
  }

  const rows = await db
    .select()
    .from(expensesTable)
    .where(and(...conditions))
    .orderBy(desc(expensesTable.paidAt));

  res.json(rows.map(formatExpense));
});

router.post("/", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const parsed = CreateExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { paidAt, ...rest } = parsed.data;
  const [row] = await db
    .insert(expensesTable)
    .values({ ...rest, salonId, ...(paidAt ? { paidAt: new Date(paidAt) } : {}) })
    .returning();

  res.status(201).json(formatExpense(row));
});

router.delete("/:id", requireSalon, async (req: Request, res: Response) => {
  const { salonId } = req as AuthRequest;
  const id = Number(req.params.id);

  await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.id, id), eq(expensesTable.salonId, salonId)));

  res.status(204).send();
});

export default router;
