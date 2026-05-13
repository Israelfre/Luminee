import { Router, Request, Response } from "express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ ok: false, error: "E-mail e senha obrigatórios" });
    return;
  }

  try {
    const [salon] = await db
      .select()
      .from(salonsTable)
      .where(eq(salonsTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (!salon) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }

    if (salon.password == null) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }

    const isHash = salon.password.startsWith("$2");
    const valid = isHash
      ? await bcrypt.compare(password.trim(), salon.password)
      : salon.password === password.trim();
    if (!valid) {
      res.status(401).json({ ok: false, error: "E-mail ou senha incorretos" });
      return;
    }

    await regenerateSession(req);
    req.session.salonId = salon.id;
    delete req.session.adminUserId;
    delete req.session.adminEmail;
    await saveSession(req);

    res.json({
      ok: true,
      sessionId: req.sessionID,
      salon: {
        id: salon.id,
        name: salon.name,
        email: salon.email,
        logoUrl: salon.logoUrl,
        plan: salon.plan,
      },
    });
  } catch (e) {
    req.log?.error({ err: e }, "salon login");
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
  if (req.session.salonId == null) {
    res.status(401).json({ ok: false });
    return;
  }
  res.json({ ok: true, salonId: req.session.salonId });
});

export default router;
