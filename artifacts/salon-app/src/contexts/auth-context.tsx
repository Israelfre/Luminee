import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const TOKEN_KEY = "luminee_admin_token";

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

interface AuthState {
  loggedIn: boolean;
  email: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loggedIn: false, email: null, loading: true });

  const check = useCallback(async () => {
    const token = getAdminToken();
    if (!token) { setState({ loggedIn: false, email: null, loading: false }); return; }
    try {
      const res = await fetch(`${BASE}/api/admin/check`, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { ok: boolean; email?: string };
        setState({ loggedIn: true, email: data.email ?? null, loading: false });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setState({ loggedIn: false, email: null, loading: false });
      }
    } catch {
      setState({ loggedIn: false, email: null, loading: false });
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json() as { ok: boolean; email?: string; token?: string; error?: string };
    if (data.ok && data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setState({ loggedIn: true, email: data.email ?? null, loading: false });
      return { ok: true };
    }
    return { ok: false, error: data.error ?? "Erro ao entrar" };
  };

  const logout = async () => {
    const token = getAdminToken();
    if (token) {
      await fetch(`${BASE}/api/admin/logout`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
    }
    localStorage.removeItem(TOKEN_KEY);
    setState({ loggedIn: false, email: null, loading: false });
  };

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
