# Guia de Deploy na VPS com Docker e Docker Compose

Este documento orienta o processo de deploy do sistema em qualquer VPS (Ubuntu, Debian, AlmaLinux, etc.) utilizando Docker e Docker Compose, mantendo o banco de dados remoto (Neon / PostgreSQL) e todas as integrações existentes.

---

## 1. Pré-requisitos na VPS

Na sua VPS (ex: Ubuntu 22.04 / 24.04 LTS), certifique-se de que o Git, Docker e Docker Compose estão instalados:

```bash
# Atualizar repositórios
sudo apt update && sudo apt upgrade -y

# Instalar Git e Curl
sudo apt install -y git curl

# Instalar Docker (script oficial do Docker)
curl -fsSL https://get.docker.com | sh

# Adicionar usuário atual ao grupo docker (opcional para evitar sudo toda vez)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalação
docker --version
docker compose version
```

---

## 2. Passo a Passo do Deploy

### Passo 1: Clonar o Repositório

```bash
git clone <URL_DO_SEU_REPOSITORIO> /opt/contas-a-pagar
cd /opt/contas-a-pagar
```

### Passo 2: Configurar as Variáveis de Ambiente (`.env`)

Copie o `.env.example` para `.env`:

```bash
cp .env.example .env
nano .env
```

Preencha os valores reais de produção:

```env
# Conexão do Banco Neon (PostgreSQL) — Mantém como já funciona hoje
DATABASE_URL=postgresql://usuario:senha@host.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require

# Senhas de Acesso
SENHA_MESTRA=sua_senha_mestra_super_segura
SENHA_VITORIA=sua_senha_vitoria_super_segura

# Token para Integrações (ex: Tasker/Automator Android)
API_TOKEN=seu_token_api_seguro

# Segredo da Sessão Express (32+ caracteres)
SESSION_SECRET=uma_string_aleatoria_longa_e_segura_aqui

# Porta interna do container (padronizado 3000)
PORT=3000

# Bot Telegram (opcional, se utilizado)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz
TELEGRAM_CHAT_ID=123456789
TELEGRAM_WEBHOOK_SECRET=segredo_aleatorio_webhook

# URL pública da VPS com HTTPS (para o Webhook do Telegram e links)
APP_EXTERNAL_URL=https://financeiro.seudominio.com
```

> **Atenção:** Mantenha o arquivo `.env` seguro com permissões restritas: `chmod 600 .env`.

### Passo 3: Subir a Aplicação com Docker Compose

```bash
docker compose up -d --build
```

O comando irá:
1. Executar o stage `builder` compilando os assets com o script de cache-busting (`npm run build`).
2. Gerar a imagem enxuta em Node 20 Alpine com dependências de produção (`npm ci --omit=dev`).
3. Iniciar o container em segundo plano com restart automático (`restart: unless-stopped`).
4. Configurar timezone `America/Sao_Paulo` e healthcheck automático em `/health`.

### Passo 4: Configurar o Webhook do Telegram (se aplicável)

Após o container estar rodando e o seu domínio público apontando para a VPS com HTTPS:

```bash
docker compose exec app npm run telegram:setup
```

---

## 3. Configuração de Proxy Reverso & SSL (HTTPS)

Para expor a aplicação com HTTPS na porta 443 com seu domínio (ex: `financeiro.seudominio.com`), você pode utilizar **Nginx + Certbot**, **Nginx Proxy Manager** ou **Caddy**.

### Opção A: Caddy (Mais rápido e SSL 100% automático)

1. Instale o Caddy na VPS:
   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

2. Edite o `/etc/caddy/Caddyfile`:
   ```caddy
   financeiro.seudominio.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```

3. Reinicie o Caddy:
   ```bash
   sudo systemctl restart caddy
   ```

---

### Opção B: Nginx + Certbot (Let's Encrypt)

1. Instale Nginx e Certbot:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   ```

2. Crie a configuração `/etc/nginx/sites-available/contas-a-pagar`:
   ```nginx
   server {
       server_name financeiro.seudominio.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Ative o site e gere o certificado SSL:
   ```bash
   sudo ln -s /etc/nginx/sites-available/contas-a-pagar /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   sudo certbot --nginx -d financeiro.seudominio.com
   ```

---

## 4. Comandos Úteis do Dia a Dia

| Ação | Comando |
|------|---------|
| **Ver logs em tempo real** | `docker compose logs -f app` |
| **Ver status do container** | `docker compose ps` |
| **Reiniciar aplicação** | `docker compose restart app` |
| **Parar aplicação** | `docker compose down` |
| **Atualizar código (Deploy de nova versão)** | `git pull && docker compose up -d --build` |
| **Executar testes/scripts no container** | `docker compose exec app npm test` |
| **Reconfigurar Webhook do Telegram** | `docker compose exec app npm run telegram:setup` |
| **Verificar Health Check da aplicação** | `curl -i http://localhost:3000/health` |
