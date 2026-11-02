// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useRoutes, type RouteObject } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { routes } from "@/App";
import { RequireAuth } from "@/components/RequireAuth";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Reply = { status: number; body?: unknown };
// Simula la API: handlers por "MÉTODO /ruta"; /me sin sesión devuelve 401 por defecto.
function mockApi(handlers: Record<string, Reply>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const r = handlers[`${init?.method ?? "GET"} ${url}`] ?? { status: 401, body: { error: "No autenticado" } };
    return new Response(r.body === undefined ? null : JSON.stringify(r.body), { status: r.status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// MemoryRouter y no createMemoryRouter: el router de datos choca con AbortSignal en jsdom al navegar.
const Probe = ({ extra }: { extra: RouteObject[] }) => {
  const { pathname } = useLocation();
  return (
    <>
      <output data-testid="path">{pathname}</output>
      {useRoutes([...routes, ...extra])}
    </>
  );
};

function renderAt(path: string, extra: RouteObject[] = []) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Probe extra={extra} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
const pathname = () => screen.getByTestId("path").textContent;

const ana = { id: 1, email: "a@x.com", role: "CANDIDATE", name: "Ana" };

test("login vacío muestra errores de validación y no llama a la API", async () => {
  const fetchMock = mockApi({});
  renderAt("/login");
  await userEvent.click(await screen.findByRole("button", { name: "Entrar" }));
  expect(await screen.findByText("Correo inválido")).toBeTruthy();
  expect(screen.getByText("Obligatoria")).toBeTruthy();
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("login correcto guarda la sesión y vuelve al inicio", async () => {
  mockApi({ "POST /api/auth/login": { status: 200, body: ana } });
  renderAt("/login");
  await userEvent.type(await screen.findByLabelText("Correo"), "a@x.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByRole("button", { name: "Cerrar sesión" })).toBeTruthy();
  await waitFor(() => expect(pathname()).toBe("/"));
});

test("login incorrecto muestra el error del servidor", async () => {
  mockApi({ "POST /api/auth/login": { status: 401, body: { error: "Credenciales inválidas" } } });
  renderAt("/login");
  await userEvent.type(await screen.findByLabelText("Correo"), "a@x.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByText("Credenciales inválidas")).toBeTruthy();
});

test("registro valida nombre, correo y contraseña corta", async () => {
  const fetchMock = mockApi({});
  renderAt("/register");
  await userEvent.type(await screen.findByLabelText("Contraseña"), "corta");
  await userEvent.click(screen.getByRole("button", { name: "Registrarme" }));
  expect(await screen.findByText("Mínimo 8 caracteres")).toBeTruthy();
  expect(screen.getByText("Obligatorio")).toBeTruthy(); // nombre
  expect(screen.getByText("Correo inválido")).toBeTruthy();
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});

test("registro de empresa envía el rol elegido", async () => {
  const fetchMock = mockApi({ "POST /api/auth/register": { status: 201, body: { ...ana, role: "COMPANY", name: "Acme" } } });
  renderAt("/register");
  await userEvent.selectOptions(await screen.findByLabelText("Soy"), "COMPANY");
  await userEvent.type(screen.getByLabelText("Nombre"), "Acme");
  await userEvent.type(screen.getByLabelText("Correo"), "e@x.com");
  await userEvent.type(screen.getByLabelText("Contraseña"), "password123");
  await userEvent.click(screen.getByRole("button", { name: "Registrarme" }));
  expect(await screen.findByRole("link", { name: "Nueva posición" })).toBeTruthy();
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
  expect(JSON.parse(post[1]!.body as string)).toEqual({ role: "COMPANY", name: "Acme", email: "e@x.com", password: "password123" });
});

const secret: RouteObject = { path: "/secreto", element: <RequireAuth role="COMPANY"><p>zona empresa</p></RequireAuth> };

test("ruta protegida sin sesión redirige a login", async () => {
  mockApi({});
  renderAt("/secreto", [secret]);
  expect(await screen.findByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
  expect(pathname()).toBe("/login");
});

test("ruta protegida con rol incorrecto muestra 403", async () => {
  mockApi({ "GET /api/me": { status: 200, body: ana } });
  renderAt("/secreto", [secret]);
  expect((await screen.findByRole("alert")).textContent).toMatch(/403/);
  expect(screen.queryByText("zona empresa")).toBeNull();
});

test("ruta protegida con el rol correcto muestra el contenido", async () => {
  mockApi({ "GET /api/me": { status: 200, body: { ...ana, role: "COMPANY" } } });
  renderAt("/secreto", [secret]);
  expect(await screen.findByText("zona empresa")).toBeTruthy();
});
