import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
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

test("mis posiciones devuelve como máximo las 20 más recientes", async () => {
  const emp = await login("empresa2@demo.com");
  for (let i = 0; i < 21; i++) await emp.post("/api/positions").send({ ...newPos, title: `Masiva ${i}` }).expect(201);
  const res = await emp.get("/api/me/positions");
  expect(res.body).toHaveLength(20);
  expect(res.body[0].title).toBe("Masiva 20"); // la más reciente primero
  expect(res.body.some((x: any) => x.title === "Masiva 0")).toBe(false);
}, 30_000);

test("la lista no incluye la descripción pero el detalle sí", async () => {
  const list = (await request(app).get("/api/positions?limit=1")).body.items[0];
  expect(Object.keys(list)).not.toContain("description");
  expect(list.title).toBeTruthy();
  const detail = (await request(app).get(`/api/positions/${list.id}`)).body;
  expect(detail.description).toBeTruthy();
});

test("la consulta de la lista usa el índice (status, createdAt, id) y no ordena aparte", async () => {
  const plan = await prisma.$queryRawUnsafe<{ detail: string }[]>(
    "EXPLAIN QUERY PLAN SELECT id FROM Position WHERE status = 'OPEN' ORDER BY createdAt DESC, id DESC LIMIT 10 OFFSET 0",
  );
  const text = plan.map((r) => r.detail).join("\n");
  expect(text).toContain("Position_status_createdAt_id_idx");
  expect(text).not.toContain("TEMP B-TREE");
});

test("mis posiciones usa el índice (companyId, createdAt, id) sin ordenar aparte", async () => {
  const plan = await prisma.$queryRawUnsafe<{ detail: string }[]>(
    "EXPLAIN QUERY PLAN SELECT id FROM Position WHERE companyId = 1 ORDER BY createdAt DESC, id DESC LIMIT 20",
  );
  const text = plan.map((r) => r.detail).join("\n");
  expect(text).toContain("Position_companyId_createdAt_id_idx");
  expect(text).not.toContain("TEMP B-TREE");
});

describe("búsqueda de texto (índice FTS5)", () => {
  const find = async (qs: string) => (await request(app).get(`/api/positions?${qs}`)).body;
  const titles = async (qs: string) => (await find(qs)).items.map((p: any) => p.title);

  test("encuentra subcadenas (como contains) sin distinguir mayúsculas", async () => {
    expect(await titles("q=SCRIPT")).toEqual(["Desarrollador/a Frontend"]); // "TypeScript" (la de Full-stack está cerrada)
    expect(await titles("q=prototipos%20para")).toEqual(["Diseñador/a UX"]); // frase con espacios
  });

  test("combina q, location y mode", async () => {
    expect(await titles("q=react&location=bogot")).toEqual(["Desarrollador/a Frontend"]);
    expect(await titles("q=react&location=lima")).toEqual([]);
    expect(await titles("q=node&mode=REMOTE")).toEqual(["Ingeniero/a Backend"]);
    expect(await titles("q=node&mode=ONSITE")).toEqual([]);
  });

  test("términos de 1 o 2 caracteres (fuera del índice) también funcionan", async () => {
    expect(await titles("q=ux")).toEqual(["Diseñador/a UX"]);
    expect(await titles("location=li")).toEqual(["QA Automation"]); // Lima
  });

  test("los caracteres especiales son texto literal, no sintaxis", async () => {
    for (const q of ['"', "%", "_", "*", "react AND", "NEAR(", 'a"b', "'; DROP TABLE Position;--", "colon:term"]) {
      const res = await request(app).get(`/api/positions?q=${encodeURIComponent(q)}`);
      expect(res.status, q).toBe(200);
      expect(res.body.items, q).toEqual([]);
    }
    expect((await request(app).get("/api/positions?limit=1")).body.total).toBeGreaterThan(0); // la tabla sigue intacta
  });

  test("paginación y total con texto", async () => {
    const emp = await login("empresa1@demo.com");
    for (let i = 1; i <= 3; i++) await emp.post("/api/positions").send({ ...newPos, title: `Pagfts ${i}` }).expect(201);
    const p1 = await find("q=pagfts&limit=2&offset=0");
    const p2 = await find("q=pagfts&limit=2&offset=2");
    expect([p1.total, p2.total]).toEqual([3, 3]);
    expect(p1.items.map((p: any) => p.title)).toEqual(["Pagfts 3", "Pagfts 2"]); // más reciente primero
    expect(p2.items.map((p: any) => p.title)).toEqual(["Pagfts 1"]);
    expect(Object.keys(p1.items[0])).not.toContain("description");
  });

  test("el índice sigue a los cambios: crear, editar, cerrar y borrar", async () => {
    const emp = await login("empresa2@demo.com");
    const { body: p } = await emp.post("/api/positions").send({ ...newPos, title: "Ftsviejo" });
    expect(await titles("q=ftsviejo")).toEqual(["Ftsviejo"]); // trigger de alta
    await emp.patch(`/api/positions/${p.id}`).send({ title: "Ftsnuevo" }).expect(200);
    expect(await titles("q=ftsviejo")).toEqual([]); // trigger de edición: ya no aparece con el texto viejo
    expect(await titles("q=ftsnuevo")).toEqual(["Ftsnuevo"]);
    await emp.patch(`/api/positions/${p.id}`).send({ status: "CLOSED" }).expect(200);
    expect(await titles("q=ftsnuevo")).toEqual([]); // cerrada: fuera de la lista pública
    await emp.patch(`/api/positions/${p.id}`).send({ status: "OPEN" }).expect(200);
    expect(await titles("q=ftsnuevo")).toEqual(["Ftsnuevo"]);

    const inIndex = async () =>
      Number((await prisma.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM PositionSearch WHERE PositionSearch MATCH '"ftsnuevo"'`))[0].n);
    expect(await inIndex()).toBe(1);
    await prisma.position.delete({ where: { id: p.id } }); // trigger de baja
    expect(await inIndex()).toBe(0);
  });

  test("el plan usa la tabla FTS y no recorre Position", async () => {
    const plan = await prisma.$queryRawUnsafe<{ detail: string }[]>(
      `EXPLAIN QUERY PLAN SELECT p.id FROM Position p WHERE p.status = 'OPEN' AND p.id IN (SELECT rowid FROM PositionSearch WHERE PositionSearch MATCH 'searchLc : "react"') ORDER BY p.createdAt DESC, p.id DESC LIMIT 10`,
    );
    const text = plan.map((r) => r.detail).join("\n");
    expect(text).toContain("VIRTUAL TABLE INDEX");
    expect(text).not.toMatch(/SCAN (p|Position)\b/); // sí puede recorrer el índice, pero no la tabla
  });
});
