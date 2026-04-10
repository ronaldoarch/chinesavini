# API Node — build direto com imagem oficial (alternativa ao Nixpacks quando o nix-env falha no servidor).
FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
