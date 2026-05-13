import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { API_PREFIX } from "@/lib/api-url";
import { getSessionToken, setSessionToken } from "@/lib/session-token";

export function adminHeaders(): Record<string, string> {
  const token = getSessionToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["X-Auth-Token"] = token;
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
    const token = getSessionToken();
    if (!token) {
      setState({ loggedIn: false, email: null, loading: false });
      return;
    }
    try {
      const res = await fetch(`${API_PREFIX}/admin/check`, {
        credentials: "include",
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = (await res.json()) as { ok: boolean; email?: string };
        setState({ loggedIn: true, email: data.email ?? null, loading: false });
      } else {
        setState({ loggedIn: false, email: null, loading: false });
      }
    } catch {
      setState({ loggedIn: false, email: null, loading: false });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const login = async (email: string, password: string) => {
    let res: Response;
    try {
      res = await fetch(`${API_PREFIX}/admin/login`, {
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
      ok?: boolean;
      error?: string;
      sessionId?: string;
      email?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error ?? "Erro ao entrar" };
    }
    if (data.sessionId) {
      setSessionToken(data.sessionId);
    }
    setState({ loggedIn: true, email: data.email ?? null, loading: false });
    return { ok: true };
  };

  const logout = async () => {
    const token = getSessionToken();
    if (token) {
      await fetch(`${API_PREFIX}/admin/logout`, {
        method: "POST",
        credentials: "include",
        headers: adminHeaders(),
      });
    }
    setSessionToken(null);
    setState({ loggedIn: false, email: null, loading: false });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Compat: painel admin usa o mesmo token de sessão. */
export function getAdminToken(): string | null {
  return getSessionToken();
}
