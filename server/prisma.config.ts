import { defineConfig } from "prisma/config";

// Con prisma.config.ts Prisma deja de leer server/.env por sí mismo: se carga aquí (solo para desarrollo; en producción DATABASE_URL viene de env.ts).
try {
  process.loadEnvFile(".env");
} catch {
  /* sin .env: se usa el entorno */
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  // PositionSearch es una tabla virtual FTS5 creada por una migración a mano (ver migrations/*_position_search_fts):
  // Prisma no la modela, así que se declara externa para que `migrate dev` no intente borrarla.
  experimental: { externalTables: true },
  tables: {
    external: ["PositionSearch", "PositionSearch_config", "PositionSearch_data", "PositionSearch_docsize", "PositionSearch_idx"],
  },
});
