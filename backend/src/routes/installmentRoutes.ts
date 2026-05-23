import { Router } from 'express';
import { installmentController } from '../controllers/installmentController';
import { authenticate, authorize } from '../middleware/auth';

export const installmentRoutes = Router();

// Todas as rotas de parcelas exigem autenticação
installmentRoutes.use(authenticate);

// ==========================================
// Sub-rotas associadas diretamente a um Título
// ==========================================

// Criar plano de parcelas
installmentRoutes.post('/titulos/:id/installments', authorize('OPERATOR', 'ADMIN'), installmentController.create);

// Obter detalhes sensíveis das parcelas (Visão Interna)
installmentRoutes.get('/titulos/:id/installments', authorize('OPERATOR', 'AUDITOR', 'ADMIN'), installmentController.getByTitulo);

// Exportar CSV das parcelas (Apenas Auditores)
installmentRoutes.get('/titulos/:id/installments/export', authorize('AUDITOR', 'ADMIN'), installmentController.export);

// ==========================================
// Rotas operacionais diretas na Parcela
// ==========================================

// Registrar pagamento atômico
installmentRoutes.patch('/installments/:id/pay', authorize('OPERATOR', 'ADMIN'), installmentController.pay);
