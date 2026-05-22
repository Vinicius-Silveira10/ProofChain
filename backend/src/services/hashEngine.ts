import { createHash } from "node:crypto";

/**
 * ============================================================================
 * HASH ENGINE — Núcleo Criptográfico do ProofChain
 * ============================================================================
 *
 * IMPLEMENTA RN-REC-002. Este módulo é IMUTÁVEL após o primeiro deploy em
 * produção. Qualquer alteração na fórmula invalida TODOS os hashes ancorados
 * historicamente na blockchain, transformando todos os registros em
 * "FRAUDE DETECTADA" no painel público.
 *
 * REGRAS DE INVARIÂNCIA:
 *  1. Os campos são concatenados SEM SEPARADORES.
 *  2. data_vencimento é serializada como ISO-8601 UTC com milissegundos
 *     (ex.: 2025-12-31T00:00:00.000Z).
 *  3. valor_centavos é serializado como string decimal sem zeros à esquerda.
 *  4. id, cnpj_emissor são serializados como-está (sem trim, sem case-fold) —
 *     o backend é responsável por sanitizar ANTES de chamar este módulo.
 *  5. Saída: hex lowercase de 64 caracteres (256 bits).
 *
 * VERSIONAMENTO:
 *  Se um dia a fórmula precisar mudar (ex.: incluir um novo campo), criar
 *  uma função NOVA (hashV2) — JAMAIS modificar esta. Migrar sob nova
 *  estrutura de versão (ver "hash_version" no schema).
 * ============================================================================
 */

export interface TituloDividaHashInput {
  /** UUID v4 gerado pelo backend */
  id: string;
  /** CNPJ apenas dígitos, 14 caracteres */
  cnpj_emissor: string;
  /** Valor em centavos (BigInt ou number — convertido para string decimal) */
  valor_centavos: bigint | number;
  /** Data de vencimento (Date) */
  data_vencimento: Date;
}

/**
 * Versão atual da fórmula de hash. Persistir junto ao registro em
 * `hash_version` permite migração futura segura.
 */
export const HASH_VERSION = 1;

/**
 * Gera o hash SHA-256 hex (64 chars lowercase) de um Título de Dívida.
 *
 * @throws Error se algum campo for inválido (fail-fast antes de gastar gas).
 */
export function generateHash(input: TituloDividaHashInput): string {
  assertValidInput(input);

  const valorStr = normalizeValor(input.valor_centavos);
  const dataIso = normalizeData(input.data_vencimento);

  const payload =
    input.id + input.cnpj_emissor + valorStr + dataIso;

  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Converte o hash hex (64 chars) para bytes32 (formato esperado pelo contrato).
 * Adiciona o prefixo "0x" para compatibilidade com ethers.js.
 */
export function hashToBytes32(hexHash: string): `0x${string}` {
  if (!/^[a-f0-9]{64}$/.test(hexHash)) {
    throw new Error(`Invalid hash format: expected 64 lowercase hex chars`);
  }
  return `0x${hexHash}` as `0x${string}`;
}

/**
 * Compara dois hashes em tempo constante (defesa contra timing attacks
 * em contextos de verificação de autenticidade).
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ============================================================================
// HELPERS PRIVADOS — não exportados
// ============================================================================

function assertValidInput(input: TituloDividaHashInput): void {
  if (!input || typeof input !== "object") {
    throw new Error("hashEngine: input must be an object");
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new Error("hashEngine: id must be a non-empty string");
  }
  if (typeof input.cnpj_emissor !== "string" || !/^\d{14}$/.test(input.cnpj_emissor)) {
    throw new Error("hashEngine: cnpj_emissor must be exactly 14 digits");
  }
  if (
    typeof input.valor_centavos !== "bigint" &&
    typeof input.valor_centavos !== "number"
  ) {
    throw new Error("hashEngine: valor_centavos must be bigint or number");
  }
  const valor = BigInt(input.valor_centavos);
  if (valor <= 0n) {
    throw new Error("hashEngine: valor_centavos must be > 0 (RN-REC-001)");
  }
  if (valor > 99_999_999_999_999n) {
    throw new Error("hashEngine: valor_centavos exceeds maximum (R$ 999.999.999.999,99)");
  }
  if (!(input.data_vencimento instanceof Date) || isNaN(input.data_vencimento.getTime())) {
    throw new Error("hashEngine: data_vencimento must be a valid Date");
  }
}

function normalizeValor(v: bigint | number): string {
  // BigInt.toString() e Number.toString() produzem decimais sem zeros à esquerda — OK.
  return BigInt(v).toString(10);
}

function normalizeData(d: Date): string {
  // toISOString() já produz o formato com milissegundos em UTC com sufixo Z.
  // Ex.: "2025-12-31T00:00:00.000Z"
  return d.toISOString();
}
