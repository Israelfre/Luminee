import type { Request, Response, NextFunction } from "express";

export async function requireAuth(_req: Request, _res: Response, next: NextFunction): Promise<void> {
  next();
}

export async function requireSalon(req: Request, res: Response, next: NextFunction): Promise<void> {
  const salonId = req.session.salonId;
  if (salonId == null) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  (req as Request & { salonId: number }).salonId = salonId;
  next();
}
