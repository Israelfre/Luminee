/** Mesmo `sid` guardado pelo `connect-pg-simple` (padrão gestorx7 com `X-Auth-Token`). */
export const SESSION_TOKEN_KEY = "luminee_sid";

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token);
    else localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
