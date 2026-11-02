# job-search

Job board full-stack: las empresas publican posiciones y los candidatos aplican.

## Stack

- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS, shadcn/ui
- **Backend:** Node, Express, TypeScript, Prisma, SQLite
- **Compartido:** esquemas Zod en `shared/`
- **Pruebas:** Vitest, Supertest, Playwright

## Estado

En desarrollo. Hecho: monorepo (npm workspaces), esquemas compartidos, modelo de datos con Prisma y datos de ejemplo. Pendiente: API, interfaz y empaquetado con Docker.

## Desarrollo

```bash
npm install
npm test
```
