import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createApp } from "./app";
import { resolveJwtSecret } from "./auth";

const dir = mkdtempSync(join(tmpdir(), "auth-"));
const url = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const app = createApp({ prisma, jwtSecret: "test-secret" });
const body = { email: "a@x.com", password: "password123", role: "CANDIDATE", name: "Ana" };

beforeAll(() => {
  execSync("npx prisma migrate deploy", { cwd: __dirname + "/..", env: { ...process.env, DATABASE_URL: url } });
}, 60_000);
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

test("registro crea usuario, pone cookie httpOnly y no expone el hash", async () => {
  const res = await request(app).post("/api/auth/register").send(body);
  expect(res.status).toBe(201);
  expect(res.body).toMatchObject({ email: "a@x.com", role: "CANDIDATE" });
  expect(res.body.passwordHash).toBeUndefined();
  expect(res.headers["set-cookie"][0]).toMatch(/token=.*HttpOnly.*SameSite=Lax/i);
});

test("registro duplicado da 409 y datos inválidos 400", async () => {
  expect((await request(app).post("/api/auth/register").send(body)).status).toBe(409);
  expect((await request(app).post("/api/auth/register").send({ ...body, password: "corta" })).status).toBe(400);
});

test("login correcto da cookie y /me devuelve el usuario", async () => {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email: body.email, password: body.password })).status).toBe(200);
  const me = await agent.get("/api/me");
  expect(me.status).toBe(200);
  expect(me.body.email).toBe("a@x.com");
});

test("login incorrecto da 401 (mismo mensaje con correo inexistente)", async () => {
  const bad = await request(app).post("/api/auth/login").send({ email: body.email, password: "equivocada1" });
  const none = await request(app).post("/api/auth/login").send({ email: "no@x.com", password: "password123" });
  expect([bad.status, none.status]).toEqual([401, 401]);
  expect(bad.body).toEqual(none.body);
});

test("/me sin cookie, con token inválido o tras logout da 401", async () => {
  expect((await request(app).get("/api/me")).status).toBe(401);
  expect((await request(app).get("/api/me").set("Cookie", "token=basura")).status).toBe(401);
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email: body.email, password: body.password });
  await agent.post("/api/auth/logout");
  expect((await agent.get("/api/me")).status).toBe(401);
});

test("el secreto se genera una vez y se reutiliza; la variable de entorno manda", () => {
  const file = join(dir, "sub", "jwt_secret");
  const first = resolveJwtSecret(file, undefined);
  expect(first.length).toBeGreaterThan(32);
  expect(resolveJwtSecret(file, undefined)).toBe(first);
  expect(resolveJwtSecret(file, "desde-env")).toBe("desde-env");
});
