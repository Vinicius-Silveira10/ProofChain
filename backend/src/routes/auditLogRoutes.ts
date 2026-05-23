import { Router } from 'express';
import { auditLogController } from '../controllers/auditLogController';
import { authenticate, authorize } from '../middleware/auth';

export const auditLogRoutes = Router();

// Todas as rotas de auditoria requerem autenticação estrita
auditLogRoutes.use(authenticate);

// Barreira de RBAC: Apenas os cargos gerenciais têm acesso a essas trilhas
auditLogRoutes.use(authorize('AUDITOR', 'ADMIN'));

// Rota para Painel de Tabela (Paginado + Filtros)
auditLogRoutes.get('/', auditLogController.getAuditLogs);

// Rota para Timeline de Título individual
auditLogRoutes.get('/titulo/:id', auditLogController.getTituloTimeline);
