import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { db, salonsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSalonIdFromToken } from "../lib/salonTokens";

export async function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export async function requireSalon(req: Request, _res: Response, next: NextFunction) {
  // 1. Salon token (email+password login from admin-created accounts)
  const salonToken = req.headers["x-salon-token"];
  if (typeof salonToken === "string" && salonToken) {
    const salonId = getSalonIdFromToken(salonToken);
    if (salonId) {
      (req as Request & { salonId: number }).salonId = salonId;
      return next();
    }
  }

  // 2. Clerk JWT (original Clerk-registered owners)
  const { userId } = getAuth(req);
  if (userId) {
    const [salon] = await db.select().from(salonsTable).where(eq(salonsTable.clerkUserId, userId)).limit(1);
    if (salon) {
      (req as Request & { salonId: number }).salonId = salon.id;
      return next();
    }
  }

  // 3. Demo fallback — first salon in DB
  const [demoSalon] = await db.select().from(salonsTable).limit(1);
  (req as Request & { salonId: number }).salonId = demoSalon?.id ?? 1;
  next();
}
