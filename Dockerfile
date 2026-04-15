# Raiz do repo — para Coolify / builds com contexto "." (evita ~1GB de contexto do frontend)
# Preferível no painel: contexto = backend + Dockerfile = backend/Dockerfile
FROM node:22-bookworm-slim

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./

ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm ci --omit=dev --no-audit --no-fund

COPY backend/ .

RUN mkdir -p uploads && chmod 777 uploads

EXPOSE 5000

CMD ["node", "server.js"]
