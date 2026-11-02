// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { routes } from "@/App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderApp(me: { status: number; body: unknown }) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(me.body), { status: me.status })));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={createMemoryRouter(routes)} />
    </QueryClientProvider>,
  );
}

test("sin sesión la barra ofrece iniciar sesión y registrarse", async () => {
  renderApp({ status: 401, body: { error: "No autenticado" } });
  expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Registrarse" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cerrar sesión" })).toBeNull();
});

test("con sesión de candidato muestra su nombre, mis aplicaciones y cerrar sesión", async () => {
  renderApp({ status: 200, body: { id: 1, email: "a@x.com", role: "CANDIDATE", name: "Ana" } });
  expect(await screen.findByText("Ana")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Mis aplicaciones" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Iniciar sesión" })).toBeNull();
});

test("con sesión de empresa ofrece nueva posición", async () => {
  renderApp({ status: 200, body: { id: 2, email: "e@x.com", role: "COMPANY", name: "Acme" } });
  expect(await screen.findByRole("link", { name: "Nueva posición" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Mis aplicaciones" })).toBeNull();
});
