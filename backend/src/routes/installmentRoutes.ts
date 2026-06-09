import { Router } from 'express';
import { installmentController } from '../controllers/installmentController';
import { authenticate, authorize } from '../middleware/auth';

export const installmentRoutes = Router();

// Todas as rotas de parcelas exigem autenticação
installmentRoutes.use(authenticate);

/**
 * @swagger
 * /api/titulos/{id}/installments:
 *   post:
 *     summary: Criar plano de parcelas para um título
 *     tags: [Parcelas]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [installments]
 *             properties:
 *               installments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [due_date, amount]
 *                   properties:
 *                     due_date:
 *                       type: string
 *                       format: date
 *                     amount:
 *                       type: number
 *     responses:
 *       201:
 *         description: Plano de parcelas criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Installment'
 *       403:
 *         description: Acesso negado — requer role OPERATOR ou ADMIN
 */
installmentRoutes.post('/titulos/:id/installments', authorize('OPERATOR', 'ADMIN'), installmentController.create);

/**
 * @swagger
 * /api/titulos/{id}/installments:
 *   get:
 *     summary: Listar parcelas de um título (Visão Interna)
 *     tags: [Parcelas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Lista de parcelas com dados financeiros detalhados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Installment'
 *       403:
 *         description: Acesso negado — requer role OPERATOR, AUDITOR ou ADMIN
 */
installmentRoutes.get('/titulos/:id/installments', authorize('OPERATOR', 'AUDITOR', 'ADMIN'), installmentController.getByTitulo);

/**
 * @swagger
 * /api/titulos/{id}/installments/export:
 *   get:
 *     summary: Exportar extrato de parcelas em CSV
 *     tags: [Parcelas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Arquivo CSV com o extrato das parcelas
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Acesso negado — requer role AUDITOR ou ADMIN
 */
installmentRoutes.get('/titulos/:id/installments/export', authorize('AUDITOR', 'ADMIN'), installmentController.export);

/**
 * @swagger
 * /api/installments/{id}/pay:
 *   patch:
 *     summary: Registrar pagamento atômico de uma parcela
 *     tags: [Parcelas]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da parcela
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paid_amount]
 *             properties:
 *               paid_amount:
 *                 type: number
 *                 example: 5250.00
 *     responses:
 *       200:
 *         description: Pagamento registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Installment'
 *       403:
 *         description: Acesso negado — requer role OPERATOR ou ADMIN
 *       404:
 *         description: Parcela não encontrada
 */
installmentRoutes.patch('/installments/:id/pay', authorize('OPERATOR', 'ADMIN'), installmentController.pay);
