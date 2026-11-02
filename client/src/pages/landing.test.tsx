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

const Probe = () => {
  const { pathname, search } = useLocation();
  return (
    <>
      <span data-testid="url">{pathname + search}</span>
      {useRoutes(routes)}
    </>
  );
};

function setup() {
  const fetchMock = vi.fn(async (url: string) =>
    url === "/api/me"
      ? new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 })
      : new Response(JSON.stringify({ items: [], total: 0, limit: 10, offset: 0 }), { status: 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/"]}><Probe /></MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}
const url = () => screen.getByTestId("url").textContent;

test("la landing muestra el eslogan y las cifras de Brújula", async () => {
  setup();
  expect(await screen.findByRole("heading", { name: "Encuentra tu rumbo profesional" })).toBeTruthy();
  expect(screen.getByText("empresas aliadas")).toBeTruthy();
});

test("buscar desde la landing lleva a la lista filtrada y la pide a la API", async () => {
  const fetchMock = setup();
  await userEvent.type(await screen.findByLabelText("Buscar posiciones"), "react & node");
  await userEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(url()).toBe("/positions?q=react+%26+node"); // el & viaja codificado
  expect(await screen.findByText(/No hay posiciones/)).toBeTruthy();
  expect(fetchMock.mock.calls.map(([u]) => u)).toContain("/api/positions?q=react+%26+node");
  expect((screen.getByLabelText("Buscar") as HTMLInputElement).value).toBe("react & node");
});

test("buscar vacío lleva a la lista sin filtros", async () => {
  setup();
  await userEvent.click(await screen.findByRole("button", { name: "Buscar" }));
  expect(url()).toBe("/positions");
});
