# ── 1. Build de la PWA (Vue + Vite) ──────────────────────────────
FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --no-audit --no-fund
COPY client client
RUN npm run build -w client

# ── 2. Image d'exécution : API Express qui sert aussi la PWA ─────
FROM node:24-slim
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace server --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server/src server/src
COPY server/migrations server/migrations
COPY --from=build /app/client/dist client/dist

USER node
WORKDIR /app/server
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "src/index.js"]
