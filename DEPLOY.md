# Luminee — Deploy no Render

## Pré-requisitos
- Conta no [Render](https://render.com)
- Repositório Git (GitHub/GitLab)

## Deploy com render.yaml (recomendado)

1. Faça push do projeto para um repositório Git
2. No Render, clique em **New → Blueprint**
3. Conecte o repositório e o Render vai detectar o `render.yaml` automaticamente
4. No painel do serviço **luminee-api**, defina estas variáveis (todas obrigatórias no primeiro deploy antes do seed no build):
   - `DATABASE_URL` — URL interna do Postgres do Render (ou externa com SSL)
   - `SESSION_SECRET` — ex.: saída de `openssl rand -hex 32`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` — primeiro administrador (hash gravado pelo seed)
   - `DEMO_SALON_EMAIL` / `DEMO_SALON_PASSWORD` — primeiro salão demo, se ainda não existir nenhum salão
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
| `ADMIN_EMAIL` | E-mail do primeiro utilizador admin (gravado na tabela `admin_users` pelo seed) |
| `ADMIN_PASSWORD` | Senha em texto do primeiro admin (apenas na primeira execução do seed; defina no painel do Render, nunca no repositório) |
| `DEMO_SALON_EMAIL` | E-mail do salão demo (só usado se o seed criar o primeiro salão) |
| `DEMO_SALON_PASSWORD` | Senha do salão demo (apenas no painel do Render / `.env` local, nunca em Git) |

### Sessões (padrão gestorx7)

As sessões ficam na tabela `sessions` (Postgres) via `connect-pg-simple`. O front pode enviar `X-Auth-Token` com o `sessionId` devolvido no login quando o cookie não atravessa origens diferentes (Render API + site estático).

## Acessos após deploy

| URL | Descrição |
|---|---|
| `https://sua-app.onrender.com/` | Login do salão |
| `https://sua-app.onrender.com/admin` | Painel administrativo |
| `https://sua-app.onrender.com/registrar` | Cadastro de novo salão |
| `https://sua-app.onrender.com/api/health` | Health check |

### Credenciais

Não existem utilizadores nem senhas fixos no código ou na documentação. O primeiro `seed` usa apenas `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_SALON_EMAIL` e `DEMO_SALON_PASSWORD` definidos **no painel de variáveis de ambiente do Render** (ou no `.env` local, que está no `.gitignore`). Guarde esses valores num gestor de passwords à parte do Git.

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
