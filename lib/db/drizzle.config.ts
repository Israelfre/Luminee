import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

// Migrations devem rodar na conexão direta do Supabase (não no pooler),
// pois o pgbouncer em modo transaction não suporta comandos de sessão/DDL
// usados pelo drizzle-kit. Fallback para DATABASE_URL fora do Supabase.
const migrationUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "DIRECT_URL (ou DATABASE_URL) não está definida. " +
    "Em produção: configure no painel do Render/Vercel. " +
    "Em desenvolvimento: defina no .env da raiz do repositório.",
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
});
