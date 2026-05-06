import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setSalonTokenGetter } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "luminee_salon_token";
const SALON_KEY = "luminee_salon_info";

export interface SalonInfo {
  id: number;
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  plan?: string | null;
}

export function getSalonToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function salonHeaders(): Record<string, string> {
  const token = getSalonToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["X-Salon-Token"] = token;
  return h;
}

interface SalonAuthState {
  loggedIn: boolean;
  salon: SalonInfo | null;
  loading: boolean;
}

interface SalonAuthContextValue extends SalonAuthState {
  login(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
}

const SalonAuthContext = createContext<SalonAuthContextValue | null>(null);

export function SalonAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SalonAuthState>({ loggedIn: false, salon: null, loading: true });

  const check = useCallback(async () => {
    const token = getSalonToken();
    if (!token) { setState({ loggedIn: false, salon: null, loading: false }); return; }
    try {
      const res = await fetch(`${BASE}/api/salon-auth/check`, { headers: { "X-Salon-Token": token } });
      if (res.ok) {
        const saved = localStorage.getItem(SALON_KEY);
        const salon: SalonInfo | null = saved ? JSON.parse(saved) as SalonInfo : null;
        setState({ loggedIn: true, salon, loading: false });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SALON_KEY);
        setState({ loggedIn: false, salon: null, loading: false });
      }
    } catch {
      setState({ loggedIn: false, salon: null, loading: false });
    }
  }, []);

  useEffect(() => {
    setSalonTokenGetter(getSalonToken);
    return () => { setSalonTokenGetter(null); };
  }, []);

  useEffect(() => { check(); }, [check]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/salon-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { ok: boolean; token?: string; salon?: SalonInfo; error?: string };
    if (data.ok && data.token && data.salon) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(SALON_KEY, JSON.stringify(data.salon));
      setState({ loggedIn: true, salon: data.salon, loading: false });
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Erro ao entrar" };
  };

  const logout = async () => {
    const token = getSalonToken();
    if (token) {
      await fetch(`${BASE}/api/salon-auth/logout`, { method: "POST", headers: { "X-Salon-Token": token } });
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(SALON_KEY);
    setState({ loggedIn: false, salon: null, loading: false });
  };

  return <SalonAuthContext.Provider value={{ ...state, login, logout }}>{children}</SalonAuthContext.Provider>;
}

export function useSalonAuth() {
  const ctx = useContext(SalonAuthContext);
  if (!ctx) throw new Error("useSalonAuth must be used inside SalonAuthProvider");
  return ctx;
}
