import { expect, test, type Page } from "@playwright/test";

// Usuarios y posición con sufijo único: el test se puede repetir contra la misma base.
const id = Date.now().toString(36);
const password = "password123";
const empresa = { name: `Empresa E2E ${id}`, email: `empresa-${id}@e2e.test` };
const candidato = { name: `Candidata E2E ${id}`, email: `candidata-${id}@e2e.test` };
const titulo = `Ingeniero E2E ${id}`;
const mensaje = `Hola desde el E2E ${id}`;

async function registrar(page: Page, rol: "COMPANY" | "CANDIDATE", u: { name: string; email: string }) {
  await page.goto("/register");
  await page.getByLabel("Soy").selectOption(rol);
  await page.getByLabel("Nombre").fill(u.name);
  await page.getByLabel("Correo").fill(u.email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Registrarme" }).click();
  await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
}

async function salir(page: Page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
}

test("empresa publica, candidata busca y aplica, y la empresa ve a la aplicante", async ({ page }) => {
  // 1. Registro de empresa y nueva posición
  await registrar(page, "COMPANY", empresa);
  await page.getByRole("link", { name: "Nueva posición" }).click();
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Descripción").fill("Posición creada por la prueba de extremo a extremo.");
  await page.getByLabel("Ubicación").fill("Quito");
  await page.getByLabel("Modalidad").selectOption("HYBRID");
  await page.getByRole("button", { name: "Publicar posición" }).click();
  await expect(page.getByRole("heading", { name: `Aplicantes: ${titulo}` })).toBeVisible();
  await expect(page.getByText("Aún no hay aplicantes.")).toBeVisible();
  await salir(page);

  // 2. Registro de candidata, búsqueda desde la landing y aplicación
  await registrar(page, "CANDIDATE", candidato);
  await page.goto("/");
  await page.getByLabel("Buscar posiciones").fill(titulo);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/positions\?q=/);
  await page.getByRole("link", { name: new RegExp(titulo) }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await page.getByLabel("Mensaje (opcional)").fill(mensaje);
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.getByText("Ya aplicaste a esta posición")).toBeVisible();
  await page.goto("/me/applications");
  await expect(page.getByText(titulo)).toBeVisible();
  await salir(page);

  // 3. La empresa inicia sesión y ve a la aplicante
  await page.goto("/login");
  await page.getByLabel("Correo").fill(empresa.email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("link", { name: "Mis posiciones" }).click();
  await page.getByRole("link", { name: "1 aplicante" }).click();
  await expect(page.getByText(candidato.name)).toBeVisible();
  await expect(page.getByText(candidato.email)).toBeVisible();
  await expect(page.getByText(mensaje)).toBeVisible();
});
