/**
 * Deve ser o primeiro import de `seed.ts`, para que `DATABASE_URL` exista
 * antes de carregar `@workspace/db` (que valida env no import).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: path.join(repoRoot, ".env") });
