import type { PrismaClient } from "@prisma/client";

// Columnas de búsqueda en minúsculas Unicode. Hay que pasarlas en todo create/update de Position.
export const searchColumns = (p: { title: string; description: string; location: string }) => ({
  searchLc: `${p.title}\n${p.description}`.toLowerCase(),
  locationLc: p.location.toLowerCase(),
});

// Rellena las columnas de filas anteriores a la migración (vacías). Seguro de repetir.
export async function backfillSearchColumns(prisma: PrismaClient): Promise<number> {
  const stale = await prisma.position.findMany({ where: { searchLc: "" } });
  for (const p of stale) await prisma.position.update({ where: { id: p.id }, data: searchColumns(p) });
  return stale.length;
}
