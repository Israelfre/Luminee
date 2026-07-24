import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool as pgPool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { loadSessionFromToken } from "./middlewares/loadSessionFromToken";

const PgSession = connectPgSimple(session);

const app: Express = express();

const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  app.set("trust proxy", 1);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// CORS: em produção usa VITE_API_URL ou permite qualquer origem com credentials
// (necessário para o front estático servido pelo mesmo serviço no Render)
const allowedOrigins = (() => {
  const raw = process.env.ALLOWED_ORIGINS ?? process.env.VITE_API_URL ?? "";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
})();

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // sem origem = same-origin (curl, SSR, etc.) → sempre ok
      if (!origin) return callback(null, true);
      // em dev ou sem lista configurada → permite tudo
      if (!isProd || allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    },
  }),
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

const sessionMiddleware = session({
  store: new PgSession({
    pool: pgPool,
    tableName: "sessions",
    // Limpa sessões expiradas a cada hora
    pruneSessionInterval: 60 * 60,
  }),
  name: "luminee.sid",
  secret: process.env["SESSION_SECRET"] ?? "luminee-secret-dev-change-in-prod",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);
app.use(loadSessionFromToken);

app.use("/api", router);

// Serve React frontend static files in production
if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendDist = path.resolve(__dirname, "../../salon-app/dist/public");
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get("/{*path}", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
    logger.info({ frontendDist }, "Serving frontend static files");
  } else {
    logger.warn({ frontendDist }, "Frontend dist not found, skipping static serving");
  }
}

export default app;
