import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { setSalonTokenGetter } from "@workspace/api-client-react";
import { API_PREFIX } from "@/lib/api-url";
import { getSessionToken, setSessionToken } from "@/lib/session-token";

const SALON_KEY = "luminee_salon_info";

export interface SalonInfo {
  id: number;
  name: string;
  email?: string | null;
  logoUrl?: string | null;
  plan?: string | null;
}

export function salonHeaders(): Record<string, string> {
  const token = getSessionToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["X-Auth-Token"] = token;
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
    const token = getSessionToken();
    if (!token) {
      setState({ loggedIn: false, salon: null, loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_PREFIX}/salon-auth/check`, {
        credentials: "include",
        headers: salonHeaders(),
      });
      if (res.ok) {
        const saved = localStorage.getItem(SALON_KEY);
        const salon: SalonInfo | null = saved ? (JSON.parse(saved) as SalonInfo) : null;
        setState({ loggedIn: true, salon, loading: false });
      } else {
        localStorage.removeItem(SALON_KEY);
        setState({ loggedIn: false, salon: null, loading: false });
      }
    } catch {
      setState({ loggedIn: false, salon: null, loading: false });
    }
  }, []);

  useEffect(() => {
    setSalonTokenGetter(getSessionToken);
    return () => {
      setSalonTokenGetter(null);
    };
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const login = async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_PREFIX}/salon-auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
    } catch {
      return {
        ok: false,
        error:
          "Sem ligação à API. Em dev, use o proxy do Vite ou defina VITE_API_URL na mesma origem da API.",
      };
    }
    const data = (await res.json()) as {
      ok: boolean;
      sessionId?: string;
      salon?: SalonInfo;
      error?: string;
    };
    if (data.ok && data.sessionId && data.salon) {
      setSessionToken(data.sessionId);
      localStorage.setItem(SALON_KEY, JSON.stringify(data.salon));
      setState({ loggedIn: true, salon: data.salon, loading: false });
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Erro ao entrar" };
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      await fetch(`${API_PREFIX}/salon-auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: salonHeaders(),
      });
    }
    setSessionToken(null);
    localStorage.removeItem(SALON_KEY);
    setState({ loggedIn: false, salon: null, loading: false });
  };

  return (
    <SalonAuthContext.Provider value={{ ...state, login, logout }}>{children}</SalonAuthContext.Provider>
  );
}

export function useSalonAuth() {
  const ctx = useContext(SalonAuthContext);
  if (!ctx) throw new Error("useSalonAuth must be used inside SalonAuthProvider");
  return ctx;
}
