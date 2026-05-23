import { Request } from 'express';
import { prisma } from '../config/prisma';
import { AuditAction, Prisma } from '@prisma/client';

// Prisma é importado no topo para uso do enum AuditAction e do namespace Prisma

export interface AuditLogParams {
  tituloDividaId: string;
  userId: string;
  action: AuditAction;
  clientIp: string;
  diffSnapshot?: { before: Prisma.InputJsonObject; after: Prisma.InputJsonObject };
  /**
   * Prisma Transaction Client. Se fornecido, garante atomicidade
   * junto com a operação principal (ex: insert de titulo e insert de log na mesma tx).
   */
  tx?: Prisma.TransactionClient;
}

/**
 * Cria um registro de auditoria no sistema.
 * Segue a Task 05.3 garantindo que userId é obrigatório.
 */
export const createAuditLog = async (params: AuditLogParams): Promise<void> => {
  if (!params.userId) {
    throw new Error('userId is required for audit logging');
  }

  const client = params.tx || prisma;

  await client.auditLog.create({
    data: {
      tituloDividaId: params.tituloDividaId,
      userId: params.userId,
      action: params.action,
      clientIp: params.clientIp,
      diff_snapshot: params.diffSnapshot || Prisma.JsonNull,
    },
  });
};

/**
 * Utilitário para extrair o IP do cliente da requisição.
 * Avalia o header X-Forwarded-For, essencial para proxies reversos (NGINX/AWS).
 */
export const extractClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};
