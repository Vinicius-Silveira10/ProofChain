import { prisma } from '../config/prisma';

export interface CreateInstallmentDTO {
  numero_parcela: number;
  valor_centavos: bigint | string | number;
  data_vencimento_parcela: string | Date;
  motivo: string;
  autorizado_por: string;
}

export const installmentService = {
  /**
   * RN-PAG-001 / RN-PAG-002: Criação de Parcelas
   * Somente pode ser criado uma vez. Deve bater com o valor total do Título (centavos).
   */
  async createInstallments(tituloDividaId: string, parcelas: CreateInstallmentDTO[], userId: string, clientIp: string) {
    const titulo = await prisma.tituloDivida.findUnique({
      where: { id: tituloDividaId },
      include: { installments: true }
    });

    if (!titulo) {
      throw new Error('NOT_FOUND: Título de dívida inexistente.');
    }

    if (titulo.status !== 'ACTIVE') {
      throw new Error('INVALID_STATE: Só é possível criar parcelas em títulos ativos.');
    }

    if (titulo.installments && titulo.installments.length > 0) {
      throw new Error('CONFLICT: Este título já possui parcelas cadastradas.');
    }

    // Ordenar para garantir a sequência e prevenir gaps
    const sortedParcelas = [...parcelas].sort((a, b) => a.numero_parcela - b.numero_parcela);
    let somaCentavos = BigInt(0);

    for (let i = 0; i < sortedParcelas.length; i++) {
      const p = sortedParcelas[i];
      if (p.numero_parcela !== i + 1) {
        throw new Error(`VALIDATION_ERROR: Numeração das parcelas inválida ou com gaps. Faltou a parcela ${i + 1}.`);
      }
      
      const pMotivo = p.motivo?.trim() || '';
      if (pMotivo.length < 10 || pMotivo.length > 500) {
        throw new Error(`VALIDATION_ERROR: O motivo da parcela ${p.numero_parcela} deve conter entre 10 e 500 caracteres.`);
      }

      if (!p.autorizado_por || p.autorizado_por.trim() === '') {
        throw new Error(`VALIDATION_ERROR: O campo autorizado_por é obrigatório na parcela ${p.numero_parcela}.`);
      }

      somaCentavos += BigInt(p.valor_centavos);
    }

    // Auditoria Matemática rigorosa
    if (somaCentavos !== titulo.valor_centavos) {
      const diffReais = (Number(titulo.valor_centavos - somaCentavos) / 100).toFixed(2);
      throw new Error(`FINANCIAL_MISMATCH: A soma das parcelas diverge do valor total do título. Diferença detectada: R$ ${diffReais}.`);
    }

    // Persistência Atômica
    const result = await prisma.$transaction(async (tx) => {
      const createdInstallments = [];

      for (const p of sortedParcelas) {
        const inst = await tx.installment.create({
          data: {
            tituloDividaId,
            numero_parcela: p.numero_parcela,
            valor_centavos: BigInt(p.valor_centavos),
            data_vencimento_parcela: new Date(p.data_vencimento_parcela),
            motivo: p.motivo,
            autorizado_por: p.autorizado_por,
            status_parcela: 'PENDENTE',
            data_hora_pagamento: null,
            usuario_pagamento_id: null
          }
        });
        createdInstallments.push(inst);
      }

      // Log Consolidador da Fração Financeira
      await tx.auditLog.create({
        data: {
          tituloDividaId,
          userId,
          action: 'INSERT',
          clientIp,
          diff_snapshot: { summary: `${sortedParcelas.length} parcelas criadas.` }
        }
      });

      return createdInstallments;
    });

    return result;
  },

  /**
   * RN-PAG-003 / RN-PAG-004: Registro de Pagamento
   * Data gerada pelo servidor (nunca do payload). User ID extraído do JWT (nunca do payload).
   */
  async registerPayment(installmentId: string, userId: string, clientIp: string) {
    const installment = await prisma.installment.findUnique({
      where: { id: installmentId },
      include: { tituloDivida: true }
    });

    if (!installment) {
      throw new Error('NOT_FOUND: Parcela não encontrada.');
    }

    if (installment.status_parcela === 'PAGO') {
      throw new Error('FORBIDDEN: Esta parcela já encontra-se paga e não pode ser re-processada.');
    }

    if (installment.status_parcela === 'CANCELADO') {
      throw new Error('FORBIDDEN: Não é possível registrar pagamento em uma parcela cancelada.');
    }

    const currentServerTime = new Date(); // Timestamp exato gerado pelo Node.js e inalterável pelo client

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.installment.update({
        where: { id: installmentId },
        data: {
          status_parcela: 'PAGO',
          data_hora_pagamento: currentServerTime,
          usuario_pagamento_id: userId
        }
      });

      await tx.auditLog.create({
        data: {
          tituloDividaId: installment.tituloDividaId,
          userId,
          action: 'PAYMENT_REGISTERED',
          clientIp,
          diff_snapshot: { 
            before: { status: installment.status_parcela, data_pagamento: installment.data_hora_pagamento },
            after: { status: 'PAGO', data_pagamento: currentServerTime }
          }
        }
      });

      return updated;
    });

    return result;
  }
};
