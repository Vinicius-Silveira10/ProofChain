import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

export const auditLogController = {
  /**
   * GET /api/audit-logs
   * Retorna logs globais com paginação e múltiplos filtros estruturais.
   * Acesso exclusivo para AUDITOR e ADMIN (já filtrado pelo middleware)
   */
  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, parseInt(req.query.limit as string) || 50);
      const skip = (page - 1) * limit;

      const tituloDividaId = req.query.tituloDividaId as string;
      const action = req.query.action as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const whereClause: Prisma.AuditLogWhereInput = {};

      if (tituloDividaId) {
        whereClause.tituloDividaId = tituloDividaId;
      }

      if (action) {
        whereClause.action = action as any;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) {
          const parsedStart = new Date(startDate);
          if (!isNaN(parsedStart.getTime())) whereClause.timestamp.gte = parsedStart;
        }
        if (endDate) {
          const parsedEnd = new Date(endDate);
          if (!isNaN(parsedEnd.getTime())) whereClause.timestamp.lte = parsedEnd;
        }
      }

      const logs = await prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { name: true, email: true, role: true } },
          tituloDivida: { select: { id: true, credor: true } }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.auditLog.count({ where: whereClause });

      res.status(200).json({
        data: logs,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },

  /**
   * GET /api/audit-logs/titulo/:id
   * Retorna o histórico forense completo de um único Título de Dívida.
   * Usado para rastrear a cadeia de custódia desde a emissão até o momento atual.
   */
  async getTituloTimeline(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const logs = await prisma.auditLog.findMany({
        where: { tituloDividaId: id as string },
        include: {
          user: { select: { name: true, email: true, role: true } }
        },
        orderBy: { timestamp: 'asc' }, // Timeline cresce do mais antigo pro mais novo
      });

      // Aplica regra de negócio visual: Identificar quebras de integridade
      const timeline = logs.map(log => ({
        ...log,
        isForensic: log.action === 'INTEGRITY_BREACH_DETECTED'
      }));

      res.status(200).json(timeline);
    } catch (error) {
      console.error('Error fetching titulo timeline:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }
};
