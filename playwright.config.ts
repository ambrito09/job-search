import { defineConfig } from "@playwright/test";

// El test E2E corre contra una app ya levantada (idealmente el contenedor Docker).
// Otra dirección: E2E_BASE_URL=http://host:puerto npm run test:e2e
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts", // sin .spec/.test para que Vitest no lo recoja
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  reporter: "list",
});
