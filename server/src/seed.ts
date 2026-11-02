import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { searchColumns } from "./search";

export const DEMO_PASSWORD = "password123";
export const DEMO_CANDIDATE_EMAIL = "candidato@demo.com";

const positions = [
  ["Desarrollador/a Frontend", "Construye interfaces con React y TypeScript.", "Bogotá", "HYBRID"],
  ["Ingeniero/a Backend", "APIs REST con Node, Express y bases de datos SQL.", "Medellín", "REMOTE"],
  ["Diseñador/a UX", "Investigación y prototipos para producto web.", "Madrid", "ONSITE"],
  ["Ingeniero/a DevOps", "Contenedores, CI/CD y observabilidad.", "Ciudad de México", "REMOTE"],
  ["Analista de Datos", "Dashboards y análisis con SQL y Python.", "Buenos Aires", "HYBRID"],
  ["QA Automation", "Pruebas end-to-end con Playwright.", "Lima", "REMOTE"],
  ["Product Manager", "Define y prioriza el roadmap de producto.", "Santiago", "ONSITE"],
  ["Desarrollador/a Full-stack", "React, Node y TypeScript de punta a punta.", "Bogotá", "REMOTE"],
] as const;

const companies = ["Acme Software", "Nube Labs", "Datos del Sur"];

// Solo siembra si no hay usuarios: es seguro llamarlo en cada arranque.
export async function seedIfEmpty(prisma: PrismaClient): Promise<boolean> {
  if ((await prisma.user.count()) > 0) return false;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const owners = [];
  for (const [i, name] of companies.entries()) {
    owners.push(
      await prisma.user.create({
        data: { email: `empresa${i + 1}@demo.com`, passwordHash, role: "COMPANY", name },
      }),
    );
  }
  const candidate = await prisma.user.create({
    data: { email: DEMO_CANDIDATE_EMAIL, passwordHash, role: "CANDIDATE", name: "Ana Candidata" },
  });

  const created = [];
  for (const [i, [title, description, location, mode]] of positions.entries()) {
    created.push(
      await prisma.position.create({
        // La última queda cerrada para mostrar ese estado.
        data: {
          title, description, location, mode, ...searchColumns({ title, description, location }),
          status: i === positions.length - 1 ? "CLOSED" : "OPEN",
          companyId: owners[i % owners.length].id,
        },
      }),
    );
  }
  await prisma.application.create({
    data: { positionId: created[0].id, candidateId: candidate.id, message: "Me encantaría unirme." },
  });
  return true;
}
