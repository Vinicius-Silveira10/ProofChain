import { PrismaClient, Prisma, TituloStatus, IntegrityStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { generateHash } from "./hashEngine";
import { BlockchainService, BlockchainError } from "./blockchainService";

/**
 * ============================================================================
 * TÍTULO DE DÍVIDA — SERVICE
 * ============================================================================
 *
 * Implementa a sequência atômica RN-REC-003.
 *
 * Fluxo Acordado:
 * 1. Validar Input.
 * 2. Gerar ID + Calcular Hash.
 * 3. Ancorar na Blockchain (Sepolia) ANTES do SQL.
 * 4. Inserir no PostgreSQL + AuditLog em transação única.
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

    // ---------------- PASSO 3: ancoragem (blockchain-first) ----------------
    let txHash: string;
    let etherscanUrl: string;
    
    try {
      // Se a blockchain falhar ou der timeout, nada vai para o banco.
      const anchor = await this.blockchain.anchorHash(id, hash);
      txHash = anchor.txHash;
      etherscanUrl = `https://sepolia.etherscan.io/tx/${txHash}`;
    } catch (err: unknown) {
      if (err instanceof BlockchainError && err.code === 'TIMEOUT') {
        throw new Error('BLOCKCHAIN_TIMEOUT');
      }
      throw new Error('BLOCKCHAIN_ERROR');
    }

    // ---------------- PASSO 4: Persistência SQL (apenas após sucesso na blockchain) ----------------
    try {
      const titulo = await this.prisma.$transaction(async (tx) => {
        const newTitulo = await tx.tituloDivida.create({
          data: {
            id,
            cnpj_emissor: input.cnpj_emissor,
            credor: input.credor,
            valor_centavos: input.valor_centavos,
            data_vencimento: input.data_vencimento,
            hash_integridade: hash,
            tx_hash: txHash,
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
              after: serializeForAudit(newTitulo) as any,
            } as Prisma.InputJsonValue,
          },
        });

        return newTitulo;
      });

      return {
        ...titulo,
        etherscan_url: etherscanUrl,
        valor_centavos: titulo.valor_centavos.toString(),
      };
    } catch (error) {
      // Se a transação falhar: o hash já está na blockchain mas sem registro SQL.
      // Logar o erro com id e tx_hash para recuperação manual.
      console.error(`🚨 ALERTA CRÍTICO: Falha ao inserir Titulo no SQL após ancoragem na Blockchain!`, {
        id,
        tx_hash: txHash,
        error
      });
      throw new Error('FATAL_SQL_ERROR');
    }
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

function serializeForAudit(t: { valor_centavos: bigint } & Record<string, unknown>) {
  return { ...t, valor_centavos: t.valor_centavos.toString() };
}
