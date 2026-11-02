import { describe, expect, test } from "vitest";
import {
  applySchema,
  loginSchema,
  positionCreateSchema,
  positionFiltersSchema,
  positionUpdateSchema,
  registerSchema,
} from "./index";

const valid = { email: "A@B.com", password: "12345678", role: "CANDIDATE", name: "Ana" };

describe("registerSchema", () => {
  test("acepta datos válidos y normaliza el email", () => {
    expect(registerSchema.parse(valid).email).toBe("a@b.com");
  });
  test.each([
    ["contraseña corta", { password: "1234567" }],
    ["rol inválido", { role: "ADMIN" }],
    ["email inválido", { email: "nope" }],
    ["nombre vacío", { name: "  " }],
  ])("rechaza %s", (_, patch) => {
    expect(registerSchema.safeParse({ ...valid, ...patch }).success).toBe(false);
  });
});

test("loginSchema exige email y contraseña", () => {
  expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
});

describe("posiciones", () => {
  const pos = { title: "Dev", description: "d", location: "Bogotá", mode: "REMOTE" };
  test("crear: válido e inválido", () => {
    expect(positionCreateSchema.safeParse(pos).success).toBe(true);
    expect(positionCreateSchema.safeParse({ ...pos, mode: "MARS" }).success).toBe(false);
    expect(positionCreateSchema.safeParse({ ...pos, title: "" }).success).toBe(false);
  });
  test("editar: parcial, permite cerrar y rechaza vacío", () => {
    expect(positionUpdateSchema.safeParse({ status: "CLOSED" }).success).toBe(true);
    expect(positionUpdateSchema.safeParse({}).success).toBe(false);
    expect(positionUpdateSchema.safeParse({ status: "DONE" }).success).toBe(false);
  });
  test("filtros: todos opcionales, modo validado", () => {
    expect(positionFiltersSchema.safeParse({}).success).toBe(true);
    expect(positionFiltersSchema.safeParse({ mode: "X" }).success).toBe(false);
  });
});

test("applySchema: mensaje opcional y con límite", () => {
  expect(applySchema.safeParse({}).success).toBe(true);
  expect(applySchema.safeParse({ message: "x".repeat(2001) }).success).toBe(false);
});
