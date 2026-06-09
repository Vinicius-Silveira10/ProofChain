# ProofChain 🛡️

> **Sistema Híbrido de Integridade Corporativa para Registro e Auditoria de Títulos de Dívida**

O ProofChain combina a privacidade e performance de um banco de dados relacional com a imutabilidade pública da blockchain Ethereum para criar um **"carimbo matemático"** irrefutável sobre cada título de dívida corporativa emitido — expondo qualquer tentativa de adulteração instantaneamente.

---

## 📊 Apresentação do Projeto

Confira a apresentação em PDF com os detalhes, arquitetura e proposta de valor do projeto:
- **No repositório:** [ProofChain_Pitch.pptx.pdf](./ProofChain_Pitch.pptx.pdf)
- **No Google Drive:** [Acessar apresentação online](https://drive.google.com/file/d/1lWzpRizv3TqoH0gam2_Es31IibCDCsee/view?usp=sharing)

---

## 🧠 Como Funciona

```
[Operador Financeiro]
        │
        ▼
  [Backend Node.js]
   ├─ 1. Valida campos
   ├─ 2. Gera hash SHA-256
   ├─ 3. Ancora hash na Blockchain ──► [Smart Contract Sepolia]
   └─ 4. Persiste no PostgreSQL          (imutável, público)

[Qualquer pessoa no mundo]
        │
        ▼
  [Portal Público]
   └─ Compara SHA-256 atual ◄──────► Hash on-chain
      ✅ VERIFIED   — dados íntegros
      🚨 COMPROMISED — fraude detectada
      ⏳ PENDING    — blockchain inacessível
```

**Regra central:** se qualquer byte do banco de dados for alterado, o hash recalculado diverge do hash registrado na blockchain — a fraude é exposta matematicamente, sem depender de auditores humanos.

---

## 🗂️ Estrutura do Repositório

```
proofchain/
├── backend/          # API REST (Node.js + Express + TypeScript + Prisma)
├── frontend/         # Painel gerencial e portal público (React + Vite + TypeScript)
├── smart-contract/   # Contrato Solidity + Hardhat (rede Sepolia)
└── docker-compose.yml
```

---

## ✅ Pré-requisitos

- **Node.js** v18 ou superior
- **Docker** e Docker Compose (para orquestrar o PostgreSQL)
- Conta no **[Infura](https://infura.io)** ou **[Alchemy](https://alchemy.com)** (para obter a URL RPC da rede Sepolia)
- Uma **Wallet (MetaMask)** com ETH de teste na rede Sepolia (para deploy do contrato)

---

## 🚀 Setup em 5 Passos

O fluxo foi pensado para máxima produtividade. Com 5 comandos, o ambiente estará no ar.

**1. Clone o repositório:**
```bash
git clone <seu-repo-url> proofchain
cd proofchain
```

**2. Configure o ambiente:**
```bash
cp backend/.env.example backend/.env
# Edite backend/.env adicionando suas credenciais (veja a tabela de variáveis abaixo)
```

**3. Suba o banco de dados:**
```bash
docker-compose up -d
```

**4. Instale e popule o backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npx prisma db seed
```

**5. Inicie o servidor:**
```bash
npm run dev
```
> ✅ O backend responderá na porta `3001`.

---

## 🖥️ Iniciar o Frontend

Com o backend rodando, abra uma nova aba do terminal:

```bash
cd frontend
npm install
npm run dev
```

> Acesse o painel em `http://localhost:3000`.

---

## ⛓️ Deploy do Smart Contract (Primeira Vez Apenas)

Se você precisa deployar o contrato do zero na Sepolia:

```bash
cd smart-contract
npm install
npx hardhat test                                      # Valida o contrato localmente
npx hardhat run scripts/deploy.ts --network sepolia   # Deploya na Sepolia
```

> Copie o endereço de contrato gerado e cole no `.env` do backend em `CONTRACT_ADDRESS`.

---

## 🔑 Credenciais de Teste

Criadas automaticamente pelo seed (`npx prisma db seed`):

| Papel        | E-mail de Acesso          | Senha Padrão    | Permissões                                                                  |
|--------------|---------------------------|-----------------|-----------------------------------------------------------------------------|
| **ADMIN**    | admin@proofchain.dev      | `Admin@2025!`   | Criação de títulos, configurações, cancelamentos críticos.                  |
| **OPERADOR** | operador@proofchain.dev   | `Operador@2025!`| Visualização e registro financeiro de parcelas (pagamentos).                |
| **AUDITOR**  | auditor@proofchain.dev    | `Auditor@2025!` | Acesso irrestrito às trilhas forenses (Audit Logs). Sem poder de mutação.   |

---

## ⚙️ Variáveis de Ambiente (`backend/.env`)

| Variável                    | Tipo   | Obrigatório | Descrição                                                       |
|-----------------------------|--------|-------------|------------------------------------------------------------------|
| `PORT`                      | Number | Sim         | Porta em que a API Express escuta. Ex: `3001`                   |
| `NODE_ENV`                  | String | Sim         | Ambiente de execução. Ex: `development` ou `production`         |
| `DATABASE_URL`              | String | Sim         | Connection string do PostgreSQL                                  |
| `JWT_SECRET`                | String | Sim         | Chave HMAC de 256 bits para assinar tokens JWT                  |
| `JWT_EXPIRES_IN`            | String | Sim         | Tempo de expiração do token JWT. Ex: `8h`                       |
| `SEPOLIA_RPC_URL`           | String | Sim         | Endpoint HTTP do Infura ou Alchemy para a rede Sepolia           |
| `BACKEND_WALLET_PRIVATE_KEY`| String | Sim         | Chave privada da carteira com fundos em ETH (Sepolia)           |
| `CONTRACT_ADDRESS`          | String | Sim         | Endereço do Smart Contract já deployado na Sepolia              |
| `CORS_ALLOWED_ORIGINS`      | String | Sim         | Origens permitidas pelo CORS. Ex: `http://localhost:3000`        |
| `DATABASE_URL_TEST`         | String | Não         | Connection string do banco isolado para testes E2E do Jest       |

---

## 🧪 Qualidade e Testes

O motor criptográfico e as rotas possuem cobertura E2E mínima exigida com cenários de ataque simulado.

**Rodar a suíte completa de testes com cobertura:**
```bash
cd backend
npm test -- --coverage
```
> Os testes constroem o banco `proofchain_test` isolado e varrem cenários de fraude financeira e manipulação de hash.

**Rodar os testes do Smart Contract:**
```bash
cd smart-contract
npx hardhat test
```

---

## 🗺️ Roadmap

O ProofChain é um MVP funcional com arquitetura projetada para evoluir. Abaixo estão as fases planejadas de expansão:

### ✅ Fase 1 — MVP (Atual)
> Stack: Node.js · PostgreSQL · Solidity · React · Ethereum Sepolia Testnet

- [x] Emissão de Títulos de Dívida com ancoragem blockchain-first (SHA-256 on-chain)
- [x] Motor de hash criptográfico imutável e versionado (`hashEngine v1`)
- [x] Smart contract `ProofChainRegistry` com otimizações de gas (custom errors, `bytes32`, batch anchoring)
- [x] Verificação pública de autenticidade — sem autenticação, acessível globalmente
- [x] Cron job de integridade automática a cada 15 minutos
- [x] Trilha de auditoria forense com `diff_snapshot` (antes/depois por operação)
- [x] RBAC com roles ADMIN · OPERADOR · AUDITOR
- [x] Gestão de parcelas e registro de pagamentos
- [x] Conformidade LGPD (zero PII na blockchain) e retenção de logs por 7 anos (CVM)
- [x] Graceful degradation: sistema funciona em modo `PENDING` se a rede Ethereum estiver inacessível

---

### 🚧 Fase 2 — Hardening e Observabilidade
> Foco: produção-ready, rastreabilidade avançada e DevOps

- [ ] Pipeline CI/CD com GitHub Actions (`npm test` + `npx hardhat test` automáticos no PR)
- [ ] Swagger / OpenAPI 3.0 gerado automaticamente em `/api/docs`
- [ ] Dashboard de monitoramento com métricas de integridade em tempo real (Prometheus + Grafana)
- [ ] Rate limiting granular por IP e por token JWT
- [ ] Exportação de extrato de parcelas em `.xlsx` / `.csv` (RF15)
- [ ] Notificações por e-mail/webhook ao detectar `COMPROMISED`
- [ ] Testes de carga (k6) validando suporte a 50 requisições simultâneas (RNF-PERF-003)

---

### 🔭 Fase 3 — Expansão Web3 e Mainnet
> Foco: viabilidade econômica real e interoperabilidade

- [ ] Deploy na **Ethereum Mainnet** — custo estimado de ~R$ 0,10–R$ 2,50 por ancoragem (dependendo do gas)
- [ ] Deploy em **L2 (Polygon PoS / Arbitrum One)** — redução de custo em até 95% por transação
- [ ] Suporte a **múltiplas redes** via configuração de `chainId` no `.env`
- [ ] Indexador on-chain com **The Graph** — rastreabilidade histórica de eventos `HashStored`
- [ ] Interface de cadeia de custódia visual: navegação pelo histórico de `supersedes_id`
- [ ] Tokenização opcional do Título de Dívida como **NFT (ERC-721)** para rastreabilidade de propriedade

---

### 🌐 Fase 4 — Integração com Ecossistema Financeiro Brasileiro
> Foco: regulação, interoperabilidade e escala nacional

- [ ] Conector com **B3** (Bolsa de Valores) para validação cruzada de debêntures e CRIs/CRAs
- [ ] **ZK-Proofs (Zero-Knowledge)** — provar integridade de um título sem revelar nenhum dado, nem o hash
- [ ] Integração com **Bureaus de Crédito** (Serasa / Boa Vista) para validação de CNPJ em tempo real
- [ ] API pública certificada para **auditores externos credenciados pela CVM**
- [ ] SDK cliente (`@proofchain/sdk`) para integração com sistemas ERP corporativos (SAP, TOTVS)

---

> 💡 **Contribuições são bem-vindas!** Consulte as tarefas prontas da Fase 2 e Fase 3 para propor melhorias ou novas fases.

---

## 📄 Licença

Distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.
