import { Router, Request, Response } from "express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSalonToken, getSalonIdFromToken, deleteSalonToken } from "../lib/salonTokens";
import bcrypt from "bcryptjs";

const router = Router();

function getToken(req: Request): string | null {
  const auth = req.headers["x-salon-token"];
  if (typeof auth === "string" && auth) return auth;
  return null;
}

router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ ok: false, error: "E-mail e senha obrigatórios" });
    return;
  }

  const [salon] = await db.select().from(salonsTable)
    .where(eq(salonsTable.email, email.trim().toLowerCase()))
    .limit(1);

  if (!salon) {
    res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
    return;
  }

  // Validate password: support both bcrypt hashes and plain-text (legacy)
  if (salon.password !== null) {
    const isHash = salon.password.startsWith("$2");
    const valid = isHash
      ? await bcrypt.compare(password.trim(), salon.password)
      : salon.password === password.trim();
    if (!valid) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }
  }

  const token = createSalonToken(salon.id);
  res.json({
    ok: true,
    token,
    salon: {
      id: salon.id,
      name: salon.name,
      email: salon.email,
      logoUrl: salon.logoUrl,
      plan: salon.plan,
    },
  });
});

router.post("/logout", (req: Request, res: Response) => {
  const token = getToken(req);
  if (token) deleteSalonToken(token);
  res.json({ ok: true });
});

router.get("/check", (req: Request, res: Response) => {
  const token = getToken(req);
  if (!token) { res.status(401).json({ ok: false }); return; }
  const salonId = getSalonIdFromToken(token);
  if (!salonId) { res.status(401).json({ ok: false }); return; }
  res.json({ ok: true, salonId });
});

export default router;
