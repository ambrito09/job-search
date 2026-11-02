# Frontend — statement of intent

- **Base:** Vite + React + TypeScript, compilado a archivos estáticos que sirve Express.
- **Rutas:** React Router.
- **Datos del servidor:** TanStack Query.
- **Formularios:** React Hook Form + Zod.
- **Estilo y componentes:** Tailwind CSS + shadcn/ui.
- **Sesión:** JWT en cookie httpOnly con `SameSite`, emitido por el backend. El frontend no guarda ni adjunta el token; usa un endpoint `/me` para saber quién está logueado.
- **Pruebas:** Vitest + React Testing Library (componentes y formularios) y un test de Playwright que recorre el flujo completo (registro, publicar, aplicar).
- **Pantallas mínimas:**
  - **Landing:** Buscador (lleva a la lista de posiciones filtrada) y datos de la empresa ficticia dueña del sitio (contenido estático en el frontend: nombre, eslogan, descripción, cifras de ejemplo).
  - **Autenticación:** Login y registro (con rol).
  - **Posiciones:** Lista con filtro y detalle.
  - **Empresa:** Nueva posición y aplicantes por posición.
  - **Candidato:** Mis aplicaciones.
- **Fuera de alcance:** Estado global tipo Redux, SSR, internacionalización, modo oscuro, subida de archivos, CMS para el contenido de la empresa.
