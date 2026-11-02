import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { positionCreateSchema, positionFiltersSchema, positionUpdateSchema } from "@app/shared";
import { requireAuth, requireRole } from "./auth";
import { searchColumns } from "./search";
import { validate } from "./validate";

const include = { company: { select: { id: true, name: true } } };
const omit = { searchLc: true, locationLc: true }; // columnas internas de búsqueda

export function positionsRouter(prisma: PrismaClient, secret: string) {
  const r = Router();
  const auth = requireAuth(secret);
  const company = requireRole("COMPANY");

  r.get("/positions", async (req, res) => {
    const f = positionFiltersSchema.safeParse(req.query);
    if (!f.success) {
      res.status(400).json({ error: "Filtros inválidos" });
      return;
    }
    const { q, location, mode, limit, offset } = f.data;
    const where = {
      status: "OPEN" as const,
      ...(mode && { mode }),
      ...(location && { locationLc: { contains: location.toLowerCase() } }),
      ...(q && { searchLc: { contains: q.toLowerCase() } }),
    };
    // LIMIT/OFFSET en SQLite: solo se leen las filas de la página.
    const [items, total] = await Promise.all([
      prisma.position.findMany({
        where, include, omit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.position.count({ where }),
    ]);
    res.json({ items, total, limit, offset });
  });

  r.get("/positions/:id", async (req, res) => {
    const position = await prisma.position.findUnique({ where: { id: Number(req.params.id) || 0 }, include, omit });
    position ? res.json(position) : void res.status(404).json({ error: "No encontrado" });
  });

  // Todas las posiciones de la empresa (abiertas y cerradas) con su número de aplicantes.
  r.get("/me/positions", auth, company, async (req, res) => {
    res.json(
      await prisma.position.findMany({
        where: { companyId: req.user!.id },
        include: { ...include, _count: { select: { applications: true } } },
        omit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 20, // shortcut: sin paginación, tope fijo de 20 (las más recientes); paginar si una empresa publica más.
      }),
    );
  });

  r.post("/positions", auth, company, validate(positionCreateSchema), async (req, res) => {
    res.status(201).json(await prisma.position.create({ data: { ...req.body, ...searchColumns(req.body), companyId: req.user!.id }, include, omit }));
  });

  r.patch("/positions/:id", auth, company, validate(positionUpdateSchema), async (req, res) => {
    const id = Number(req.params.id) || 0;
    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (existing.companyId !== req.user!.id) {
      res.status(403).json({ error: "Prohibido" });
      return;
    }
    res.json(await prisma.position.update({ where: { id }, data: { ...req.body, ...searchColumns({ ...existing, ...req.body }) }, include, omit }));
  });

  return r;
}
