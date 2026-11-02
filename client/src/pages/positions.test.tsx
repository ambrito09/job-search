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

const pos = (id: number, title: string) => ({
  id, title, description: "Descripción larga", location: "Bogotá", mode: "REMOTE", status: "OPEN",
  createdAt: "2026-01-01", company: { id: 1, name: "Acme" },
});
const page = (items: unknown[], extra = {}) => ({ items, total: items.length, limit: 10, offset: 0, ...extra });

// /me da 401 (sin sesión); el resto lo decide `respond`, que recibe la URL pedida a la API.
function mockApi(respond: (url: string) => { status: number; body: unknown }) {
  const fetchMock = vi.fn(async (url: string) => {
    const r = url === "/api/me" ? { status: 401, body: { error: "No autenticado" } } : respond(url);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return (prefix: string) => fetchMock.mock.calls.map(([u]) => u).filter((u) => u.startsWith(prefix));
}

const Probe = () => {
  const { pathname, search } = useLocation();
  return (
    <>
      <span data-testid="url">{pathname + search}</span>
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
const url = () => screen.getByTestId("url").textContent;

test("la URL con filtros se envía tal cual a la API y rellena el formulario", async () => {
  const calls = mockApi(() => ({ status: 200, body: page([pos(1, "Dev React")]) }));
  renderAt("/positions?q=react&location=Bogot%C3%A1&mode=REMOTE&limit=5&offset=10");
  expect(await screen.findByText("Dev React")).toBeTruthy();
  expect(calls("/api/positions?")).toEqual(["/api/positions?q=react&location=Bogot%C3%A1&mode=REMOTE&limit=5&offset=10"]);
  expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("react");
  expect((screen.getByLabelText("Modalidad") as HTMLSelectElement).value).toBe("REMOTE");
});

test("filtrar actualiza la URL, omite vacíos y reinicia el offset", async () => {
  const calls = mockApi(() => ({ status: 200, body: page([pos(1, "Dev")]) }));
  renderAt("/positions?offset=10&limit=5");
  await screen.findByText("Dev");
  await userEvent.type(screen.getByLabelText("Buscar"), "node");
  await userEvent.selectOptions(screen.getByLabelText("Modalidad"), "HYBRID");
  await userEvent.click(screen.getByRole("button", { name: "Filtrar" }));
  expect(url()).toBe("/positions?q=node&mode=HYBRID&limit=5");
  await screen.findByText("Dev");
  expect(calls("/api/positions?").at(-1)).toBe("/api/positions?q=node&mode=HYBRID&limit=5");
});

test("paginación con Siguiente y Anterior mueve el offset en la URL", async () => {
  mockApi((u) => {
    const offset = Number(new URL(u, "http://x").searchParams.get("offset") ?? 0);
    return { status: 200, body: page([pos(offset + 1, `Pos ${offset + 1}`)], { total: 3, limit: 1, offset }) };
  });
  renderAt("/positions?limit=1");
  expect(await screen.findByText("1–1 de 3")).toBeTruthy();
  expect((screen.getByRole("button", { name: "Anterior" }) as HTMLButtonElement).disabled).toBe(true);
  await userEvent.click(screen.getByRole("button", { name: "Siguiente" }));
  expect(await screen.findByText("2–2 de 3")).toBeTruthy();
  expect(url()).toBe("/positions?limit=1&offset=1");
  await userEvent.click(screen.getByRole("button", { name: "Anterior" }));
  expect(await screen.findByText("1–1 de 3")).toBeTruthy();
  expect(url()).toBe("/positions?limit=1");
});

test("estados de carga, vacío y error", async () => {
  mockApi(() => ({ status: 200, body: page([]) }));
  renderAt("/positions");
  expect(screen.getByRole("status").textContent).toMatch(/Cargando/);
  expect(await screen.findByText(/No hay posiciones/)).toBeTruthy();
  cleanup();
  mockApi(() => ({ status: 400, body: { error: "Filtros inválidos" } }));
  renderAt("/positions?mode=XX");
  expect((await screen.findByRole("alert")).textContent).toMatch(/Filtros inválidos/);
  expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
});

test("detalle: muestra la posición, avisa si está cerrada y maneja el 404", async () => {
  mockApi((u) =>
    u === "/api/positions/7"
      ? { status: 200, body: { ...pos(7, "Dev cerrada"), status: "CLOSED" } }
      : { status: 404, body: { error: "No encontrado" } },
  );
  renderAt("/positions/7");
  expect(await screen.findByRole("heading", { name: "Dev cerrada" })).toBeTruthy();
  expect(screen.getByText("Posición cerrada")).toBeTruthy();
  expect(screen.getByText(/Acme · Bogotá · Remoto/)).toBeTruthy();
  cleanup();
  renderAt("/positions/99");
  expect((await screen.findByRole("alert")).textContent).toBe("No encontrado");
});

test("volver desde el detalle restaura los filtros y la página de la lista; un enlace directo vuelve a la lista sin filtros", async () => {
  mockApi((u) => (u.startsWith("/api/positions/") ? { status: 200, body: pos(1, "Dev React") } : { status: 200, body: page([pos(1, "Dev React")]) }));
  renderAt("/positions?q=react&mode=REMOTE&limit=5&offset=10");
  await userEvent.click(await screen.findByText("Dev React"));
  await userEvent.click(await screen.findByRole("link", { name: /Volver/ }));
  expect(url()).toBe("/positions?q=react&mode=REMOTE&limit=5&offset=10");
  expect((await screen.findByLabelText("Buscar") as HTMLInputElement).value).toBe("react");
  cleanup();
  renderAt("/positions/1");
  await userEvent.click(await screen.findByRole("link", { name: /Volver/ }));
  expect(url()).toBe("/positions");
});
