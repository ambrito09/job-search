# Job Board — Tareas

Orden de ejecución. Cada tarea deja el proyecto funcionando y verificable. Spec: `docs/spec.md`.

## Fase 0 — Esqueleto

**T1. Monorepo y TypeScript**
- Workspaces `client/`, `server/`, `shared/`, `.gitignore`, tsconfig base, scripts raíz (`dev`, `build`, `test`).
- Hecho cuando: `npm install` y `npm run build` pasan con paquetes vacíos.

**T2. Vitest en el monorepo**
- Configuración común y un test trivial por paquete.
- Hecho cuando: `npm test` en la raíz pasa.

## Fase 1 — Compartido y datos

**T3. Esquemas Zod en `shared/`**
- Registro, login, crear y editar posición, aplicar, filtros de búsqueda, más tipos exportados.
- Hecho cuando: tests unitarios de los esquemas (válidos e inválidos) pasan.

**T4. Prisma y SQLite**
- `schema.prisma` con User, Position, Application (único `(positionId, candidateId)`, índices), primera migración.
- Hecho cuando: `prisma migrate dev` crea la base y el cliente compila.

**T5. Seed**
- 3 empresas, posiciones abiertas y una cerrada, 1 candidato de prueba con 1 aplicación. Solo corre si la base está vacía.
- Hecho cuando: ejecutarlo dos veces no duplica datos.

## Fase 2 — Backend

**T6. Servidor Express base**
- App separada de `listen` (para Supertest), manejador de errores `{ error }`, middleware de validación con Zod, ruta `/api/health`.
- Hecho cuando: test de Supertest sobre `/api/health` y sobre un 400 de validación.

**T7. Autenticación**
- `JWT_SECRET` (variable de entorno o generado y guardado en `/data/jwt_secret`), `bcryptjs`, `jsonwebtoken`, cookie httpOnly, `register`, `login`, `logout`, `/me`, middlewares `requireAuth` y `requireRole`.
- Hecho cuando: tests de registro, login correcto e incorrecto, `/me` con y sin cookie, y reutilización del secreto entre arranques.

**T8. Posiciones**
- `GET /positions` (solo abiertas, filtros `q`, `location`, `mode`), `GET /positions/:id`, `POST`, `PATCH` (editar y cerrar, solo la empresa dueña).
- Hecho cuando: tests de acceso público, filtros, 403 de candidato y de empresa ajena.

**T9. Aplicaciones**
- `POST /positions/:id/applications`, `GET /positions/:id/applications`, `GET /me/applications`.
- Hecho cuando: tests de 401 sin sesión, 409 por duplicado, 409 en posición cerrada, 403 para aplicantes de posición ajena.

## Fase 3 — Frontend

**T10. Base del cliente**
- Vite + React + TS, Tailwind, shadcn/ui, React Router, TanStack Query, cliente de API con `credentials: 'include'`, proxy de `/api` en desarrollo, layout con barra de navegación según sesión (`/me`).
- Hecho cuando: la app arranca y la barra refleja sesión iniciada o no.

**T11. Autenticación en el cliente**
- Pantallas de login y registro (con rol), logout, rutas protegidas por sesión y rol.
- Hecho cuando: tests de RTL de errores de validación y de redirección a login.

**T12. Posiciones públicas**
- Lista con filtros en la URL, detalle, estados de carga, error y vacío.
- Hecho cuando: se navega y filtra sin sesión contra el backend real.

**T13. Landing**
- Buscador que lleva a `/positions?q=...` y datos estáticos de la empresa ficticia: **Brújula**, eslogan "Encuentra tu rumbo profesional".
- Hecho cuando: buscar desde la landing muestra la lista filtrada.

**T14. Flujo de empresa**
- Formulario de nueva posición, cerrar posición, pantalla de aplicantes.
- Hecho cuando: test de RTL del formulario y flujo manual completo.

**T15. Flujo de candidato**
- Botón "Aplicar" (a login si no hay sesión), mensaje opcional, pantalla "Mis aplicaciones".
- Hecho cuando: aplicar y verlo listado; el duplicado muestra un error claro.

## Fase 4 — Empaquetado y verificación

**T16. Express sirve el build del cliente**
- Estáticos de `client/dist` y fallback a `index.html` fuera de `/api`.
- Hecho cuando: `npm run build && npm start` sirve todo desde el puerto 3000.

**T17. Dockerfile**
- Multi-etapa, `prisma migrate deploy` + seed + servidor al arrancar, volumen `/data`, `.dockerignore`.
- Hecho cuando: `docker run -p 3000:3000 <imagen>` sirve la app sin más pasos, y con `-v datos:/data` los datos persisten al reiniciar.

**T18. Test E2E con Playwright**
- Registro de empresa → publica → registro de candidato → busca y aplica → la empresa ve al aplicante.
- Hecho cuando: pasa contra la app levantada (idealmente contra el contenedor).

**T19. README**
- Qué es, stack, `docker run`, credenciales de prueba, cómo correr pruebas y desarrollo.
- Hecho cuando: alguien ajeno puede levantarlo solo con el README.

## Pendiente por decidir

- Aspecto visual: por defecto, el tema neutro de shadcn/ui.
