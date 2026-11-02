import { PrismaClient } from "@prisma/client";
import { seedIfEmpty } from "./seed";
import { backfillSearchColumns } from "./search";

const prisma = new PrismaClient();
seedIfEmpty(prisma)
  .then(async (seeded) => {
    console.log(seeded ? "Seed aplicado" : "La base ya tiene datos; no se siembra");
    console.log(`Columnas de búsqueda actualizadas en ${await backfillSearchColumns(prisma)} posiciones`);
  })
  .finally(() => prisma.$disconnect());
