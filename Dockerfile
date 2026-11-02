# syntax=docker/dockerfile:1

# ---- Etapa 1: compila el cliente (Vite) ----
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY shared shared
COPY server server
COPY client client
# prisma vive en server/node_modules: se ejecuta desde ahí
RUN cd server && npx prisma generate && cd .. && npm run build -w @app/client

# ---- Etapa 2: imagen final, solo dependencias de producción ----
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev -w @app/server && npm cache clean --force
COPY shared shared
COPY server server
RUN cd server && npx prisma generate \
    && mkdir /data && chown node:node /data
COPY --from=build /app/client/dist client/dist

# /data guarda la base SQLite y el secreto JWT; montar un volumen para conservarlos.
VOLUME /data
USER node
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Al arrancar: migra, siembra si está vacía y sirve (ver server/src/index.ts). node (no npm) como PID 1 para recibir SIGTERM.
CMD ["node", "--import", "tsx", "src/index.ts"]
