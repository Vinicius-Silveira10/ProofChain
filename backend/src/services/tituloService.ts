import { PrismaClient, Prisma, TituloStatus, IntegrityStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { generateHash } from "./hashEngine";
import { BlockchainService, BlockchainError } from "./blockchainService";

/**
 * ============================================================================
 * TÍTULO DE DÍVIDA — SERVICE
 * ============================================================================
 *
 * Implementa a sequência atômica RN-REC-003 — o ponto mais crítico do sistema.
 *
 * SEQUÊNCIA CORRETA (e por que cada passo está nessa ordem):
 *
 *   1. Validar input
 *        → fail-fast antes de gastar gás na rede.
 *
 *   2. Gerar UUID + calcular hash
 *        → operações puras, sem efeitos colaterais.
 *
 *   3. Pré-inserir registro com status='PENDING_ANCHOR' (outbox pattern)
 *        → permite recovery se o backend crashar entre passo 4 e 5.
 *
 *   4. Ancorar na blockchain (com timeout de 60s)
 *        → se falhar: atualizar registro para status='ERROR' (NUNCA deletar —
 *          RN-AJU-001).
 *
 *   5. Atualizar registro para status='ACTIVE' com tx_hash
 *        → única transição que torna o registro publicamente válido.
 *
 *   6. Registrar AuditLog
 *        → na MESMA transação Prisma do passo 5.
 *
 * POR QUE NÃO "BLOCKCHAIN PRIMEIRO, DEPOIS SQL"?
 *   Porque se a tx confirmar e o servidor crashar antes de salvar no SQL,
 *   ficamos com um hash órfão on-chain (gás queimado + estado inconsistente).
 *   O outbox-pattern resolve isso: a linha no SQL existe ANTES de gastar gás,
 *   então no pior caso temos uma linha em status='ERROR' (visível para retry),
 *   nunca um hash órfão.
 *
 * POR QUE NÃO "SQL PRIMEIRO, DEPOIS BLOCKCHAIN"?
 *   Porque a spec exige que registros visíveis publicamente tenham tx_hash
 *   válido (RN-ARM-001). Por isso o status='PENDING_ANCHOR' é INVISÍVEL na
 *   listagem pública (filtro: status='ACTIVE').
 * ============================================================================
 */

export interface CreateTituloInput {
  cnpj_emissor: string;
  credor: string;
  valor_centavos: bigint;
  data_vencimento: Date;
}

export interface AuditContext {
  userId: string;
  clientIp: string;
}

export class TituloService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly blockchain: BlockchainService
  ) {}

  async create(input: CreateTituloInput, ctx: AuditContext) {
    // ---------------- PASSO 1: validação ----------------
    this.validateInput(input);
    this.assertContext(ctx);

    // ---------------- PASSO 2: id + hash ----------------
    const id = randomUUID();
    const hash = generateHash({
      id,
      cnpj_emissor: input.cnpj_emissor,
      valor_centavos: input.valor_centavos,
      data_vencimento: input.data_vencimento,
    });

    // ---------------- PASSO 3: outbox row ----------------
    // Persistimos uma "intenção" antes de gastar gás. Se algo der errado
    // adiante, esta linha vira evidência de falha (status='ERROR'), não
    // um hash órfão na blockchain.
    await this.prisma.tituloDivida.create({
      data: {
        id,
        cnpj_emissor: input.cnpj_emissor,
        credor: input.credor,
        valor_centavos: input.valor_centavos,
        data_vencimento: input.data_vencimento,
        hash_integridade: hash,
        tx_hash: null,
        status: TituloStatus.ERROR, // até confirmar on-chain, é "ERROR" — invisível ao público
        integrity_status: IntegrityStatus.PENDING,
      },
    });

    // ---------------- PASSO 4: ancoragem ----------------
    let anchor;
    try {
      anchor = await this.blockchain.anchorHash(id, hash);
    } catch (err) {
      // Mantemos a linha em status='ERROR' para auditoria / retry futuro.
      // Não relançamos sem contexto — embrulhamos com mensagem útil.
      const code = err instanceof BlockchainError ? err.code : "UNKNOWN";
      throw new TituloCreationError(
        `Blockchain anchoring failed (${code}): ${(err as Error).message}`,
        { id, hash }
      );
    }

    // ---------------- PASSOS 5 + 6: ativação + audit (atômicos) ----------------
    const titulo = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tituloDivida.update({
        where: { id },
        data: {
          tx_hash: anchor.txHash,
          status: TituloStatus.ACTIVE,
          integrity_status: IntegrityStatus.VERIFIED,
        },
      });

      await tx.auditLog.create({
        data: {
          tituloDividaId: id,
          userId: ctx.userId,
          action: "INSERT",
          clientIp: ctx.clientIp,
          diff_snapshot: {
            before: null,
            after: serializeForAudit(updated),
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });

    return {
      ...titulo,
      valor_centavos: titulo.valor_centavos.toString(), // BigInt-safe JSON
    };
  }

  /**
   * Reanchoragem de registros em status='ERROR' (recovery após falha).
   * Idempotente: se o id já estiver ancorado on-chain, completa o registro.
   */
  async retryAnchor(id: string, ctx: AuditContext) {
    this.assertContext(ctx);

    const titulo = await this.prisma.tituloDivida.findUniqueOrThrow({ where: { id } });
    if (titulo.status === TituloStatus.ACTIVE) {
      throw new TituloCreationError(`Titulo ${id} is already ACTIVE`, { id });
    }

    const anchor = await this.blockchain.anchorHash(id, titulo.hash_integridade);

    return await this.prisma.$transaction(async (tx) => {
      const updated = await tx.tituloDivida.update({
        where: { id },
        data: {
          tx_hash: anchor.txHash,
          status: TituloStatus.ACTIVE,
          integrity_status: IntegrityStatus.VERIFIED,
        },
      });

      await tx.auditLog.create({
        data: {
          tituloDividaId: id,
          userId: ctx.userId,
          action: "STATUS_CHANGE",
          clientIp: ctx.clientIp,
          diff_snapshot: {
            before: { status: titulo.status, tx_hash: titulo.tx_hash },
            after: { status: updated.status, tx_hash: updated.tx_hash },
          } as Prisma.InputJsonValue,
        },
      });

      return updated;
    });
  }

  // --------------------------------------------------------------------
  // VALIDAÇÕES
  // --------------------------------------------------------------------

  private validateInput(input: CreateTituloInput): void {
    if (!/^\d{14}$/.test(input.cnpj_emissor)) {
      throw new ValidationError("cnpj_emissor must be exactly 14 digits");
    }
    if (!isValidCnpj(input.cnpj_emissor)) {
      throw new ValidationError("cnpj_emissor checksum invalid");
    }
    if (typeof input.credor !== "string" || input.credor.length < 3 || input.credor.length > 200) {
      throw new ValidationError("credor must be 3–200 chars");
    }
    if (input.valor_centavos <= 0n) {
      throw new ValidationError("valor_centavos must be > 0");
    }
    if (input.valor_centavos > 99_999_999_999_999n) {
      throw new ValidationError("valor_centavos exceeds R$ 999.999.999.999,99");
    }
    if (!(input.data_vencimento instanceof Date) || isNaN(input.data_vencimento.getTime())) {
      throw new ValidationError("data_vencimento must be a valid Date");
    }
    if (input.data_vencimento.getTime() <= Date.now()) {
      throw new ValidationError("data_vencimento must be in the future");
    }
  }

  private assertContext(ctx: AuditContext): void {
    if (!ctx?.userId) throw new ValidationError("userId is required for audit logging");
    if (!ctx?.clientIp) throw new ValidationError("clientIp is required for audit logging");
  }
}

// ============================================================================
// CNPJ checksum (RN-REC-001)
// ============================================================================

export function isValidCnpj(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj)) return false;
  // Rejeita sequências repetidas (00000000000000, 11111111111111, ...)
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const calcDigit = (slice: number[], weights: number[]) => {
    const sum = slice.reduce((acc, d, i) => acc + d * weights[i], 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits.slice(0, 12), w1);
  if (d1 !== digits[12]) return false;
  const d2 = calcDigit(digits.slice(0, 13), w2);
  return d2 === digits[13];
}

// ============================================================================
// ERROS TIPADOS
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class TituloCreationError extends Error {
  constructor(message: string, public readonly meta: Record<string, unknown>) {
    super(message);
    this.name = "TituloCreationError";
  }
}

// BigInt-safe serializer para JSON do AuditLog
function serializeForAudit(t: { valor_centavos: bigint } & Record<string, unknown>) {
  return { ...t, valor_centavos: t.valor_centavos.toString() };
}
