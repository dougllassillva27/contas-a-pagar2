# ==============================================================================
# 🐳 Dockerfile Multi-Stage — Sistema de Gestão Financeira
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Stage de Build e Versionamento (Cache-Busting)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Dependências de compilação para módulos nativos (ex: bcrypt)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

# Copia código necessário para executar o script de versionamento de assets
COPY src ./src
COPY public ./public
COPY versionamento ./versionamento

# Executa o versionador/cache-busting em tempo de build
RUN npm run build

# ------------------------------------------------------------------------------
# 2. Stage Final de Produção (Imagem Enxuta e Segura)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Configura fuso horário Brasil/São Paulo e instala dependências de produção
RUN apk add --no-cache tzdata python3 make g++

ENV TZ=America/Sao_Paulo
ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copia os arquivos de código já com assets versionados pelo stage builder
COPY --from=builder /app/src ./src
COPY --from=builder /app/public ./public
COPY --from=builder /app/versionamento ./versionamento
COPY scripts ./scripts

# Ajusta permissões para rodar como usuário sem privilégios root
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Health check usando o endpoint /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Inicialização da aplicação Express
CMD ["node", "src/app.js"]
