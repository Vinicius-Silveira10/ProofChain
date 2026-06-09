import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

export const dashboardRoutes = Router();

// As métricas do Dashboard requerem apenas autenticação base
dashboardRoutes.use(authenticate);

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Obter métricas consolidadas do sistema
 *     description: Retorna KPIs executivos — total de títulos, distribuição por status de integridade, parcelas pendentes e valor total sob gestão.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas consolidadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_titulos:
 *                   type: integer
 *                   example: 42
 *                 titulos_por_status:
 *                   type: object
 *                   properties:
 *                     VERIFIED:    { type: integer }
 *                     COMPROMISED: { type: integer }
 *                     PENDING:     { type: integer }
 *                 total_face_value:
 *                   type: number
 *                   example: 50000000.00
 *                 parcelas_pendentes:
 *                   type: integer
 *       401:
 *         description: Não autenticado
 */
dashboardRoutes.get('/metrics', dashboardController.getMetrics);
