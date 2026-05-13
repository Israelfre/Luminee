import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.session.adminUserId == null) {
    res.status(401).json({ ok: false, error: "Não autorizado" });
    return;
  }
  next();
}
