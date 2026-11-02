// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ChunkErrorBoundary } from "./ChunkErrorBoundary";

afterEach(cleanup);

const Boom = () => {
  throw new Error("Failed to fetch dynamically imported module");
};

test("si un trozo no carga muestra un aviso con botón para recargar, en lugar de una página en blanco", () => {
  vi.spyOn(console, "error").mockImplementation(() => {}); // React registra el error capturado
  render(<ChunkErrorBoundary><Boom /></ChunkErrorBoundary>);
  expect(screen.getByRole("alert").textContent).toMatch(/No se pudo cargar esta pantalla/);
  expect(screen.getByRole("button", { name: "Recargar" })).toBeTruthy();
  vi.restoreAllMocks();
});

test("sin error muestra el contenido tal cual", () => {
  render(<ChunkErrorBoundary><p>contenido</p></ChunkErrorBoundary>);
  expect(screen.getByText("contenido")).toBeTruthy();
  expect(screen.queryByRole("alert")).toBeNull();
});
