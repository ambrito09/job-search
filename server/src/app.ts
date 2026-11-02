import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import type { PrismaClient } from "@prisma/client";
import { authRouter } from "./auth";
import { applicationsRouter } from "./applications";
import { positionsRouter } from "./positions";

export function createApp(opts: {
  prisma: PrismaClient;
  jwtSecret: string;
  secureCookies?: boolean;
  corsOrigin?: string; // solo hace falta si el cliente se sirve desde otro origen (p. ej. Vite en desarrollo)
  authRateLimit?: number; // intentos de registro/login por IP cada 15 min
}) {
  const app = express();
  if (opts.corsOrigin) app.use("/api", cors({ origin: opts.corsOrigin, credentials: true }));
  app.use(express.json(), cookieParser());
  app.get("/api/health", (_req, res) => void res.json({ ok: true }));
  // shortcut: contador en memoria, por proceso; con varias instancias hace falta un almacén compartido.
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: opts.authRateLimit ?? 20, standardHeaders: true, legacyHeaders: false, message: { error: "Demasiados intentos, inténtalo más tarde" } }));
  app.use("/api", authRouter(opts.prisma, opts.jwtSecret, opts.secureCookies ?? false));
  app.use("/api", positionsRouter(opts.prisma, opts.jwtSecret));
  app.use("/api", applicationsRouter(opts.prisma, opts.jwtSecret));

  app.use("/api", (_req, res) => void res.status(404).json({ error: "No encontrado" }));
  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    // JSON mal formado llega con status 400; el resto es un fallo interno que no se detalla al cliente.
    const status = err.status === 400 ? 400 : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 400 ? "JSON inválido" : "Error interno" });
  };
  app.use(onError);
  return app;
}
