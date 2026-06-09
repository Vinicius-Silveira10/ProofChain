# ProofChain — Smart Contract ⛓️

> Contrato Solidity responsável por armazenar provas criptográficas (hashes SHA-256) de Títulos de Dívida de forma imutável na blockchain Ethereum.

**Stack:** Solidity `^0.8.19` · Hardhat · ethers.js v6 · TypeChain · Rede Sepolia Testnet

---

## 📄 Contrato: `ProofChainRegistry`

O contrato **NUNCA** armazena dados financeiros ou informações pessoais (PII). Armazena exclusivamente o **hash SHA-256** calculado pelo backend, garantindo conformidade com a LGPD e mantendo a privacidade dos dados on-chain.

### Funções Principais

| Função | Acesso | Descrição |
|--------|--------|-----------|
| `storeHash(id, hash, uuid)` | `onlyOwner` | Ancora o hash de um título individualmente |
| `storeHashBatch(ids[], hashes[], uuids[])` | `onlyOwner` | Ancora múltiplos hashes em uma transação (reduz gas) |
| `getHash(id)` | Público (view) | Retorna o hash armazenado para um ID |
| `getProof(id)` | Público (view) | Retorna `(hash, timestamp, blockNumber)` |
| `hashExists(id)` | Público (view) | Verifica se um ID já foi ancorado |
| `verify(id, candidateHash)` | Público (view) | Compara hash candidato com o ancorado — custo zero |
| `pause()` / `unpause()` | `onlyOwner` | Circuit breaker para incident response |
| `transferOwnership(newOwner)` | `onlyOwner` | Inicia transferência de ownership (two-step) |
| `acceptOwnership()` | `pendingOwner` | Confirma a transferência de ownership |

### Evento Principal

```solidity
event HashStored(
    bytes32 indexed id,
    bytes32 indexed hash,
    string  uuid,
    uint256 timestamp,
    uint256 blockNumber
);
```

---

## 🗂️ Estrutura de Pastas

```
smart-contract/
├── contracts/
│   └── ProofChainRegistry.sol  # Contrato principal
├── scripts/
│   └── deploy.ts               # Script de deploy na Sepolia
├── test/
│   └── ProofChainRegistry.test.ts  # Testes Hardhat (Mocha + Chai)
├── deployments/                # Endereços de contratos deployados por rede
├── typechain-types/            # Tipos TypeScript gerados automaticamente
├── hardhat.config.ts           # Configuração Hardhat (redes, compilador, plugins)
└── .env                        # Credenciais de deploy (NÃO commitar)
```

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do `smart-contract/`:

```bash
cp .env.example .env
```

| Variável                     | Obrigatório | Descrição |
|------------------------------|-------------|-----------|
| `SEPOLIA_RPC_URL`            | Sim         | Endpoint HTTP do Infura ou Alchemy para Sepolia |
| `BACKEND_WALLET_PRIVATE_KEY` | Sim         | Chave privada da wallet com ETH de teste (Sepolia) |
| `ETHERSCAN_API_KEY`          | Não         | Para verificação do contrato no Etherscan |

> [!CAUTION]
> **NUNCA** commite o arquivo `.env`. A chave privada controla a wallet que é `owner` do contrato — expô-la comprometeria toda a segurança do sistema.

---

## 🚀 Comandos Disponíveis

```bash
# Compilar os contratos Solidity
npx hardhat compile

# Rodar a suíte de testes (rede hardhat local — sem custo de gas)
npx hardhat test

# Rodar testes com relatório de gas
npx hardhat test --grep "gas"
# ou:
REPORT_GAS=true npx hardhat test

# Checar cobertura dos testes
npx hardhat coverage

# Limpar artefatos de compilação
npx hardhat clean
```

---

## 🛸 Deploy na Sepolia (Primeira Vez)

> Necessário ter ETH de teste na Sepolia. Obtenha em: https://sepoliafaucet.com

```bash
# 1. Certifique-se de que .env está preenchido

# 2. Rode os testes para garantir que o contrato está correto
npx hardhat test

# 3. Deploy
npx hardhat run scripts/deploy.ts --network sepolia
```

O script exibirá o endereço do contrato deployado. **Copie esse endereço** e cole no `.env` do backend:

```env
CONTRACT_ADDRESS=0xSeuEnderecoAqui
```

---

## 🧪 Testes

Os testes rodam na **rede local `hardhat`** — um nó Ethereum efêmero em memória que o Hardhat sobe automaticamente. Nenhuma credencial ou ETH real é necessário.

```bash
npx hardhat test
```

A suíte cobre:
- ✅ Ancoragem de hash individual (`storeHash`)
- ✅ Ancoragem em lote (`storeHashBatch`)
- ✅ Leitura e verificação de provas (`getHash`, `verify`)
- ✅ Rejeição de duplicatas (`AlreadyRegistered`)
- ✅ Circuit breaker (`pause` / `unpause`)
- ✅ Two-step ownership transfer
- ✅ Otimizações de gas

---

## ⛽ Otimizações de Gas Implementadas

| Otimização | Impacto |
|-----------|---------|
| `bytes32` como chave de mapping (vs. `string`) | ~40% menos gas por ancoragem |
| Custom errors (vs. `require` com string) | ~20% menos gas em revert |
| Struct `Proof` unificado | 1 `SSTORE` em vez de 2 por ancoragem |
| Cache de `block.timestamp` e `block.number` no batch | ~200 gas economizados por item |
| `unchecked { ++i }` no loop do batch | Gas economy em iterações |
| Storage packing (`pendingOwner` + `paused` no mesmo slot) | 1 slot economizado |
| Optimizer habilitado (`runs: 1000`) | Bytecode otimizado para chamadas frequentes |

---

## 🔒 Segurança

- **Two-step ownership transfer** — evita perda acidental do contrato por endereço digitado incorretamente
- **Pausable (Circuit Breaker)** — permite pausar ancoragens em caso de comprometimento da chave do backend
- **Imutabilidade** — uma vez ancorado, um hash não pode ser alterado ou removido
- **Zero PII on-chain** — conformidade total com LGPD; nenhum dado pessoal ou financeiro é armazenado
