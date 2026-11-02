# Job board — statement of intent

- **Resultado:** App full-stack en una sola imagen Docker. Con `docker run -p 3000:3000` se usa desde el navegador.
- **Usuarios:** Empresas (publican posiciones) y candidatos (aplican). El autor la muestra a reclutadores.
- **Por qué ahora:** Evidencia de habilidades para vincular en LinkedIn.
- **Stack:** React + TypeScript, Node + Express + TypeScript, SQLite. Express sirve la API y el build de React.
- **Éxito:** Cualquiera levanta la imagen y completa el flujo: registro con rol, la empresa publica una posición, el candidato aplica, la empresa ve quién aplicó.
- **Restricción:** Una sola imagen, sin docker-compose ni servicios externos.
- **Fuera de alcance:** Subida de CV, correos, chat, despliegue en la nube, PostgreSQL, panel de administración.
