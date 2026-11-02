import { mkdirSync } from "node:fs";
import path from "node:path";

// Debe importarse ANTES que @prisma/client: al importarse, el cliente carga server/.env y rellenaría
// DATABASE_URL con la base de desarrollo (dev.db) antes de que podamos elegir la de DATA_DIR.
// Datos (SQLite y secreto JWT) en DATA_DIR; en Docker es el volumen /data.
export const dataDir = path.resolve(process.env.DATA_DIR ?? "data");
mkdirSync(dataDir, { recursive: true });
export const databaseUrl = process.env.DATABASE_URL ?? `file:${path.join(dataDir, "app.db").replaceAll("\\", "/")}`;
process.env.DATABASE_URL = databaseUrl;
