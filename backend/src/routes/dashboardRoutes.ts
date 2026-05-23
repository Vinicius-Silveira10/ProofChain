import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/auth';

export const dashboardRoutes = Router();

// As métricas do Dashboard requerem apenas autenticação base
dashboardRoutes.use(authenticate);

// Rota agregadora master
dashboardRoutes.get('/metrics', dashboardController.getMetrics);
