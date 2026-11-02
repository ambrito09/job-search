import { PrismaClient } from "@prisma/client";
import { seedIfEmpty } from "./seed";

const prisma = new PrismaClient();
seedIfEmpty(prisma)
  .then((seeded) => console.log(seeded ? "Seed aplicado" : "La base ya tiene datos; no se siembra"))
  .finally(() => prisma.$disconnect());
