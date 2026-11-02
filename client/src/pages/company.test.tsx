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

const acme = { id: 2, email: "e@x.com", role: "COMPANY", name: "Acme" };
const otra = { ...acme, id: 3, name: "Otra" };
const ana = { id: 1, email: "a@x.com", role: "CANDIDATE", name: "Ana" };
const pos = (status = "OPEN") => ({
  id: 7, title: "Dev React", description: "Desc", location: "Bogotá", mode: "REMOTE", status,
  createdAt: "2026-01-01", company: { id: 2, name: "Acme" },
});

type Reply = { status: number; body?: unknown };
// Handlers por "MÉTODO /ruta"; lo no declarado responde 401. Devuelve las peticiones hechas.
function mockApi(handlers: Record<string, Reply | (() => Reply)>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const h = handlers[`${init?.method ?? "GET"} ${url}`];
    const r = (typeof h === "function" ? h() : h) ?? { status: 401, body: { error: "No autenticado" } };
    return new Response(JSON.stringify(r.body ?? null), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return () => fetchMock.mock.calls.map(([u, i]) => `${i?.method ?? "GET"} ${u}`);
}

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

test("nueva posición: el formulario vacío muestra errores y no llama a la API", async () => {
  const calls = mockApi({ "GET /api/me": { status: 200, body: acme } });
  renderAt("/company/positions/new");
  await userEvent.click(await screen.findByRole("button", { name: "Publicar posición" }));
  expect((await screen.findAllByText("Obligatorio")).length).toBe(3); // título, descripción, ubicación
  expect(calls().some((c) => c.startsWith("POST"))).toBe(false);
});

test("nueva posición: envía el formulario y va a los aplicantes de la posición creada", async () => {
  const fetchSpy = mockApi({
    "GET /api/me": { status: 200, body: acme },
    "POST /api/positions": { status: 201, body: pos() },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/positions/7/applications": { status: 200, body: [] },
  });
  renderAt("/company/positions/new");
  await userEvent.type(await screen.findByLabelText("Título"), "Dev React");
  await userEvent.type(screen.getByLabelText("Descripción"), "Desc");
  await userEvent.type(screen.getByLabelText("Ubicación"), "Bogotá");
  await userEvent.selectOptions(screen.getByLabelText("Modalidad"), "HYBRID");
  await userEvent.click(screen.getByRole("button", { name: "Publicar posición" }));
  expect(await screen.findByText("Aún no hay aplicantes.")).toBeTruthy();
  expect(screen.getByTestId("url").textContent).toBe("/company/positions/7/applicants");
  expect(fetchSpy()).toContain("POST /api/positions");
});

test("nueva posición: un candidato ve 403 y no el formulario", async () => {
  mockApi({ "GET /api/me": { status: 200, body: ana } });
  renderAt("/company/positions/new");
  expect((await screen.findByRole("alert")).textContent).toMatch(/403/);
  expect(screen.queryByLabelText("Título")).toBeNull();
});

test("la empresa dueña cierra su posición desde el detalle", async () => {
  let status = "OPEN";
  const fetchSpy = mockApi({
    "GET /api/me": { status: 200, body: acme },
    "GET /api/positions/7": () => ({ status: 200, body: pos(status) }),
    "PATCH /api/positions/7": () => ((status = "CLOSED"), { status: 200, body: pos(status) }),
  });
  renderAt("/positions/7");
  expect(await screen.findByRole("link", { name: "Ver aplicantes" })).toBeTruthy();
  await userEvent.click(screen.getByRole("button", { name: "Cerrar posición" }));
  expect(await screen.findByText("Posición cerrada")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cerrar posición" })).toBeNull();
  expect(fetchSpy()).toContain("PATCH /api/positions/7");
});

test("candidatos, otras empresas y visitantes no ven acciones de dueña", async () => {
  for (const me of [ana, otra, null]) {
    mockApi({
      "GET /api/me": me ? { status: 200, body: me } : { status: 401, body: { error: "x" } },
      "GET /api/positions/7": { status: 200, body: pos() },
    });
    renderAt("/positions/7");
    await screen.findByRole("heading", { name: "Dev React" });
    expect(screen.queryByRole("button", { name: "Cerrar posición" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Ver aplicantes" })).toBeNull();
    cleanup();
  }
});

test("aplicantes: lista nombre, correo y mensaje; una empresa ajena ve el error del servidor", async () => {
  mockApi({
    "GET /api/me": { status: 200, body: acme },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/positions/7/applications": {
      status: 200,
      body: [{ id: 1, message: "Me encantaría unirme.", createdAt: "2026-01-02", candidate: { id: 1, name: "Ana Candidata", email: "a@x.com" } }],
    },
  });
  renderAt("/company/positions/7/applicants");
  expect(await screen.findByText("Ana Candidata")).toBeTruthy();
  expect(screen.getByRole("link", { name: "a@x.com" }).getAttribute("href")).toBe("mailto:a@x.com");
  expect(screen.getByText("Me encantaría unirme.")).toBeTruthy();
  expect(await screen.findByRole("heading", { name: "Aplicantes: Dev React" })).toBeTruthy();
  cleanup();
  mockApi({
    "GET /api/me": { status: 200, body: otra },
    "GET /api/positions/7": { status: 200, body: pos() },
    "GET /api/positions/7/applications": { status: 403, body: { error: "Prohibido" } },
  });
  renderAt("/company/positions/7/applicants");
  expect((await screen.findByRole("alert")).textContent).toBe("Prohibido");
});
