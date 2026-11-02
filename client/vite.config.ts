import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // En desarrollo la API corre en el 3000; en producción Express sirve cliente y API en el mismo origen.
  server: { proxy: { "/api": "http://localhost:3000" } },
});
