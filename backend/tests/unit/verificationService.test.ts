/**
 * Testes unitários do verificationService (TST-002 — TASK 04.4)
 *
 * Estratégia: blockchainService.getHashFromChain é mockado via jest.mock
 * para isolar completamente os testes de rede/blockchain.
 * O hashEngine real é usado (sem mock) — garante integração real do cálculo.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  verifyTituloIntegrity,
  verifyBatch,
  VerificationStatus,
  type VerificationResult,
} from "../../src/services/verificationService";
import { generateHash } from "../../src/services/hashEngine";

// ---------------------------------------------------------------------------
// Mock do blockchainService — isola de rede real (TASK 04.4 spec)
// ---------------------------------------------------------------------------
jest.mock("../../src/services/blockchainService", () => ({
  getHashFromChain: jest.fn(),
}));

import { getHashFromChain } from "../../src/services/blockchainService";
const mockGetHash = getHashFromChain as jest.MockedFunction<typeof getHashFromChain>;

// ---------------------------------------------------------------------------
// Fixture de título canônico
// ---------------------------------------------------------------------------
const TITULO_BASE = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  cnpj_emissor: "12345678000195",
  valor_centavos: BigInt(4_000_000),         // R$ 40.000,00
  data_vencimento: new Date("2026-12-31T00:00:00.000Z"),
  // campos Prisma obrigatórios mas não usados pelo verificationService
  credor: "Credor Teste",
  hash_integridade: "",
  tx_hash: null,
  status: "ACTIVE" as const,
  integrity_status: "PENDING" as const,
  supersedes_id: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Hash real calculado com os dados acima — âncora do teste */
const HASH_ORIGINAL = generateHash({
  id: TITULO_BASE.id,
  cnpj_emissor: TITULO_BASE.cnpj_emissor,
  valor_centavos: TITULO_BASE.valor_centavos,
  data_vencimento: TITULO_BASE.data_vencimento,
});

// ---------------------------------------------------------------------------
// Setup: limpa mocks antes de cada teste
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// Suite 1 — Detecção de Adulteração (TST-002)
// ===========================================================================
describe("VerificationService — Detecção de Adulteração (TST-002)", () => {
  it("[T1] VERIFIED quando hash SQL === hash blockchain", async () => {
    mockGetHash.mockResolvedValue(HASH_ORIGINAL);

    const result = await verifyTituloIntegrity(TITULO_BASE as any);

    expect(result.status).toBe(VerificationStatus.VERIFIED);
    expect(result.isMatch).toBe(true);
    expect(result.sqlHash).toBe(HASH_ORIGINAL);
    expect(result.blockchainHash).toBe(HASH_ORIGINAL);
  });

  it("[T2] COMPROMISED quando valor_centavos foi adulterado no banco", async () => {
    // Blockchain tem o hash do valor original (4000000)
    mockGetHash.mockResolvedValue(HASH_ORIGINAL);

    // Banco retorna título com valor alterado para 400000 (R$4.000 — adulteração)
    const tituloAdulterado = { ...TITULO_BASE, valor_centavos: BigInt(400_000) };
    const result = await verifyTituloIntegrity(tituloAdulterado as any);

    expect(result.status).toBe(VerificationStatus.COMPROMISED);
    expect(result.isMatch).toBe(false);
    expect(result.sqlHash).not.toBe(HASH_ORIGINAL);
    expect(result.blockchainHash).toBe(HASH_ORIGINAL);
  });

  it("[T3] COMPROMISED quando cnpj_emissor foi adulterado no banco", async () => {
    mockGetHash.mockResolvedValue(HASH_ORIGINAL);

    const tituloAdulterado = { ...TITULO_BASE, cnpj_emissor: "99999999000100" };
    const result = await verifyTituloIntegrity(tituloAdulterado as any);

    expect(result.status).toBe(VerificationStatus.COMPROMISED);
    expect(result.isMatch).toBe(false);
  });

  it("[T4] COMPROMISED quando data_vencimento foi adulterada no banco", async () => {
    mockGetHash.mockResolvedValue(HASH_ORIGINAL);

    const tituloAdulterado = {
      ...TITULO_BASE,
      data_vencimento: new Date("2030-01-01T00:00:00.000Z"),
    };
    const result = await verifyTituloIntegrity(tituloAdulterado as any);

    expect(result.status).toBe(VerificationStatus.COMPROMISED);
    expect(result.isMatch).toBe(false);
  });

  it("[T5] PENDING quando getHashFromChain retorna null (blockchain inacessível)", async () => {
    mockGetHash.mockResolvedValue(null);

    const result = await verifyTituloIntegrity(TITULO_BASE as any);

    expect(result.status).toBe(VerificationStatus.PENDING);
    expect(result.isMatch).toBe(false);
    expect(result.blockchainHash).toBeNull();
  });

  it("[T6] resultado inclui sqlHash e blockchainHash para comparação forense", async () => {
    const fakeOnChainHash = "a".repeat(64);
    mockGetHash.mockResolvedValue(fakeOnChainHash);

    const result = await verifyTituloIntegrity(TITULO_BASE as any);

    // Ambos os hashes devem estar presentes para auditoria forense
    expect(result.sqlHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.blockchainHash).toBe(fakeOnChainHash);
    expect(result.status).toBe(VerificationStatus.COMPROMISED);
  });

  it("[T7] checkedAt registra a data/hora atual (dentro de 2s da chamada)", async () => {
    mockGetHash.mockResolvedValue(HASH_ORIGINAL);

    const before = new Date();
    const result = await verifyTituloIntegrity(TITULO_BASE as any);
    const after = new Date();

    expect(result.checkedAt).toBeInstanceOf(Date);
    expect(result.checkedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.checkedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

// ===========================================================================
// Suite 2 — verifyBatch
// ===========================================================================
describe("VerificationService — verifyBatch", () => {
  const TITULO_A = { ...TITULO_BASE, id: "aaaaaaaa-0000-0000-0000-000000000001" };
  const TITULO_B = { ...TITULO_BASE, id: "bbbbbbbb-0000-0000-0000-000000000002" };
  const TITULO_C = { ...TITULO_BASE, id: "cccccccc-0000-0000-0000-000000000003" };

  it("[T8] processa múltiplos títulos em paralelo e retorna Map com todos", async () => {
    // Hashes reais para cada título (IDs diferentes → hashes diferentes)
    const hashA = generateHash({ ...TITULO_BASE, id: TITULO_A.id });
    const hashB = generateHash({ ...TITULO_BASE, id: TITULO_B.id });
    const hashC = generateHash({ ...TITULO_BASE, id: TITULO_C.id });

    mockGetHash
      .mockResolvedValueOnce(hashA)
      .mockResolvedValueOnce(hashB)
      .mockResolvedValueOnce(hashC);

    const results = await verifyBatch([TITULO_A, TITULO_B, TITULO_C] as any[]);

    expect(results.size).toBe(3);
    expect(results.get(TITULO_A.id)?.status).toBe(VerificationStatus.VERIFIED);
    expect(results.get(TITULO_B.id)?.status).toBe(VerificationStatus.VERIFIED);
    expect(results.get(TITULO_C.id)?.status).toBe(VerificationStatus.VERIFIED);
  });

  it("[T9] falha individual de RPC resulta em PENDING sem afetar outros itens", async () => {
    const hashA = generateHash({ ...TITULO_BASE, id: TITULO_A.id });
    const hashC = generateHash({ ...TITULO_BASE, id: TITULO_C.id });

    mockGetHash
      .mockResolvedValueOnce(hashA)  // A → VERIFIED
      .mockResolvedValueOnce(null)   // B → null (RPC falhou) → PENDING
      .mockResolvedValueOnce(hashC); // C → VERIFIED

    const results = await verifyBatch([TITULO_A, TITULO_B, TITULO_C] as any[]);

    expect(results.size).toBe(3);
    expect(results.get(TITULO_A.id)?.status).toBe(VerificationStatus.VERIFIED);
    expect(results.get(TITULO_B.id)?.status).toBe(VerificationStatus.PENDING);
    expect(results.get(TITULO_C.id)?.status).toBe(VerificationStatus.VERIFIED);

    // Falha de B não contamina A ou C
    expect(results.get(TITULO_A.id)?.isMatch).toBe(true);
    expect(results.get(TITULO_C.id)?.isMatch).toBe(true);
  });

  it("[T10] rejeição inesperada em verifyTituloIntegrity resulta em PENDING defensivo", async () => {
    // Força rejeição inesperada (ex: generateHash lança por id inválido)
    // Isso cobre o branch 'rejected' do Promise.allSettled (linha 136)
    mockGetHash.mockRejectedValueOnce(new Error("RPC crash inesperado"));

    const tituloInvalido = { ...TITULO_BASE, id: "" }; // id vazio → generateHash lança
    const results = await verifyBatch([tituloInvalido] as any[]);

    expect(results.size).toBe(1);
    expect(results.get("")?.status).toBe(VerificationStatus.PENDING);
    expect(results.get("")?.isMatch).toBe(false);
    expect(results.get("")?.blockchainHash).toBeNull();
  });
});
