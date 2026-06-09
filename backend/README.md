# ProofChain — Backend 🖥️

> API REST responsável pela lógica de negócio, motor criptográfico e comunicação com a blockchain.

**Stack:** Node.js · Express · TypeScript · Prisma ORM · PostgreSQL · ethers.js

---

## 🗂️ Estrutura de Pastas

```
backend/
├── prisma/
│   ├── schema.prisma          # Modelos do banco de dados
│   ├── migrations/            # Histórico de migrações
│   └── seed.ts                # Cria usuários de teste (ADMIN, OPERADOR, AUDITOR)
├── src/
│   ├── app.ts                 # Entry point — middlewares, rotas e startup
│   ├── config/
│   │   ├── env.ts             # Validação de variáveis de ambiente (crash-fast)
│   │   └── swagger.ts         # Configuração OpenAPI 3.0 + schemas reutilizáveis
│   ├── controllers/           # Handlers HTTP — recebem req/res e delegam para services
│   │   ├── authController.ts
│   │   ├── tituloController.ts
│   │   ├── installmentController.ts
│   │   ├── auditLogController.ts
│   │   └── dashboardController.ts
│   ├── services/              # Lógica de negócio e integrações
│   │   ├── hashEngine.ts      # Motor SHA-256 — gera o hash canônico do título
│   │   ├── blockchainService.ts # Comunicação com o smart contract via ethers.js
│   │   ├── verificationService.ts # Compara hash local vs. hash on-chain
│   │   ├── tituloService.ts
│   │   ├── installmentService.ts
│   │   └── authService.ts
│   ├── routes/                # Definição de rotas + anotações @swagger
│   ├── middleware/
│   │   └── auth.ts            # JWT guard + RBAC (authenticate / authorize)
│   └── jobs/
│       └── integrityScanner.ts # Cron job — re-verifica todos os títulos a cada 15min
└── tests/
    └── integration/           # Testes E2E com Jest + Supertest
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do `backend/` copiando `.env.example`:

```bash
cp .env.example .env
```

| Variável                      | Obrigatório | Descrição |
|-------------------------------|-------------|-----------|
| `PORT`                        | Sim         | Porta da API (ex: `3001`) |
| `NODE_ENV`                    | Sim         | `development` \| `test` \| `production` |
| `DATABASE_URL`                | Sim         | Connection string PostgreSQL principal |
| `DATABASE_URL_TEST`           | Não         | Connection string do banco isolado para testes E2E |
| `JWT_SECRET`                  | Sim         | Chave HMAC ≥ 256 bits para assinar tokens JWT |
| `JWT_EXPIRES_IN`              | Sim         | Expiração do token (ex: `8h`) |
| `SEPOLIA_RPC_URL`             | Sim         | Endpoint Infura/Alchemy para a rede Sepolia |
| `BACKEND_WALLET_PRIVATE_KEY`  | Sim         | Chave privada da wallet que paga o gas das ancoragens |
| `CONTRACT_ADDRESS`            | Sim         | Endereço do `ProofChainRegistry` deployado |
| `CORS_ALLOWED_ORIGINS`        | Sim         | Origens permitidas (ex: `http://localhost:3000`) |

> [!CAUTION]
> **NUNCA** commite o arquivo `.env`. Ele está no `.gitignore`. Credenciais de wallet comprometem fundos reais.

---

## 🚀 Rodando Localmente

```bash
# 1. Suba o PostgreSQL via Docker
docker-compose up -d   # (na raiz do projeto)

# 2. Instale as dependências
npm install

# 3. Aplique as migrações e popule o banco
npx prisma migrate dev
npx prisma db seed

# 4. Inicie o servidor em modo watch
npm run dev
```

> ✅ API disponível em `http://localhost:3001`

---

## 📚 Documentação Interativa (Swagger UI)

Com o servidor rodando, acesse:

| URL | Descrição |
|-----|-----------|
| `http://localhost:3001/api/docs` | Interface Swagger UI interativa |
| `http://localhost:3001/api/docs.json` | Spec OpenAPI raw em JSON (para Insomnia/Postman) |
| `http://localhost:3001/api/health` | Health check da API |

> A documentação é desabilitada automaticamente em `NODE_ENV=production`.

---

## 🧪 Testes

A suíte E2E cobre os cenários críticos: criação de títulos, verificação de integridade, simulação de fraude e controle de acesso RBAC.

```bash
# Rodar a suíte completa com relatório de cobertura
npm test -- --coverage

# Threshold mínimo de cobertura exigido (definido em jest.config.js):
# - Global:                80% statements / branches / functions / lines
# - hashEngine.ts:         90% (motor criptográfico crítico)
# - verificationService.ts: 90% (motor de detecção de fraude)
```

> Os testes criam e usam um banco isolado `proofchain_test` — nunca alteram o banco de desenvolvimento.

---

## 🔑 Credenciais de Teste (após seed)

| Role       | E-mail                    | Senha           |
|------------|---------------------------|-----------------|
| `ADMIN`    | admin@proofchain.dev      | `Admin@2025!`   |
| `OPERATOR` | operador@proofchain.dev   | `Operador@2025!`|
| `AUDITOR`  | auditor@proofchain.dev    | `Auditor@2025!` |

---

## 🧠 Fluxo Criptográfico Central

```
Emissão do Título
      │
      ▼
[hashEngine.ts]
  SHA-256(campos canônicos) → hash local
      │
      ▼
[blockchainService.ts]
  storeHash(id, hash, uuid) → Tx Sepolia (imutável)
      │
      ▼
[PostgreSQL]
  Persiste: blockchain_tx_hash + blockchain_anchor_hash

Verificação (cron a cada 15min ou on-demand)
      │
      ▼
[verificationService.ts]
  Recalcula SHA-256 atual
  Busca hash on-chain via getHash(id)
  Compara → VERIFIED ✅ | COMPROMISED 🚨 | PENDING ⏳
```
