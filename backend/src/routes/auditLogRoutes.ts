import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController';
import { authenticate, authorize } from '../middleware/auth';

export const auditLogRoutes = Router();

// Todas as rotas de auditoria requerem autenticação estrita
auditLogRoutes.use(authenticate);

// Barreira de RBAC: Apenas os cargos gerenciais têm acesso a essas trilhas
auditLogRoutes.use(authorize('AUDITOR', 'ADMIN'));

/**
 * @swagger
 * /api/audit-logs:
 *   get:
 *     summary: Listar logs de auditoria com paginação e filtros
 *     description: Trilha forense completa de todas as operações realizadas no sistema. Acesso restrito a AUDITOR e ADMIN.
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           example: CREATE_TITULO
 *       - in: query
 *         name: entity_type
 *         schema:
 *           type: string
 *           example: Titulo
 *     responses:
 *       200:
 *         description: Lista paginada de logs de auditoria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditLog'
 *                 total:
 *                   type: integer
 *       403:
 *         description: Acesso negado — requer role AUDITOR ou ADMIN
 */
auditLogRoutes.get('/', auditLogController.getAuditLogs);

/**
 * @swagger
 * /api/audit-logs/titulo/{id}:
 *   get:
 *     summary: Obter timeline forense de um título específico
 *     description: Retorna todos os eventos de auditoria relacionados a um título, ordenados cronologicamente com diff antes/depois.
 *     tags: [Audit Logs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do título
 *     responses:
 *       200:
 *         description: Timeline de auditoria do título
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AuditLog'
 *       403:
 *         description: Acesso negado — requer role AUDITOR ou ADMIN
 *       404:
 *         description: Título não encontrado
 */
auditLogRoutes.get('/titulo/:id', auditLogController.getTituloTimeline);
