# Backend — statement of intent

- **Base:** Node + Express + TypeScript, que sirve la API REST y el build estático de React.
- **Monorepo:** Workspaces de npm con `client/`, `server/` y `shared/`.
- **Datos:** Prisma sobre SQLite. Las migraciones se aplican solas al arrancar el contenedor.
- **Modelo:** `User` (rol empresa o candidato, con el nombre de la empresa como campo), `Position` (abierta o cerrada) y `Application`. Un candidato solo puede aplicar una vez a cada posición.
- **Validación:** Esquemas Zod en `shared/`, usados por el frontend y el backend.
- **Autenticación:** `bcryptjs` para las contraseñas. JWT firmado con `jsonwebtoken`, con expiración corta y el secreto en una variable de entorno, en una cookie httpOnly con `SameSite`. Sin refresh tokens.
- **Acceso público (sin login):** Lista de posiciones con filtro y detalle. Esto permite que el buscador de la landing funcione sin cuenta.
- **Acceso solo con login:**
  - **Candidato:** Aplicar a una posición y ver sus aplicaciones. Si no está logueado, el botón "Aplicar" lo lleva a login.
  - **Empresa:** Crear, editar y cerrar sus propias posiciones, y ver los aplicantes de cada una.
- **Endpoints principales:** Registro, login, logout y `/me`, más los de posiciones y aplicaciones con el acceso anterior.
- **Datos en Docker:** Base SQLite en `/data` (montable como volumen con `-v`) y datos de ejemplo en el primer arranque: empresas, posiciones y un candidato de prueba.
- **Pruebas:** Vitest + Supertest sobre la API con una base SQLite temporal. Cubren registro y login, el acceso público frente al protegido, los permisos por rol y el flujo de aplicar.
- **Imagen Docker:** Una sola imagen con build multi-etapa. Con `docker run -p 3000:3000` se usa desde el navegador.
- **Fuera de alcance:** Refresh tokens, recuperación de contraseña, verificación de correo, rate limiting, paginación avanzada, documentación OpenAPI, tabla `Company` separada.
