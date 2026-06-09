import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { tituloController } from '../controllers/tituloController';
import { authenticate, authorize } from '../middleware/auth';

export const tituloRoutes = Router();

// Rate limiter público para a rota de verify (100 req/min por IP)
const verifyRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições de verificação. Tente novamente em um minuto.' },
});

/**
 * @swagger
 * /api/titulos/{id}/verify:
 *   get:
 *     summary: Verificação pública de autenticidade (sem autenticação)
 *     description: Compara o SHA-256 atual do título com o hash registrado na blockchain. Acessível globalmente sem JWT.
 *     tags: [Títulos]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do título a ser verificado
 *     responses:
 *       200:
 *         description: Resultado da verificação de integridade
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *       404:
 *         description: Título não encontrado
 *       429:
 *         description: Rate limit atingido (100 req/min por IP)
 */
tituloRoutes.get('/:id/verify', verifyRateLimiter, tituloController.verifyAutenticidade);

/**
 * @swagger
 * /api/titulos:
 *   post:
 *     summary: Emitir novo título de dívida (ancora hash na blockchain)
 *     tags: [Títulos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTituloRequest'
 *     responses:
 *       201:
 *         description: Título emitido e hash ancorado na blockchain com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Titulo'
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado — requer role OPERATOR ou ADMIN
 */
tituloRoutes.post('/', authenticate, authorize('OPERATOR', 'ADMIN'), tituloController.createTitulo);

/**
 * @swagger
 * /api/titulos:
 *   get:
 *     summary: Listar todos os títulos com filtros e paginação
 *     tags: [Títulos]
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
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/TituloStatus'
 *     responses:
 *       200:
 *         description: Lista paginada de títulos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Titulo'
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       401:
 *         description: Não autenticado
 */
tituloRoutes.get('/', authenticate, tituloController.getTitulos);

/**
 * @swagger
 * /api/titulos/{id}:
 *   get:
 *     summary: Obter detalhes completos de um título
 *     tags: [Títulos]
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
 *         description: Detalhes do título
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Titulo'
 *       404:
 *         description: Título não encontrado
 */
tituloRoutes.get('/:id', authenticate, tituloController.getTituloById);

/**
 * @swagger
 * /api/titulos/{id}/verify-now:
 *   post:
 *     summary: Forçar re-verificação on-demand de integridade
 *     description: Dispara uma verificação imediata contra a blockchain, independente do cron de 15 minutos.
 *     tags: [Títulos]
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
 *         description: Resultado da verificação on-demand
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyResponse'
 *       401:
 *         description: Não autenticado
 *       404:
 *         description: Título não encontrado
 */
tituloRoutes.post('/:id/verify-now', authenticate, tituloController.verifyNow);
