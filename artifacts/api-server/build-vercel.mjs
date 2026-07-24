import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, mkdir, writeFile } from "node:fs/promises";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bundles the Vercel serverless entrypoint into plain JS ourselves.
 * @vercel/node's own TypeScript compiler ignores this repo's tsconfig
 * (moduleResolution/esModuleInterop overrides have no effect on it) and
 * produces spurious type errors for express/pino-http default imports —
 * so we hand it pre-built JS instead of raw TS.
 *
 * esbuild-plugin-pino emits extra worker chunk files alongside the entry
 * output, so we build to a directory OUTSIDE `api/` (any file under `api/`
 * becomes its own Vercel Function) and leave a thin re-export at
 * `api/index.js` — the single file Vercel actually detects as the function.
 */
async function buildAll() {
  const apiDir = path.join(artifactDir, "api");
  const bundleDir = path.join(artifactDir, "dist-vercel");
  await rm(apiDir, { recursive: true, force: true });
  await rm(bundleDir, { recursive: true, force: true });
  await mkdir(apiDir, { recursive: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/vercel-handler.ts")],
    outdir: bundleDir,
    platform: "node",
    bundle: true,
    format: "esm",
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@sentry/profiling-node",
      "aws-sdk",
      "mysql2",
      "newrelic",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] }),
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  await writeFile(
    path.join(apiDir, "index.js"),
    `export { default } from "../dist-vercel/vercel-handler.mjs";\n`,
  );
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
