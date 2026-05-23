/**
 * ============================================================================
 * VERIFICATION SERVICE — Motor de Auditoria de Integridade (TASK 04.3)
 * ============================================================================
 *
 * Implementa RN-INV-001: compara o hash recalculado dos dados atuais do
 * PostgreSQL com o hash ancorado imutavelmente na blockchain Sepolia.
 *
 * Regras de negócio:
 *   - blockchainHash === null  → PENDING  (RPC inacessível, não é fraude)
 *   - sqlHash === blockchainHash → VERIFIED (registro íntegro)
 *   - sqlHash !== blockchainHash → COMPROMISED (adulteração detectada)
 *
 * NUNCA lança exceção por falha de RPC — degrada graciosamente para PENDING.
 * ============================================================================
 */

import { generateHash } from "./hashEngine";
import { getHashFromChain } from "./blockchainService";
import type { TituloDivida } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export enum VerificationStatus {
  VERIFIED    = "VERIFIED",
  COMPROMISED = "COMPROMISED",
  PENDING     = "PENDING",
  REMOVED     = "REMOVED",
}

export interface VerificationResult {
  /** Status final da verificação */
  status: VerificationStatus;
  /** Hash SHA-256 recalculado dos dados ATUAIS no PostgreSQL */
  sqlHash: string;
  /** Hash retornado da blockchain — null se inacessível ou não registrado */
  blockchainHash: string | null;
  /** true somente quando ambos os hashes estão presentes e são idênticos */
  isMatch: boolean;
  /** Momento exato da verificação (UTC) */
  checkedAt: Date;
}

// ---------------------------------------------------------------------------
// Verificação individual
// ---------------------------------------------------------------------------

/**
 * Verifica a integridade de um único Título de Dívida.
 *
 * @param titulo - Registro completo do PostgreSQL (todos os campos de hash são obrigatórios)
 * @returns VerificationResult com o status de integridade e os hashes para comparação
 */
export async function verifyTituloIntegrity(
  titulo: TituloDivida
): Promise<VerificationResult> {
  const checkedAt = new Date();

  // 1. Recalcula o hash a partir dos dados ATUAIS no banco.
  //    Se os dados foram adulterados, este hash será diferente do on-chain.
  const sqlHash = generateHash({
    id: titulo.id,
    cnpj_emissor: titulo.cnpj_emissor,
    valor_centavos: titulo.valor_centavos,     // BigInt do Prisma
    data_vencimento: titulo.data_vencimento,   // Date do Prisma
  });

  // 2. Busca o hash ancorado imutavelmente na blockchain.
  //    getHashFromChain() NUNCA lança — retorna null em falha de rede.
  const blockchainHash = await getHashFromChain(titulo.id);

  // 3. Aplica as regras de negócio (RN-INV-001)
  if (blockchainHash === null) {
    // RPC inacessível ou ID não registrado — tratar como inacessível, não fraude
    return {
      status: VerificationStatus.PENDING,
      sqlHash,
      blockchainHash: null,
      isMatch: false,
      checkedAt,
    };
  }

  const isMatch = sqlHash === blockchainHash;

  return {
    status: isMatch ? VerificationStatus.VERIFIED : VerificationStatus.COMPROMISED,
    sqlHash,
    blockchainHash,
    isMatch,
    checkedAt,
  };
}

// ---------------------------------------------------------------------------
// Verificação em lote (cron job RN-INV-001)
// ---------------------------------------------------------------------------

/**
 * Máximo de verificações simultâneas para evitar rate limit do RPC Sepolia.
 * Infura/Alchemy gratuitos permitem ~10 req/s — mantemos margem de segurança.
 */
const BATCH_CONCURRENCY = 10;

/**
 * Verifica múltiplos títulos em paralelo com limite de concorrência.
 * Falhas individuais de RPC resultam em PENDING para aquele item
 * sem afetar os demais.
 *
 * @param titulos - Array de registros completos do PostgreSQL
 * @returns Map de id → VerificationResult
 */
export async function verifyBatch(
  titulos: TituloDivida[]
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();

  // Processa em janelas de BATCH_CONCURRENCY para controlar o rate limit
  for (let i = 0; i < titulos.length; i += BATCH_CONCURRENCY) {
    const chunk = titulos.slice(i, i + BATCH_CONCURRENCY);

    const settled = await Promise.allSettled(
      chunk.map((titulo) => verifyTituloIntegrity(titulo))
    );

    settled.forEach((outcome, idx) => {
      const titulo = chunk[idx];
      if (outcome.status === "fulfilled") {
        results.set(titulo.id, outcome.value);
      } else {
        // Promise.allSettled garante que chegamos aqui apenas em erro
        // inesperado (não de rede — getHashFromChain já trata isso).
        // Marcar como PENDING defensivo.
        results.set(titulo.id, {
          status: VerificationStatus.PENDING,
          sqlHash: "",
          blockchainHash: null,
          isMatch: false,
          checkedAt: new Date(),
        });
      }
    });
  }

  return results;
}
