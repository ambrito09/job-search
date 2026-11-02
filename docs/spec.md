# Job Board — Spec

Fuentes: `docs/intent/job-board.md`, `docs/intent/frontend.md`, `docs/intent/backend.md`.

## 1. Objetivo

App full-stack de portafolio: empresas publican posiciones y candidatos aplican. Se empaqueta en una sola imagen Docker; con `docker run -p 3000:3000` se usa desde el navegador. Sirve para demostrar el stack en LinkedIn.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Monorepo | npm workspaces: `client/`, `server/`, `shared/` |
| Frontend | Vite, React, TypeScript, React Router, TanStack Query, React Hook Form, Tailwind CSS, shadcn/ui |
| Backend | Node, Express, TypeScript |
| Datos | Prisma + SQLite |
| Validación | Zod (en `shared/`, usado por ambos lados) |
| Auth | `bcryptjs`, `jsonwebtoken`, cookie httpOnly |
| Pruebas | Vitest (todo el monorepo), React Testing Library, Supertest, Playwright (1 test E2E) |
| Despliegue | Una imagen Docker multi-etapa |

## 3. Estructura

```
/
├─ client/            # Vite + React
├─ server/            # Express + Prisma
│  └─ prisma/         # schema.prisma, migraciones, seed
├─ shared/            # esquemas Zod y tipos
├─ e2e/               # test Playwright
├─ Dockerfile
└─ package.json       # workspaces
```

Express sirve la API bajo `/api` y los estáticos de `client/dist` en el resto de rutas (con fallback a `index.html` para React Router).

## 4. Modelo de datos

- **User**: `id`, `email` (único), `passwordHash`, `role` (`COMPANY` | `CANDIDATE`), `name` (en empresas, el nombre de la empresa), `createdAt`.
- **Position**: `id`, `title`, `description`, `location`, `mode` (`ONSITE` | `HYBRID` | `REMOTE`), `status` (`OPEN` | `CLOSED`), `companyId` → User, `createdAt`.
- **Application**: `id`, `positionId` → Position, `candidateId` → User, `message` (opcional), `createdAt`. Único `(positionId, candidateId)`.

Índices en `Position.status`, `Position.companyId` y las claves foráneas de `Application`.

## 5. API

Todas bajo `/api`. Errores en JSON `{ error: string }` con el código HTTP adecuado (400 validación, 401 sin sesión, 403 rol incorrecto, 404, 409 duplicado).

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `POST /auth/register` | público | Crea usuario con rol. Devuelve el usuario y pone la cookie. |
| `POST /auth/login` | público | Valida credenciales y pone la cookie. |
| `POST /auth/logout` | público | Borra la cookie. |
| `GET /me` | login | Usuario actual (401 si no hay sesión). |
| `GET /positions` | público | Lista de posiciones abiertas. Filtros: `q` (título y descripción), `location`, `mode`. |
| `GET /positions/:id` | público | Detalle de una posición. |
| `POST /positions` | empresa | Crea posición. |
| `PATCH /positions/:id` | empresa dueña | Edita campos o cierra (`status: CLOSED`). |
| `POST /positions/:id/applications` | candidato | Aplica. 409 si ya aplicó, 409 si está cerrada. |
| `GET /positions/:id/applications` | empresa dueña | Aplicantes de la posición. |
| `GET /me/applications` | candidato | Sus aplicaciones, con la posición. |

Reglas: la empresa solo opera sobre sus posiciones (403 si no es la dueña). Contraseña mínima de 8 caracteres.

## 6. Autenticación

- Hash con `bcryptjs`.
- JWT con `{ sub, role }`, expiración de 8 horas, firmado con `JWT_SECRET` (variable de entorno).
- Cookie `httpOnly`, `SameSite=Lax`, `Secure` solo en producción detrás de HTTPS (configurable), `path=/`.
- Sin refresh tokens. Al expirar, el usuario vuelve a hacer login.
- `JWT_SECRET`: si la variable de entorno existe, se usa. Si no, el servidor genera un secreto aleatorio en el primer arranque y lo guarda en `/data/jwt_secret`; los arranques siguientes lo reutilizan. Si se pierde el volumen, se genera otro y las sesiones previas dejan de ser válidas.

## 7. Frontend

Rutas:

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Landing: buscador y datos de la empresa ficticia (contenido estático) | público |
| `/positions` | Lista con filtros (`q`, `location`, `mode`) leídos de la URL | público |
| `/positions/:id` | Detalle; botón "Aplicar" (lleva a login si no hay sesión) | público |
| `/login`, `/register` | Autenticación; registro con rol | público |
| `/company/positions/new` | Nueva posición | empresa |
| `/company/positions/:id/applicants` | Aplicantes de una posición | empresa |
| `/me/applications` | Mis aplicaciones | candidato |

Notas:
- TanStack Query para todos los datos del servidor; `/me` define el estado de sesión.
- Formularios con React Hook Form y `zodResolver` con los esquemas de `shared/`.
- Rutas protegidas redirigen a `/login` (sin sesión) o muestran 403 (rol incorrecto).
- Estados de carga, error y vacío en cada lista.
- Accesibilidad básica: etiquetas en formularios, foco visible y navegación por teclado (shadcn/ui ya lo cubre en gran parte).

## 8. Datos de ejemplo (seed)

Se ejecuta en el primer arranque si la base está vacía:
- 3 empresas, con 2 o 3 posiciones abiertas cada una (mezcla de modalidades y ubicaciones) y 1 cerrada.
- 1 candidato de prueba con 1 aplicación.
- Credenciales de prueba documentadas en el README.

## 9. Docker

- Build multi-etapa: (1) instala dependencias y compila `shared` y `client`; (2) compila `server` y genera el cliente Prisma; (3) imagen final ligera con solo lo necesario.
- Al arrancar: `prisma migrate deploy`, seed si la base está vacía y luego el servidor.
- Base SQLite en `/data/app.db`; `/data` declarado como volumen.
- Puerto `3000`. Variables opcionales: `JWT_SECRET`, `DATABASE_URL` (por defecto `file:/data/app.db`), `NODE_ENV`.

## 10. Pruebas y criterios de aceptación

**Backend (Vitest + Supertest, SQLite temporal por ejecución):**
- Registro y login correctos e incorrectos; `/me` sin cookie da 401.
- `GET /positions` y `GET /positions/:id` funcionan sin sesión; los filtros funcionan.
- Un candidato no puede crear posiciones (403); una empresa no puede editar posiciones ajenas (403).
- Aplicar sin sesión da 401; aplicar dos veces da 409; aplicar a una posición cerrada da 409.

**Frontend (Vitest + React Testing Library):**
- Formularios de login, registro y nueva posición muestran los errores de validación.
- Una ruta protegida redirige a login sin sesión.

**E2E (Playwright, 1 test):** registro de empresa → publica posición → registro de candidato → busca y aplica → la empresa ve al aplicante.

**Aceptación final:**
1. `docker build` y `docker run -p 3000:3000 <imagen>` arrancan sin pasos adicionales.
2. Desde el navegador se completa el flujo de punta a punta.
3. Con `-v datos:/data`, los datos persisten al reiniciar.
4. `npm test` en la raíz ejecuta todas las pruebas Vitest y pasan.

## 11. Fuera de alcance

Subida de CV, correos, chat, despliegue en la nube, PostgreSQL, panel de administración, refresh tokens, recuperación de contraseña, verificación de correo, rate limiting, paginación avanzada, OpenAPI, tabla `Company` separada, estado global tipo Redux, SSR, i18n, modo oscuro, CMS.

## 12. Decisiones abiertas

- **Aspecto visual:** paleta y tipografía, a definir al construir el frontend (por defecto, el tema neutro de shadcn/ui).
- **Empresa ficticia:** "Brújula", eslogan "Encuentra tu rumbo profesional". Descripción y cifras de ejemplo se escriben al construir la landing.
