import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

// Em produção (Render), DATABASE_URL vem do ambiente diretamente.
// Em desenvolvimento, pode vir do .env carregado pelo dotenv-cli.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL não está definida. " +
    "Em produção: configure no painel do Render. " +
    "Em desenvolvimento: defina no .env da raiz do repositório.",
  );
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
