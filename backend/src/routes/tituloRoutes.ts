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

// Endpoint Público de Verificação (DEMO)
tituloRoutes.get('/:id/verify', verifyRateLimiter, tituloController.verifyAutenticidade);

// Emissão: apenas roles autorizados
tituloRoutes.post('/', authenticate, authorize('OPERATOR', 'ADMIN'), tituloController.createTitulo);

// Listagem e detalhes: qualquer role autenticada
tituloRoutes.get('/', authenticate, tituloController.getTitulos);
tituloRoutes.get('/:id', authenticate, tituloController.getTituloById);
