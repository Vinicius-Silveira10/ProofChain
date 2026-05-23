import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { installmentService, CreateInstallmentDTO } from '../services/installmentService';

// Fallback manual temporário para conversão em CSV básico caso o servidor não tenha biblioteca dedicada.
function arrayToCSV(objArray: any[]) {
  if (!objArray || !objArray.length) return '';
  const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
  let str = '';
  let row = '';
  for (let index in objArray[0]) {
    row += index + ',';
  }
  row = row.slice(0, -1);
  str += row + '\r\n';
  for (let i = 0; i < array.length; i++) {
    let line = '';
    for (let index in array[i]) {
      if (line !== '') line += ',';
      let value = array[i][index] !== null ? array[i][index].toString() : '';
      line += `"${value.replace(/"/g, '""')}"`;
    }
    str += line + '\r\n';
  }
  return str;
}

export const installmentController = {
  /**
   * POST /api/titulos/:id/installments
   */
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parcelas: CreateInstallmentDTO[] = req.body;
      const userId = req.user!.id;
      const clientIp = (req.ip || req.connection.remoteAddress || 'unknown') as string;

      const result = await installmentService.createInstallments(id as string, parcelas, userId, clientIp);
      
      // Converte o BigInt para não quebrar o JSON.stringify
      const serializableResult = result.map(r => ({
        ...r,
        valor_centavos: r.valor_centavos.toString()
      }));

      res.status(201).json(serializableResult);
    } catch (error: any) {
      console.error('Error creating installments:', error);
      if (error.message.includes('FINANCIAL_MISMATCH') || error.message.includes('VALIDATION_ERROR') || error.message.includes('CONFLICT')) {
        res.status(422).json({ error: error.message });
      } else if (error.message.includes('NOT_FOUND')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno no servidor ao criar parcelas.' });
      }
    }
  },

  /**
   * GET /api/titulos/:id/installments
   */
  async getByTitulo(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const installments = await prisma.installment.findMany({
        where: { tituloDividaId: id as string },
        orderBy: { numero_parcela: 'asc' },
        include: {
          usuario_pagamento: { select: { name: true, email: true } }
        }
      });

      const serializable = installments.map(i => ({
        ...i,
        valor_centavos: i.valor_centavos.toString()
      }));

      res.status(200).json(serializable);
    } catch (error) {
      console.error('Error fetching installments:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  /**
   * PATCH /api/installments/:id/pay
   */
  async pay(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const clientIp = (req.ip || req.connection.remoteAddress || 'unknown') as string;

      const updated = await installmentService.registerPayment(id as string, userId, clientIp);

      res.status(200).json({
        ...updated,
        valor_centavos: updated.valor_centavos.toString()
      });
    } catch (error: any) {
      console.error('Error registering payment:', error);
      if (error.message.includes('FORBIDDEN')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('NOT_FOUND')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Erro interno no servidor ao processar pagamento.' });
      }
    }
  },

  /**
   * GET /api/titulos/:id/installments/export
   */
  async export(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const clientIp = (req.ip || req.connection.remoteAddress || 'unknown') as string;

      const installments = await prisma.installment.findMany({
        where: { tituloDividaId: id as string },
        orderBy: { numero_parcela: 'asc' },
        include: {
          usuario_pagamento: { select: { name: true } }
        }
      });

      const exportData = installments.map(i => ({
        'Nº Parcela': i.numero_parcela,
        'Valor (R$)': (Number(i.valor_centavos) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        'Vencimento': i.data_vencimento_parcela.toLocaleDateString('pt-BR'),
        'Motivo': i.motivo,
        'Autorizado Por': i.autorizado_por,
        'Status': i.status_parcela,
        'Data/Hora Pagamento': i.data_hora_pagamento ? i.data_hora_pagamento.toLocaleString('pt-BR') : '',
        'Registrado Por': i.usuario_pagamento?.name || ''
      }));

      const csvData = arrayToCSV(exportData);

      // Log de exportação rigoroso
      await prisma.auditLog.create({
        data: {
          tituloDividaId: id as string,
          userId,
          action: 'EXPORT_GENERATED',
          clientIp,
          diff_snapshot: { summary: 'Relatório CSV de parcelas exportado para auditoria.' }
        }
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=parcelas_titulo_${id}.csv`);
      res.status(200).send(Buffer.from('\uFEFF' + csvData)); // BOM para Excel
    } catch (error) {
      console.error('Error exporting installments:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
};
