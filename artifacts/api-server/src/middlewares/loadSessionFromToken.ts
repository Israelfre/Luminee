import type { Request, Response, NextFunction } from "express";
import { pool } from "@workspace/db";

type StoredSess = {
  adminUserId?: number;
  adminEmail?: string;
  salonId?: number;
};

/**
 * Se não há dados de sessão no cookie, hidrata a partir de `X-Auth-Token`
 * (mesmo padrão do gestorx7 para front estático em outro host).
 */
export async function loadSessionFromToken(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.session.adminUserId != null || req.session.salonId != null) {
    next();
    return;
  }

  const token = req.headers["x-auth-token"];
  if (typeof token !== "string" || !token.trim()) {
    next();
    return;
  }

  try {
    const result = await pool.query<{ sess: StoredSess }>(
      "SELECT sess FROM sessions WHERE sid = $1 AND expire > NOW()",
      [token.trim()],
    );
    if (result.rows.length === 0) {
      next();
      return;
    }
    const sessData = result.rows[0].sess;
    if (typeof sessData?.adminUserId === "number") {
      req.session.adminUserId = sessData.adminUserId;
      req.session.adminEmail =
        typeof sessData.adminEmail === "string" ? sessData.adminEmail : undefined;
    }
    if (typeof sessData?.salonId === "number") {
      req.session.salonId = sessData.salonId;
    }
  } catch {
    // ignore
  }

  next();
}
