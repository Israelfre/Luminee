import { randomUUID } from "crypto";

const salonTokens = new Map<string, number>();

export function createSalonToken(salonId: number): string {
  const token = randomUUID();
  salonTokens.set(token, salonId);
  return token;
}

export function getSalonIdFromToken(token: string): number | null {
  return salonTokens.get(token) ?? null;
}

export function deleteSalonToken(token: string): void {
  salonTokens.delete(token);
}
