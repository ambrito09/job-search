import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, expect, test } from "vitest";
import { seedIfEmpty } from "./seed";
import { backfillSearchColumns } from "./search";

const dir = mkdtempSync(join(tmpdir(), "seed-"));
const url = `file:${join(dir, "test.db").replaceAll("\\", "/")}`;
const prisma = new PrismaClient({ datasources: { db: { url } } });

beforeAll(() => {
  execSync("npx prisma migrate deploy", { cwd: __dirname + "/..", env: { ...process.env, DATABASE_URL: url } });
}, 60_000);

afterAll(async () => {
  await prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

test("siembra una vez y no duplica al repetir", async () => {
  expect(await seedIfEmpty(prisma)).toBe(true);
  const counts = async () => [await prisma.user.count(), await prisma.position.count(), await prisma.application.count()];
  const first = await counts();
  expect(first).toEqual([4, 8, 1]);

  expect(await seedIfEmpty(prisma)).toBe(false);
  expect(await counts()).toEqual(first);
  expect(await prisma.position.count({ where: { status: "CLOSED" } })).toBe(1);
});

test("la siembra deja las columnas de búsqueda y el backfill arregla filas viejas", async () => {
  expect(await prisma.position.count({ where: { searchLc: "" } })).toBe(0);
  const p = await prisma.position.findFirstOrThrow();
  await prisma.position.update({ where: { id: p.id }, data: { searchLc: "", locationLc: "" } });
  expect(await backfillSearchColumns(prisma)).toBe(1);
  expect(await backfillSearchColumns(prisma)).toBe(0);
  expect((await prisma.position.findUniqueOrThrow({ where: { id: p.id } })).locationLc).toBe(p.location.toLowerCase());
});
