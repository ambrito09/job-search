import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Router, type RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient, Role } from "@prisma/client";
import { loginSchema, registerSchema } from "@app/shared";
import { validate } from "./validate";

const COOKIE = "token";
const MAX_AGE_S = 8 * 3600;

// Variable de entorno, o archivo (se crea en el primer arranque y se reutiliza después).
export function resolveJwtSecret(file: string, env = process.env.JWT_SECRET): string {
  if (env) return env;
  if (existsSync(file)) return readFileSync(file, "utf8").trim();
  const secret = randomBytes(48).toString("hex");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, secret, { mode: 0o600 });
  return secret;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: { id: number; role: Role };
  }
}

export const requireAuth = (secret: string): RequestHandler => (req, res, next) => {
  try {
    const p = jwt.verify(req.cookies?.[COOKIE] ?? "", secret) as unknown as { sub: string; role: Role };
    req.user = { id: Number(p.sub), role: p.role };
    next();
  } catch {
    res.status(401).json({ error: "No autenticado" });
  }
};

export const requireRole = (role: Role): RequestHandler => (req, res, next) =>
  req.user?.role === role ? next() : void res.status(403).json({ error: "Prohibido" });

export function authRouter(prisma: PrismaClient, secret: string, secure: boolean) {
  const r = Router();
  const publicUser = (u: { id: number; email: string; role: Role; name: string }) => ({
    id: u.id, email: u.email, role: u.role, name: u.name,
  });
  const start = (res: Parameters<RequestHandler>[1], u: { id: number; role: Role }) =>
    res.cookie(COOKIE, jwt.sign({ role: u.role }, secret, { subject: String(u.id), expiresIn: MAX_AGE_S }), {
      httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: MAX_AGE_S * 1000,
    });

  r.post("/auth/register", validate(registerSchema), async (req, res) => {
    const { email, password, role, name } = req.body;
    if (await prisma.user.findUnique({ where: { email } })) {
      res.status(409).json({ error: "El correo ya está registrado" });
      return;
    }
    const user = await prisma.user.create({ data: { email, role, name, passwordHash: await bcrypt.hash(password, 10) } });
    start(res, user);
    res.status(201).json(publicUser(user));
  });

  r.post("/auth/login", validate(loginSchema), async (req, res) => {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } });
    // shortcut: no hay hash ficticio, así que el tiempo de respuesta delata si el correo existe; añadir si importa.
    if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }
    start(res, user);
    res.json(publicUser(user));
  });

  r.post("/auth/logout", (_req, res) => {
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure, path: "/" });
    res.status(204).end();
  });

  r.get("/me", requireAuth(secret), async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    user ? res.json(publicUser(user)) : res.status(401).json({ error: "No autenticado" });
  });

  return r;
}
