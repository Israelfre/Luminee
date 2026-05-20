import type { Request, Response, NextFunction } from "express";

/**
 * Middleware para rotas que exigem autenticação de salão.
 * Verifica se há uma sessão de salão ativa e injeta `salonId` no objeto request.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  return requireSalon(req, res, next);
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
