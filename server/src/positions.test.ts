import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, expect, test } from "vitest";
import { createApp } from "./app";
import { seedIfEmpty } from "./seed";

const dir = mkdtempSync(join(tmpdir(), "pos-"));
const url = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });
const app = createApp({ prisma, jwtSecret: "s", authRateLimit: 1000 });

const login = async (email: string) => {
  const a = request.agent(app);
  await a.post("/api/auth/login").send({ email, password: "password123" }).expect(200);
  return a;
};
const newPos = { title: "Nueva", description: "Desc", location: "Quito", mode: "REMOTE" };

beforeAll(async () => {
  execSync("npx prisma migrate deploy", { cwd: __dirname + "/..", env: { ...process.env, DATABASE_URL: url } });
  await seedIfEmpty(prisma);
}, 60_000);
afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

test("lista y detalle son públicos; la lista solo trae abiertas", async () => {
  const list = await request(app).get("/api/positions?limit=50");
  expect(list.status).toBe(200);
  expect(list.body.items).toHaveLength(7); // 8 sembradas, 1 cerrada
  expect(list.body.total).toBe(7);
  expect(list.body.items[0].company.name).toBeTruthy();
  expect(list.body.items[0].company.email).toBeUndefined();
  expect((await request(app).get(`/api/positions/${list.body.items[0].id}`)).status).toBe(200);
  expect((await request(app).get("/api/positions/99999")).status).toBe(404);
  expect((await request(app).get("/api/positions/abc")).status).toBe(404);
});

test("filtros q, location y mode; filtro inválido da 400", async () => {
  const get = async (qs: string) => (await request(app).get(`/api/positions?${qs}`)).body.items;
  expect((await get("mode=REMOTE")).every((p: any) => p.mode === "REMOTE")).toBe(true);
  expect(await get("location=bogot")).toHaveLength(1); // la otra de Bogotá está cerrada
  expect(await get("q=playwright")).toHaveLength(1);
  expect(await get("q=playwright&mode=ONSITE")).toHaveLength(0);
  expect(await get("q=DISEÑADOR")).toHaveLength(1); // mayúsculas no ASCII
  expect(await get("location=MEDELLÍN")).toHaveLength(1);
  expect((await request(app).get("/api/positions?mode=XX")).status).toBe(400);
});

test("crear: 401 sin sesión, 403 candidato, 201 empresa; el dueño sale de la sesión", async () => {
  expect((await request(app).post("/api/positions").send(newPos)).status).toBe(401);
  const cand = await login("candidato@demo.com");
  expect((await cand.post("/api/positions").send(newPos)).status).toBe(403);
  const emp = await login("empresa1@demo.com");
  expect((await emp.post("/api/positions").send({ ...newPos, title: "" })).status).toBe(400);
  const res = await emp.post("/api/positions").send({ ...newPos, companyId: 3, status: "CLOSED" });
  expect(res.status).toBe(201);
  expect(res.body.company.name).toBe("Acme Software");
  expect(res.body.status).toBe("OPEN");
});

test("editar y cerrar: solo la empresa dueña", async () => {
  const emp1 = await login("empresa1@demo.com");
  const emp2 = await login("empresa2@demo.com");
  const cand = await login("candidato@demo.com");
  const { body: p } = await emp1.post("/api/positions").send(newPos);
  expect((await request(app).patch(`/api/positions/${p.id}`).send({ title: "X" })).status).toBe(401);
  expect((await cand.patch(`/api/positions/${p.id}`).send({ title: "X" })).status).toBe(403);
  expect((await emp2.patch(`/api/positions/${p.id}`).send({ title: "X" })).status).toBe(403);
  expect((await emp1.patch("/api/positions/99999").send({ title: "X" })).status).toBe(404);
  expect((await emp1.patch(`/api/positions/${p.id}`).send({})).status).toBe(400);
  expect((await emp1.patch(`/api/positions/${p.id}`).send({ title: "Editada" })).body.title).toBe("Editada");
  expect((await emp1.patch(`/api/positions/${p.id}`).send({ status: "CLOSED" })).body.status).toBe("CLOSED");
  const open = (await request(app).get("/api/positions?limit=50")).body.items.map((x: any) => x.id);
  expect(open).not.toContain(p.id);
});

test("una empresa puede reabrir su posición cerrada, y otra no", async () => {
  const emp1 = await login("empresa1@demo.com");
  const emp2 = await login("empresa2@demo.com");
  const { body: p } = await emp1.post("/api/positions").send(newPos);
  await emp1.patch(`/api/positions/${p.id}`).send({ status: "CLOSED" }).expect(200);
  const ids = async () => (await request(app).get("/api/positions?limit=50")).body.items.map((x: any) => x.id);
  expect(await ids()).not.toContain(p.id);
  expect((await emp2.patch(`/api/positions/${p.id}`).send({ status: "OPEN" })).status).toBe(403);
  expect((await emp1.patch(`/api/positions/${p.id}`).send({ status: "OPEN" })).body.status).toBe("OPEN");
  expect(await ids()).toContain(p.id);
});

test("paginación con limit y offset: páginas disjuntas, total estable y límites validados", async () => {
  const get = async (qs: string) => (await request(app).get(`/api/positions?${qs}`)).body;
  const [p1, p2, p3] = [await get("limit=3&offset=0"), await get("limit=3&offset=3"), await get("limit=3&offset=6")];
  expect(p1).toMatchObject({ limit: 3, offset: 0 });
  expect(p1.items).toHaveLength(3);
  expect(p2.items).toHaveLength(3);
  expect(p3.items.length).toBeGreaterThan(0);
  expect(new Set([...p1.items, ...p2.items, ...p3.items].map((x: any) => x.id)).size).toBe(p1.items.length + p2.items.length + p3.items.length);
  expect(p1.total).toBe(p3.total);
  expect((await get("offset=999")).items).toEqual([]);
  expect((await get("")).limit).toBe(10); // valores por defecto explícitos en la respuesta
  for (const qs of ["offset=-1", "limit=0", "limit=51", "offset=x"]) expect((await request(app).get(`/api/positions?${qs}`)).status).toBe(400);
});

test("al editar título o ubicación el filtro usa los valores nuevos", async () => {
  const emp = await login("empresa1@demo.com");
  const { body: p } = await emp.post("/api/positions").send({ ...newPos, title: "Zzcreada" });
  const find = async (qs: string) => (await request(app).get(`/api/positions?${qs}`)).body.items.map((x: any) => x.id);
  expect(await find("q=zzcreada")).toEqual([p.id]);
  await emp.patch(`/api/positions/${p.id}`).send({ title: "Zzrenombrada", location: "ÑANDÚ" }).expect(200);
  expect(await find("q=zzcreada")).toEqual([]);
  expect(await find("q=ZZRENOMBRADA&location=ñandú")).toEqual([p.id]);
});

test("las columnas internas de búsqueda no salen en la API", async () => {
  const emp = await login("empresa1@demo.com");
  const created = (await emp.post("/api/positions").send(newPos)).body;
  const list = (await request(app).get("/api/positions")).body.items[0];
  const detail = (await request(app).get(`/api/positions/${created.id}`)).body;
  const patched = (await emp.patch(`/api/positions/${created.id}`).send({ title: "Otra" })).body;
  for (const p of [created, list, detail, patched]) {
    expect(Object.keys(p)).not.toContain("searchLc");
    expect(Object.keys(p)).not.toContain("locationLc");
  }
});

test("mis posiciones: solo la empresa, solo las suyas (abiertas y cerradas) con su número de aplicantes", async () => {
  expect((await request(app).get("/api/me/positions")).status).toBe(401);
  expect((await (await login("candidato@demo.com")).get("/api/me/positions")).status).toBe(403);
  const emp = await login("empresa3@demo.com");
  const { body: p } = await emp.post("/api/positions").send(newPos);
  await emp.patch(`/api/positions/${p.id}`).send({ status: "CLOSED" }).expect(200);
  const res = await emp.get("/api/me/positions");
  expect(res.status).toBe(200);
  expect(res.body.every((x: any) => x.company.name === "Datos del Sur")).toBe(true);
  const mine = res.body.find((x: any) => x.id === p.id);
  expect(mine).toMatchObject({ status: "CLOSED", _count: { applications: 0 } });
  expect(Object.keys(mine)).not.toContain("searchLc");
  expect(res.body.some((x: any) => x.status === "OPEN")).toBe(true); // las cerradas no desplazan a las abiertas
});
