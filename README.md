# ProofChain 🛡️

Bem-vindo ao repositório oficial do ProofChain. Um sistema unificado que combina Segurança Bancária (Backend), Dashboard Gerencial (Frontend) e Imutabilidade Global (Blockchain).

## Pré-requisitos
Para rodar este ecossistema na sua máquina, certifique-se de ter:
- **Node.js** v18 ou superior.
- **Docker** e Docker Compose (para orquestrar o PostgreSQL).
- Conta no **Infura** ou **Alchemy** (Para obter a URL RPC da rede Sepolia).
- Uma **Wallet (MetaMask)** com algum ETH de teste na rede Sepolia (para deploy do contrato).

---

## Setup Mágico em 5 Passos (Docker + Node)

O fluxo de desenvolvimento foi pensado para máxima produtividade. Com 5 comandos, seu ambiente estará no ar.

1. **Clone o repositório:**
   ```bash
   git clone <seu-repo-url> proofchain
   cd proofchain
   ```

2. **Configure o Ambiente:**
   Copie o modelo de ambiente e preencha as variáveis secretas:
   ```bash
   cp backend/.env.example backend/.env
   # Edite backend/.env adicionando seu RPC_URL e PRIVATE_KEY
   ```

3. **Suba o Banco de Dados (Docker):**
   ```bash
   docker-compose up -d
   ```

4. **Instale e Semeie o Backend:**
   O script abaixo instalará pacotes, criará as tabelas e injetará usuários de teste.
   ```bash
   cd backend
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Inicie o Servidor Node.js:**
   ```bash
   npm run dev
   ```
   *Pronto! O backend responderá na porta `3001`.*

---

### Iniciar o Frontend (Painel Gerencial)
Com o backend rodando, abra uma nova aba do terminal:
```bash
cd frontend
npm install
npm run dev
```
*Acesse o painel em `http://localhost:3000`.*

---

### Iniciar o Smart Contract (Primeira Vez Apenas)
Se você precisa deployar o Oráculo do zero na Sepolia:
```bash
cd smart-contract
npm install
npx hardhat test # Para validar a solidez localmente
npx hardhat run scripts/deploy.ts --network sepolia
```
*Copie o Endereço de Contrato gerado e cole no `.env` do backend em `CONTRACT_ADDRESS`.*

---

## Credenciais de Teste (Criadas pelo Seed)

Para acessar a API e o Frontend de homologação, utilize os perfis abaixo:

| Papel       | Email de Acesso         | Senha Padrão  | Permissões                                                                 |
|-------------|-------------------------|---------------|----------------------------------------------------------------------------|
| **ADMIN**   | admin@proofchain.dev    | Admin@2025!   | Criação de Títulos, Configuração, Cancelamentos críticos.                 |
| **OPERADOR**| operador@proofchain.dev | Operador@2025!| Visualização e registro financeiro de Parcelas (Pagamentos).               |
| **AUDITOR** | auditor@proofchain.dev  | Auditor@2025! | Acesso irrestrito às Trilhas Forenses (Audit Logs). Sem poder de mutação. |

---

## Tabela de Variáveis de Ambiente (`backend/.env`)

| Variável | Tipo | Obrigatório | Descrição |
|----------|------|-------------|-----------|
| `PORT` | Number | Sim | Porta em que a API Express escuta (Ex: 3001) |
| `DATABASE_URL` | String | Sim | Connection string do PostgreSQL |
| `JWT_SECRET` | String | Sim | Chave HMAC de 256 bits para assinar tokens |
| `RPC_URL` | String | Sim | Endpoint HTTP do Infura ou Alchemy para rede Sepolia |
| `PRIVATE_KEY` | String | Sim | Chave privada da carteira que tem fundos em ETH (Sepolia) |
| `CONTRACT_ADDRESS` | String | Não | Endereço do Smart Contract já deployado. |
| `DATABASE_URL_TEST` | String | Não | Connection string do banco isolado para testes E2E do Jest. |

---

## Qualidade e CI/CD
Nós rodamos sob a chancela **SRE (Site Reliability Engineering)** com barreiras atômicas. O motor criptográfico e as rotas possuem cobertura E2E mínima exigida.
Para testar os bloqueios de fraude financeiro/hash:
```bash
cd backend
npm test -- --coverage
```
*O teste construirá o banco `proofchain_test` e varrerá cenários de ataque simulado.*
