import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

/** Resolves monorepo root whether this file runs from `src/` (tsx) or bundled `dist/`. */
function findRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 20; i++) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  throw new Error(
    "Could not find repo root (pnpm-workspace.yaml). Set env vars manually or run from the Luminee workspace.",
  );
}

// Na Vercel as env vars já vêm do ambiente da função — não há `.env` nem
// `pnpm-workspace.yaml` no filesystem da função para localizar a raiz do repo.
if (!process.env.VERCEL) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = findRepoRoot(here);
  const rootEnv = path.join(repoRoot, ".env");
  const apiEnv = path.join(here, "../.env");
  dotenv.config({ path: rootEnv });
  dotenv.config({ path: apiEnv, override: true });
}
