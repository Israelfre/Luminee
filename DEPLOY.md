# Luminee — Deploy no Render

## Pré-requisitos
- Conta no [Render](https://render.com)
- Repositório Git (GitHub/GitLab)

## Deploy com render.yaml (recomendado)

1. Faça push do projeto para um repositório Git
2. No Render, clique em **New → Blueprint**
3. Conecte o repositório e o Render vai detectar o `render.yaml` automaticamente
4. Configure as variáveis de ambiente obrigatórias (veja abaixo)
5. Clique em **Apply**

O Render vai criar automaticamente:
- Um serviço web (Node.js)
- Um banco de dados PostgreSQL gratuito

## Deploy manual (Web Service)

### 1. Criar banco de dados
- New → PostgreSQL → plano Free → Create Database
- Copie a **Internal Database URL**

### 2. Criar Web Service
- New → Web Service → conecte o repositório
- **Environment**: Node
- **Build Command**:
  ```
  npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build:render
  ```
- **Start Command**:
  ```
  pnpm --filter @workspace/db run push && pnpm --filter @workspace/scripts run seed && node --enable-source-maps artifacts/api-server/dist/index.mjs
  ```

### 3. Variáveis de Ambiente obrigatórias

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL interna do banco PostgreSQL |
| `SESSION_SECRET` | String aleatória (ex: `openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Email de acesso ao painel admin |
| `ADMIN_PASSWORD` | Senha do painel admin |

### Variáveis opcionais (Clerk SSO)
Deixe em branco para usar apenas login por email+senha.

| Variável | Valor |
|---|---|
| `CLERK_SECRET_KEY` | Chave secreta do Clerk |
| `CLERK_PUBLISHABLE_KEY` | Chave pública do Clerk |
| `VITE_CLERK_PUBLISHABLE_KEY` | Mesma chave pública (para o frontend) |

## Acessos após deploy

| URL | Descrição |
|---|---|
| `https://sua-app.onrender.com/` | Login do salão |
| `https://sua-app.onrender.com/admin` | Painel administrativo |
| `https://sua-app.onrender.com/registrar` | Cadastro de novo salão |
| `https://sua-app.onrender.com/api/health` | Health check |

### Credenciais padrão

**Painel Admin:**
- Email: `admin@luminee.com` (ou o valor de `ADMIN_EMAIL`)
- Senha: `admin40028922` (ou o valor de `ADMIN_PASSWORD`)

**Salão Demo (criado automaticamente no primeiro boot):**
- Email: `demo@luminee.com`
- Senha: `demo123456` (ou o valor de `DEMO_SALON_PASSWORD`)

## Arquitetura no Render

```
[Usuário] → [Render Web Service :10000]
              ├─ GET /api/*     → Express API
              ├─ GET /          → React SPA (arquivos estáticos)
              └─ GET /*         → index.html (SPA fallback)
                       ↓
              [PostgreSQL Render]
```

O backend Express serve tanto a API quanto o frontend React (arquivo `dist/public`).
Não é necessário um serviço separado para o frontend.
