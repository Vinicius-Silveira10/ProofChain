import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validateEnv, env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { tituloRoutes } from './routes/tituloRoutes';
import { auditLogRoutes } from './routes/auditLogRoutes';
import { installmentRoutes } from './routes/installmentRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';
import { integrityScanner } from './jobs/integrityScanner';

// 1. Validar variáveis de ambiente (crash-fast)
validateEnv();

const app = express();

// 2. Middlewares globais
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // Limite genérico
});
app.use(limiter);

// 3. Rotas
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/titulos', tituloRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api', installmentRoutes); // Mapeado na raiz pois contém '/titulos/:id/installments' e '/installments/:id'
app.use('/api/dashboard', dashboardRoutes);

// 4. Iniciar Oráculo (Cron Jobs)
integrityScanner.start();

// 5. Inicialização do Servidor (Evita abrir porta durante os testes)
if (require.main === module) {
  app.listen(env.port, () => {
    console.log(`🚀 Backend inicializado na porta ${env.port}`);
  });
}

export default app;
