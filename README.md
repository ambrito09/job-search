# Brújula · Bolsa de empleo

Job board full-stack de portafolio: las empresas publican posiciones y los candidatos aplican. La empresa ficticia es **Brújula** ("Encuentra tu rumbo profesional").

Se empaqueta en **una sola imagen Docker**: un `docker run` y se usa desde el navegador.

## Probarlo (Docker)

Necesitas [Docker](https://docs.docker.com/get-docker/) y este repositorio clonado.

```bash
docker build -t brujula .
docker run -p 3000:3000 brujula
```

Abre <http://localhost:3000>. Al arrancar, el contenedor aplica las migraciones y carga datos de ejemplo.

Para conservar los datos entre ejecuciones, monta un volumen en `/data`:

```bash
docker run -p 3000:3000 -v brujula-data:/data brujula
```

### Usuarios de ejemplo

Todos con la contraseña `password123`:

| Rol | Correo |
|---|---|
| Candidato | `candidato@demo.com` |
| Empresa | `empresa1@demo.com`, `empresa2@demo.com`, `empresa3@demo.com` |

También puedes registrar cuentas nuevas desde la propia aplicación.

> Estas credenciales son públicas y se crean en cada base nueva. No expongas el contenedor a internet tal cual.

### Variables de entorno (opcionales)

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto del servidor |
| `JWT_SECRET` | generado y guardado en `/data/jwt_secret` | Secreto de las sesiones |
| `DATABASE_URL` | `file:/data/app.db` | Base SQLite |
| `COOKIE_SECURE` | `false` | `true` si lo sirves detrás de HTTPS |
| `CORS_ORIGIN` | (vacío) | Solo si el cliente se sirve desde otro origen |

## Qué incluye

- **Candidatos:** buscar posiciones (texto, ubicación, modalidad, paginación; todo en la URL, se puede compartir), ver el detalle, aplicar con un mensaje opcional y ver sus aplicaciones.
- **Empresas:** publicar posiciones, cerrarlas y reabrirlas, ver sus posiciones y los aplicantes de cada una.
- **Público:** la lista y el detalle de posiciones se ven sin iniciar sesión.

## Stack

- **Frontend:** React, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Tailwind CSS, shadcn/ui, iconos de [Tabler](https://tabler.io/icons)
- **Backend:** Node, Express, TypeScript, Prisma, SQLite
- **Compartido:** esquemas Zod en `shared/`, usados por cliente y servidor
- **Sesión:** JWT en cookie `httpOnly` (`SameSite=Lax`, 8 h)
- **Pruebas:** Vitest, React Testing Library, Supertest y un test E2E con Playwright

Estructura (monorepo con npm workspaces):

```
client/   interfaz (Vite + React)
server/   API Express, Prisma (esquema y migraciones) y datos de ejemplo
shared/   esquemas Zod y tipos
e2e/      test de extremo a extremo
```

## Desarrollo

Requiere Node 24 o superior.

```bash
npm install
npm test            # pruebas unitarias y de API (Vitest)
```

Para trabajar con recarga en caliente, en dos terminales:

```bash
npm start                      # API en :3000 (datos en ./data)
npm run dev -w @app/client     # interfaz en :5173, con proxy de /api al :3000
```

Abre <http://localhost:5173>. Para servir todo desde el puerto 3000 sin Docker: `npm run build && npm start`.

### Test E2E

Corre contra la aplicación ya levantada (lo ideal es el contenedor):

```bash
npx playwright install chromium    # solo la primera vez
docker run -d -p 3000:3000 brujula
npm run test:e2e
```

Con `E2E_BASE_URL=http://host:puerto` apunta a otra dirección. Cada ejecución crea usuarios y una posición nuevos, así que conviene usar un contenedor desechable.

## API

Todas las rutas cuelgan de `/api`; los errores son `{ "error": "mensaje" }`.

| Ruta | Acceso | Descripción |
|---|---|---|
| `POST /auth/register`, `/auth/login`, `/auth/logout` | público | Sesión por cookie |
| `GET /me` | sesión | Usuario actual |
| `GET /positions` | público | Abiertas; filtros `q`, `location`, `mode`, `limit`, `offset` |
| `GET /positions/:id` | público | Detalle |
| `POST /positions` | empresa | Crear |
| `PATCH /positions/:id` | empresa dueña | Editar, cerrar o reabrir |
| `GET /me/positions` | empresa | Sus posiciones, con número de aplicantes |
| `POST /positions/:id/applications` | candidato | Aplicar (409 si ya aplicó o está cerrada) |
| `GET /positions/:id/applications` | empresa dueña | Aplicantes |
| `GET /me/applications` | candidato | Sus aplicaciones |
| `GET /health` | público | Estado |

## Límites conocidos

- Sin recuperación de contraseña, verificación de correo ni refresh tokens.
- El rate limit (20 intentos de registro/login por IP cada 15 min) es en memoria y por proceso.
- Pensado para una sola instancia: SQLite y el contador de rate limit no se comparten entre réplicas.
- `GET /me/positions` devuelve como máximo las 20 posiciones más recientes de la empresa.
