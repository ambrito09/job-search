import { Prisma, type PrismaClient } from "@prisma/client";

// Un término de 3+ caracteres se busca en el índice FTS5 trigram (tabla PositionSearch, ver la migración *_position_search_fts):
// encuentra subcadenas como `contains`, pero sin recorrer la tabla. El tokenizador no indexa términos de 1 o 2 caracteres;
// esos caen a LIKE (recorre las posiciones abiertas). shortcut: si hiciera falta, exigir 3 caracteres mínimos en el filtro.
const MIN_INDEXED = 3;
const likeEscape = (s: string) => s.replace(/[\\%_]/g, "\\$&");

type Filters = { q?: string; location?: string; mode?: "ONSITE" | "HYBRID" | "REMOTE"; limit: number; offset: number };

// Ids de la página pedida (más recientes primero) y total de coincidencias, para posiciones abiertas con filtro de texto.
// Los textos de la tabla ya están en minúsculas Unicode (ver search.ts), así que se compara con el término en minúsculas.
export async function searchPositionIds(prisma: PrismaClient, { q, location, mode, limit, offset }: Filters) {
  const conds = [Prisma.sql`p.status = 'OPEN'`];
  if (mode) conds.push(Prisma.sql`p.mode = ${mode}`);

  const fts: string[] = [];
  for (const [column, value] of [["searchLc", q], ["locationLc", location]] as const) {
    if (!value) continue;
    const term = value.toLowerCase();
    // Entre comillas dobles FTS5 trata el texto como frase literal (sin operadores); una comilla se escapa duplicándola.
    if ([...term].length >= MIN_INDEXED) fts.push(`${column} : "${term.replaceAll('"', '""')}"`);
    else conds.push(Prisma.sql`p.${Prisma.raw(column)} LIKE ${`%${likeEscape(term)}%`} ESCAPE '\\'`);
  }
  if (fts.length) {
    conds.push(Prisma.sql`p.id IN (SELECT rowid FROM PositionSearch WHERE PositionSearch MATCH ${fts.join(" AND ")})`);
  }

  const where = Prisma.join(conds, " AND ");
  const [rows, counts] = await Promise.all([
    prisma.$queryRaw<{ id: number | bigint }[]>(
      Prisma.sql`SELECT p.id FROM Position p WHERE ${where} ORDER BY p.createdAt DESC, p.id DESC LIMIT ${limit} OFFSET ${offset}`,
    ),
    prisma.$queryRaw<{ total: number | bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM Position p WHERE ${where}`),
  ]);
  return { ids: rows.map((r) => Number(r.id)), total: Number(counts[0].total) };
}
