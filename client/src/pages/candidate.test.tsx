// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useRoutes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { routes } from "@/App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ana = { id: 1, email: "a@x.com", role: "CANDIDATE", name: "Ana" };
const acme = { id: 2, email: "e@x.com", role: "COMPANY", name: "Acme" };
const pos = (status = "OPEN") => ({
  id: 7, title: "Dev React", description: "Desc", location: "Bogotá", mode: "REMOTE", status,
  createdAt: "2026-01-01", company: { id: 2, name: "Acme" },
});
const app = (position = pos()) => ({ id: 1, positionId: position.id, message: "Hola, me interesa", createdAt: "2026-01-02", position });

type Reply = { status: number; body?: unknown };
function mockApi(handlers: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const h = handlers[`${init?.method ?? "GET"} ${url}`];
    const r = (typeof h === "function" ? h() : h) ?? { status: 401, body: { error: "No autenticado" } };
    return new Response(JSON.stringify(r.body ?? null), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const posts = (f: ReturnType<typeof mockApi>) => f.mock.calls.filter(([, i]) => i?.method === "POST");

const Probe = () => {
  const { pathname } = useLocation();
  return (
    <>
      <span data-testid="url">{pathname}</span>
      {useRoutes(routes)}
    </>
  );
};
const renderAt = (url: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[url]}><Probe /></MemoryRouter>
    </QueryClientProvider>,
  );

test("un visitante ve 'Inicia sesión para aplicar' y va a login", async () => {
  mockApi({ "GET /api/positions/7": { status: 200, body: pos() } });
  renderAt("/positions/7");
  await userEvent.click(await screen.findByRole("link", { name: "Inicia sesión para aplicar" }));
  expect(screen.getByTestId("url").textContent).toBe("/login");
});

test("un candidato aplica con mensaje y ve la confirmación", async () => {
  const f = mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/me/applications": { status: 200, body: [] },
    "POST /api/positions/7/applications": { status: 201, body: { id: 1 } },
  });
  renderAt("/positions/7");
  await userEvent.type(await screen.findByLabelText("Mensaje (opcional)"), "Hola, me interesa");
  await userEvent.click(screen.getByRole("button", { name: "Aplicar" }));
  expect(await screen.findByText("Ya aplicaste a esta posición")).toBeTruthy();
  expect(JSON.parse(posts(f)[0][1]!.body as string)).toEqual({ message: "Hola, me interesa" });
  expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();
});

test("aplicar sin mensaje no envía mensaje", async () => {
  const f = mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/me/applications": { status: 200, body: [] },
    "POST /api/positions/7/applications": { status: 201, body: { id: 1 } },
  });
  renderAt("/positions/7");
  await userEvent.click(await screen.findByRole("button", { name: "Aplicar" }));
  await screen.findByText("Ya aplicaste a esta posición");
  expect(JSON.parse(posts(f)[0][1]!.body as string)).toEqual({});
});

test("si ya aplicó, el detalle lo dice y no ofrece el formulario", async () => {
  mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/me/applications": { status: 200, body: [app()] },
  });
  renderAt("/positions/7");
  expect(await screen.findByText("Ya aplicaste a esta posición")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();
});

test("el duplicado que detecta el servidor (409) muestra un error claro", async () => {
  mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/me/applications": { status: 200, body: [] }, // la lista local aún no lo sabe
    "POST /api/positions/7/applications": { status: 409, body: { error: "Ya aplicaste a esta posición" } },
  });
  renderAt("/positions/7");
  await userEvent.click(await screen.findByRole("button", { name: "Aplicar" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Ya aplicaste a esta posición");
  expect(screen.getByRole("button", { name: "Aplicar" })).toBeTruthy(); // puede reintentar o salir
});

test("no se ofrece aplicar en posiciones cerradas ni a empresas", async () => {
  mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/positions/7": { status: 200, body: pos("CLOSED") },
    "GET /api/me/applications": { status: 200, body: [] },
  });
  renderAt("/positions/7");
  await screen.findByText("Posición cerrada");
  expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();
  cleanup();
  mockApi({ "GET /api/me": { status: 200, body: acme }, "GET /api/positions/7": { status: 200, body: pos() } });
  renderAt("/positions/7");
  await screen.findByRole("heading", { name: "Dev React" });
  expect(screen.queryByRole("button", { name: "Aplicar" })).toBeNull();
  expect(screen.queryByRole("link", { name: /Inicia sesión para aplicar/ })).toBeNull();
});

test("mis aplicaciones: lista con posición, estado y mensaje; vacío; 403 a empresas", async () => {
  mockApi({
    "GET /api/me": { status: 200, body: ana },
    "GET /api/me/applications": { status: 200, body: [app(), { ...app(pos("CLOSED")), id: 2, message: null }] },
  });
  renderAt("/me/applications");
  expect((await screen.findAllByText("Dev React")).length).toBe(2);
  expect(screen.getByText("Hola, me interesa")).toBeTruthy();
  expect(screen.getByText("Cerrada")).toBeTruthy();
  cleanup();
  mockApi({ "GET /api/me": { status: 200, body: ana }, "GET /api/me/applications": { status: 200, body: [] } });
  renderAt("/me/applications");
  expect(await screen.findByText(/Aún no has aplicado/)).toBeTruthy();
  cleanup();
  mockApi({ "GET /api/me": { status: 200, body: acme } });
  renderAt("/me/applications");
  expect((await screen.findByRole("alert")).textContent).toMatch(/403/);
});
