import path from "node:path";
import { defineConfig } from "vitest/config";

// El alias "@" de los tests del cliente debe coincidir con client/vite.config.ts.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "client/src") } },
  esbuild: { jsx: "automatic" },
  test: { setupFiles: ["./client/src/test-setup.ts"] },
});
