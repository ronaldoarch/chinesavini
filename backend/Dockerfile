# Build estável no Coolify / Docker (alternativa ao Nixpacks, que pode falhar no npm ci / nix-env).
# No Coolify: diretório base = backend, tipo de build = Dockerfile, caminho Dockerfile = Dockerfile.
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

ENV NODE_ENV=production
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NODE_OPTIONS=--max-old-space-size=4096

RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

RUN mkdir -p uploads && chmod 777 uploads

EXPOSE 5000

CMD ["node", "server.js"]
