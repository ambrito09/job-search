import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createApp } from "./app";
import { seedIfEmpty } from "./seed";

const dir = mkdtempSync(join(tmpdir(), "app-"));
const url = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const app = createApp({ prisma, jwtSecret: "s", authRateLimit: 1000 });

const login = async (email: string) => {
  const a = request.agent(app);
  await a.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
  return a;
};
let openId: number, closedId: number, otherId: number;

beforeAll(async () => {
  execSync("npx prisma migrate deploy", { cwd: __dirname + "/..", env: { ...process.env, DATABASE_URL: url } });
  await seedIfEmpty(prisma);
  // El seed reparte posiciones entre empresas: empresa1 (Acme) es dueña de la primera abierta.
  const acme = await prisma.user.findUniqueOrThrow({ where: { email: "empresa1@demo.com" } });
  openId = (await prisma.position.findFirstOrThrow({ where: { status: "OPEN", companyId: acme.id, applications: { none: {} } } })).id;
  otherId = (await prisma.position.findFirstOrThrow({ where: { status: "OPEN", companyId: { not: acme.id } } })).id;
  closedId = (await prisma.position.findFirstOrThrow({ where: { status: "CLOSED" } })).id;
}, 60_000);
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

test("aplicar: 401 sin sesión, 403 empresa, 404 inexistente", async () => {
  expect((await request(app).post(`/api/positions/${openId}/applications`).send({})).status).toBe(401);
  const emp = await login("empresa1@demo.com");
  expect((await emp.post(`/api/positions/${openId}/applications`).send({})).status).toBe(403);
  const cand = await login("candidato@demo.com");
  expect((await cand.post("/api/positions/99999/applications").send({})).status).toBe(404);
});

test("aplicar: 201 (con o sin cuerpo), 409 duplicada, 409 cerrada", async () => {
  const cand = await login("candidato@demo.com");
  const ok = await cand.post(`/api/positions/${openId}/applications`).send({ message: "Hola", candidateId: 999 });
  expect(ok.status).toBe(201);
  expect(ok.body.candidateId).not.toBe(999); // el candidato sale de la sesión
  expect((await cand.post(`/api/positions/${openId}/applications`).send({})).status).toBe(409);
  expect((await cand.post(`/api/positions/${closedId}/applications`)).status).toBe(409);
  expect((await cand.post(`/api/positions/${otherId}/applications`)).status).toBe(201); // sin cuerpo
});

test("aplicantes: solo la empresa dueña", async () => {
  expect((await request(app).get(`/api/positions/${openId}/applications`)).status).toBe(401);
  const cand = await login("candidato@demo.com");
  expect((await cand.get(`/api/positions/${openId}/applications`)).status).toBe(403);
  const other = await login("empresa3@demo.com");
  expect((await other.get(`/api/positions/${openId}/applications`)).status).toBe(403);
  const owner = await login("empresa1@demo.com");
  expect((await owner.get("/api/positions/99999/applications")).status).toBe(404);
  const res = await owner.get(`/api/positions/${openId}/applications`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].candidate).toEqual({ id: expect.any(Number), name: "Ana Candidata", email: "candidato@demo.com" });
  expect(res.body[0].candidate.passwordHash).toBeUndefined();
});

test("mis aplicaciones: 401 sin sesión, 403 empresa, el candidato ve las suyas con la posición", async () => {
  expect((await request(app).get("/api/me/applications")).status).toBe(401);
  const emp = await login("empresa1@demo.com");
  expect((await emp.get("/api/me/applications")).status).toBe(403);
  const cand = await login("candidato@demo.com");
  const res = await cand.get("/api/me/applications");
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(3); // 1 del seed + 2 de estos tests
  expect(res.body[0].position.company.name).toBeTruthy();
  const nuevo = request.agent(app);
  await nuevo.post("/api/auth/register").send({ email: "n@x.com", password: "password123", role: "CANDIDATE", name: "N" }).expect(201);
  expect((await nuevo.get("/api/me/applications")).body).toEqual([]); // no ve las de otros
});
