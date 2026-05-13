/** Base da API sem `/api` (ex.: `https://luminee-api.onrender.com`). Não inclua `/api` no fim. */
function normalizeApiBase(): string {
  const raw = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (raw) {
    return raw.replace(/\/$/, "").replace(/\/api\/?$/i, "");
  }
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

export const API_BASE = normalizeApiBase();

export const API_PREFIX = `${API_BASE}/api`;
