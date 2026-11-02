import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import type { PrismaClient } from "@prisma/client";
import { authRouter } from "./auth";

export function createApp(opts: { prisma: PrismaClient; jwtSecret: string; secureCookies?: boolean }) {
  const app = express();
  app.use(express.json(), cookieParser());
  app.get("/api/health", (_req, res) => void res.json({ ok: true }));
  app.use("/api", authRouter(opts.prisma, opts.jwtSecret, opts.secureCookies ?? false));

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
