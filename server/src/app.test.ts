import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import express from "express";
import request from "supertest";
import { expect, test } from "vitest";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";
import { validate } from "./validate";

test("health responde ok", async () => {
  const res = await request(createApp({ prisma: new PrismaClient(), jwtSecret: "test" })).get("/api/health");
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ ok: true });
});

test("ruta api desconocida devuelve { error } 404", async () => {
  const res = await request(createApp({ prisma: new PrismaClient(), jwtSecret: "test" })).get("/api/nope");
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: "No encontrado" });
});

test("JSON mal formado devuelve { error } 400", async () => {
  const res = await request(createApp({ prisma: new PrismaClient(), jwtSecret: "test" })).post("/api/health").set("Content-Type", "application/json").send("{x");
  expect(res.status).toBe(400);
  expect(res.body).toHaveProperty("error");
});

test("validate rechaza cuerpo inválido y acepta el válido", async () => {
  const app = express().use(express.json()).post("/x", validate(z.object({ a: z.string() })), (req, res) => void res.json(req.body));
  expect((await request(app).post("/x").send({ a: 1 })).status).toBe(400);
  expect((await request(app).post("/x").send({ a: "ok" })).body).toEqual({ a: "ok" });
});

test("rate limit en /api/auth devuelve 429 { error } al pasar el límite", async () => {
  const app = createApp({ prisma: new PrismaClient(), jwtSecret: "t", authRateLimit: 2 });
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await request(app).post("/api/auth/login").send({})).status);
  expect(codes).toEqual([400, 400, 429]);
  expect((await request(app).get("/api/health")).status).toBe(200);
});

test("CORS solo se activa con corsOrigin y permite credenciales", async () => {
  const origin = "http://localhost:5173";
  const on = await request(createApp({ prisma: new PrismaClient(), jwtSecret: "t", corsOrigin: origin })).get("/api/health").set("Origin", origin);
  expect(on.headers["access-control-allow-origin"]).toBe(origin);
  expect(on.headers["access-control-allow-credentials"]).toBe("true");
  const off = await request(createApp({ prisma: new PrismaClient(), jwtSecret: "t" })).get("/api/health").set("Origin", origin);
  expect(off.headers["access-control-allow-origin"]).toBeUndefined();
});

test("con staticDir sirve el cliente, hace fallback a index.html y no pisa /api", async () => {
  const dir = mkdtempSync(join(tmpdir(), "static-"));
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "index.html"), "<html>cliente</html>");
  writeFileSync(join(dir, "assets", "a.js"), "console.log(1)");
  try {
    const app = createApp({ prisma: new PrismaClient(), jwtSecret: "t", staticDir: dir });
    expect((await request(app).get("/")).text).toContain("cliente");
    expect((await request(app).get("/positions/7?q=x")).text).toContain("cliente"); // ruta de React Router
    expect((await request(app).get("/assets/a.js")).text).toBe("console.log(1)");
    const api404 = await request(app).get("/api/nope");
    expect([api404.status, api404.body]).toEqual([404, { error: "No encontrado" }]);
    expect((await request(app).get("/api/health")).body).toEqual({ ok: true });
    expect((await request(app).post("/positions")).status).toBe(404); // el fallback es solo GET
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
