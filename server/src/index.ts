import { dataDir, databaseUrl } from "./env"; // primero: fija DATABASE_URL antes de cargar Prisma
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { createApp } from "./app";
import { resolveJwtSecret } from "./auth";
import { backfillSearchColumns } from "./search";
import { seedIfEmpty } from "./seed";

// Migraciones al arrancar con la CLI de Prisma (la misma versión que el cliente).
const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
execFileSync(process.execPath, [prismaCli, "migrate", "deploy", "--schema", path.resolve(import.meta.dirname, "../prisma/schema.prisma")], {
  env: process.env,
  stdio: "inherit",
});

const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
await seedIfEmpty(prisma);
await backfillSearchColumns(prisma);

const app = createApp({
  prisma,
  jwtSecret: resolveJwtSecret(path.join(dataDir, "jwt_secret")),
  secureCookies: process.env.COOKIE_SECURE === "true", // solo detrás de HTTPS
  corsOrigin: process.env.CORS_ORIGIN,
  staticDir: path.resolve(process.env.CLIENT_DIST ?? path.join(import.meta.dirname, "../../client/dist")),
});

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => console.log(`Servidor listo en http://localhost:${port}`));

// docker stop envía SIGTERM: cerrar limpio en vez de esperar al SIGKILL.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => server.close(() => prisma.$disconnect().finally(() => process.exit(0))));
}
