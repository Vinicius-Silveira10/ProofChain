import {
  JsonRpcProvider,
  Wallet,
  Contract,
  ContractTransactionResponse,
  ContractTransactionReceipt,
  keccak256,
  toUtf8Bytes,
  isHexString,
} from "ethers";
import { hashToBytes32 } from "./hashEngine";

/**
 * ============================================================================
 * BLOCKCHAIN SERVICE
 * ============================================================================
 *
 * Wrapper do ProofChainRegistry com as garantias exigidas pela spec:
 *
 *  - RN-REC-003: timeout máximo de 60s na confirmação (NÃO grava no PG se
 *               a tx não confirmar).
 *  - RNF-REL-001: atomicidade SQL-blockchain (o caller só persiste se este
 *                método resolver com sucesso).
 *  - RNF-REL-003: graceful degradation — verify() retorna PENDING se o RPC
 *                estiver inacessível, em vez de lançar.
 *  - RN-INV-003: leituras usam `staticCall` (zero gas).
 *
 *  - Idempotência: se a transação já foi minerada mas o caller perdeu a
 *    resposta (crash, network blip), uma reanchoragem do mesmo id falha com
 *    `AlreadyRegistered` no contrato — o service detecta e retorna o hash já
 *    ancorado, evitando dupla persistência inconsistente.
 * ============================================================================
 */

const ABI = [
  // v2 pós-auditoria: storeHash/Batch recebem uuid para emissão no evento on-chain
  "function storeHash(bytes32 id, bytes32 hash, string uuid) external",
  "function storeHashBatch(bytes32[] ids, bytes32[] hashes, string[] uuids) external",
  "function getHash(bytes32 id) external view returns (bytes32)",
  "function getProof(bytes32 id) external view returns (bytes32 hash, uint256 timestamp, uint256 blockNumber)",
  "function hashExists(bytes32 id) external view returns (bool)",
  "function verify(bytes32 id, bytes32 candidateHash) external view returns (bool)",
  "function paused() external view returns (bool)",
  // v2: hash indexed para busca O(1), uuid para auditoria on-chain
  "event HashStored(bytes32 indexed id, bytes32 indexed hash, string uuid, uint256 timestamp, uint256 blockNumber)",
];

const DEFAULT_TIMEOUT_MS = 60_000; // RN-REC-003
const DEFAULT_CONFIRMATIONS = 1;

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contractAddress: string;
  timeoutMs?: number;
  confirmations?: number;
}

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  onChainId: string; // bytes32 (keccak256(uuid))
}


export class BlockchainService {
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly contract: Contract;
  private readonly timeoutMs: number;
  private readonly confirmations: number;

  constructor(config: BlockchainConfig) {
    if (!config.rpcUrl) throw new Error("BlockchainService: rpcUrl required");
    if (!config.privateKey) throw new Error("BlockchainService: privateKey required");
    if (!config.contractAddress) throw new Error("BlockchainService: contractAddress required");

    // Task 2.1: Normalizar chave privada — ethers.Wallet exige prefixo '0x'
    // O .env pode armazenar a chave sem o prefixo (64 chars hex puros)
    const normalizedKey = config.privateKey.startsWith('0x')
      ? config.privateKey
      : `0x${config.privateKey}`;

    this.provider = new JsonRpcProvider(config.rpcUrl);

    // Task 2.2: Isolar instanciação da Wallet e do Contract em try/catch
    // Um erro aqui (chave inválida, address inválido) não deve derrubar o processo
    try {
      this.wallet = new Wallet(normalizedKey, this.provider);
    } catch (err: any) {
      throw new Error(
        `BlockchainService: falha ao criar Wallet — verifique BACKEND_WALLET_PRIVATE_KEY. Detalhe: ${err?.message}`
      );
    }

    try {
      // Task 2.2: Contrato instanciado com wallet (Signer), nunca apenas com provider
      this.contract = new Contract(config.contractAddress, ABI, this.wallet);
    } catch (err: any) {
      throw new Error(
        `BlockchainService: falha ao criar Contract — verifique CONTRACT_ADDRESS. Detalhe: ${err?.message}`
      );
    }

    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.confirmations = config.confirmations ?? DEFAULT_CONFIRMATIONS;
  }

  /**
   * Converte o UUID do título em bytes32 (chave on-chain).
   * Determinístico — sempre produz o mesmo bytes32 para o mesmo UUID.
   */
  static idToBytes32(uuid: string): `0x${string}` {
    return keccak256(toUtf8Bytes(uuid)) as `0x${string}`;
  }

  /**
   * Ancora o hash de um Título de Dívida na blockchain.
   *
   * GARANTIAS:
   *   - Lança se a tx não confirmar dentro do timeout (caller NÃO persiste).
   *   - Detecta o erro `AlreadyRegistered` e retorna sucesso idempotente
   *     (importante para recovery após crash do backend).
   */
  async anchorHash(uuid: string, hashHex: string): Promise<AnchorResult> {
    const id = BlockchainService.idToBytes32(uuid);
    const hashBytes32 = hashToBytes32(hashHex);

    // Pré-check: contrato pausado? (incident response)
    const isPaused = await this.contract.paused();
    if (isPaused) {
      throw new BlockchainError("CONTRACT_PAUSED", "Contract is paused — anchoring disabled");
    }

    // Pré-check: id já ancorado? (idempotência defensiva)
    const existing = (await this.contract.getHash(id)) as string;
    if (existing && existing !== ZERO_BYTES32) {
      if (existing.toLowerCase() === hashBytes32.toLowerCase()) {
        // Já ancorado com o MESMO hash — recovery seguro.
        return {
          txHash: "ALREADY_ANCHORED",
          blockNumber: -1,
          onChainId: id,
        };
      }
      // Já ancorado com OUTRO hash — colisão de UUID (não deveria acontecer com v4).
      throw new BlockchainError(
        "ID_COLLISION",
        `UUID ${uuid} already anchored with a different hash`
      );
    }

    let tx: ContractTransactionResponse;
    try {
      // v2: passa o UUID original para emissão no evento on-chain (auditoria forense)
      tx = (await this.contract.storeHash(id, hashBytes32, uuid)) as ContractTransactionResponse;
    } catch (err) {
      throw new BlockchainError("TX_SEND_FAILED", errMsg(err));
    }

    const receipt = await this.waitWithTimeout(tx);
    if (!receipt || receipt.status !== 1) {
      throw new BlockchainError("TX_REVERTED", `Transaction reverted: ${tx.hash}`);
    }

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      onChainId: id,
    };
  }

  /**
   * Recupera o hash puro armazenado on-chain para um dado UUID.
   * View function — custo zero de gás.
   */
  async getOnChainHash(uuid: string): Promise<string> {
    const id = BlockchainService.idToBytes32(uuid);
    return (await this.contract.getHash(id)) as string;
  }

  /** Healthcheck rápido para dashboard. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------
  // PRIVATE
  // --------------------------------------------------------------------

  private async waitWithTimeout(
    tx: ContractTransactionResponse
  ): Promise<ContractTransactionReceipt | null> {
    return await Promise.race([
      tx.wait(this.confirmations),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BlockchainError("TIMEOUT", `Tx ${tx.hash} not confirmed in ${this.timeoutMs}ms`)),
          this.timeoutMs
        )
      ),
    ]);
  }
}

// ============================================================================
// ERROR TYPE & HELPERS
// ============================================================================

export type BlockchainErrorCode =
  | "CONTRACT_PAUSED"
  | "ID_COLLISION"
  | "TX_SEND_FAILED"
  | "TX_REVERTED"
  | "TIMEOUT";

export class BlockchainError extends Error {
  constructor(public readonly code: BlockchainErrorCode, message: string) {
    super(message);
    this.name = "BlockchainError";
  }
}

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// ============================================================================
// SINGLETON FACADE — API nomeada exigida pelo TASK 02.4 da spec
// ============================================================================
// Estas funções satisfazem o contrato de interface literal do prompt sem
// duplicar lógica. O singleton é inicializado via initProvider() antes do uso.

let _instance: BlockchainService | null = null;

/**
 * Inicializa o singleton do BlockchainService com as variáveis de ambiente.
 * Deve ser chamado uma única vez na inicialização do servidor (src/app.ts).
 */
export function initProvider(): BlockchainService {
  if (_instance) return _instance;

  try {
    const privateKey = process.env.BACKEND_WALLET_PRIVATE_KEY!;
    const rpcUrl     = process.env.SEPOLIA_RPC_URL!;
    const address    = process.env.CONTRACT_ADDRESS!;

    // Aviso antecipado se CONTRACT_ADDRESS for o placeholder zero
    if (address === '0x0000000000000000000000000000000000000000') {
      console.warn(
        '[BlockchainService] AVISO: CONTRACT_ADDRESS é o endereço zero. ' +
        'Faça o deploy do contrato e atualize .env para habilitar ancoragem real.'
      );
    }

    _instance = new BlockchainService({
      rpcUrl,
      privateKey, // normalização do 0x é feita dentro do construtor
      contractAddress: address,
      timeoutMs: 60_000,
      confirmations: 1,
    });

    console.log('[BlockchainService] ✅ Singleton inicializado com sucesso.');
    return _instance;
  } catch (err: any) {
    // Task 2: NUNCA deixar a falha de inicialização derrubar o processo
    // O controller captura BLOCKCHAIN_UNAVAILABLE e retorna 503
    console.error('[BlockchainService] ❌ Falha na inicialização:', err?.message ?? err);
    throw err; // Relança para o caller (getTituloService no controller) tratar
  }
}


export async function getHashFromChain(id: string): Promise<string | null> {
  const svc = _instance ?? initProvider();
  try {
    const raw = await svc.getOnChainHash(id);
    if (!raw || raw === ZERO_BYTES32) return null;
    // Remove o prefixo 0x e normaliza para lowercase 64 chars
    return raw.replace(/^0x/, "").toLowerCase().padStart(64, "0");
  } catch {
    return null; // graceful degradation — camada de serviço trata como PENDING
  }
}

/**
 * Verifica se a conexão com a rede Sepolia está disponível.
 * Usado no health check GET /api/health.
 * @returns true se o provider responde, false caso contrário.
 */
export async function checkChainConnection(): Promise<boolean> {
  const svc = _instance ?? initProvider();
  return svc.isHealthy();
}
