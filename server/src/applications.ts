import { Router } from "express";
import { Prisma, type PrismaClient } from "@prisma/client";
import { applySchema } from "@app/shared";
import { requireAuth, requireRole } from "./auth";
import { validate } from "./validate";

export function applicationsRouter(prisma: PrismaClient, secret: string) {
  const r = Router();
  const auth = requireAuth(secret);

  r.post("/positions/:id/applications", auth, requireRole("CANDIDATE"), validate(applySchema), async (req, res) => {
    const position = await prisma.position.findUnique({ where: { id: Number(req.params.id) || 0 } });
    if (!position) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (position.status === "CLOSED") {
      res.status(409).json({ error: "La posición está cerrada" });
      return;
    }
    try {
      const application = await prisma.application.create({
        data: { positionId: position.id, candidateId: req.user!.id, message: req.body.message },
      });
      res.status(201).json(application);
    } catch (e) {
      // El índice único (positionId, candidateId) también cubre dos peticiones simultáneas.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        res.status(409).json({ error: "Ya aplicaste a esta posición" });
        return;
      }
      throw e;
    }
  });

  r.get("/positions/:id/applications", auth, requireRole("COMPANY"), async (req, res) => {
    const position = await prisma.position.findUnique({ where: { id: Number(req.params.id) || 0 } });
    if (!position) {
      res.status(404).json({ error: "No encontrado" });
      return;
    }
    if (position.companyId !== req.user!.id) {
      res.status(403).json({ error: "Prohibido" });
      return;
    }
    res.json(
      await prisma.application.findMany({
        where: { positionId: position.id },
        include: { candidate: { select: { id: true, name: true, email: true } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  r.get("/me/applications", auth, requireRole("CANDIDATE"), async (req, res) => {
    res.json(
      await prisma.application.findMany({
        where: { candidateId: req.user!.id },
        include: { position: { omit: { searchLc: true, locationLc: true }, include: { company: { select: { id: true, name: true } } } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  return r;
}
