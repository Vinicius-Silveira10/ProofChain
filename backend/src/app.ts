import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validateEnv, env } from './config/env';
import { swaggerSpec, swaggerUi } from './config/swagger';
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
  max: 1000 // Limite genérico aumentado para não bloquear testes de desenvolvimento
});
app.use(limiter);

// 3. Rotas
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: Date.now()
  });
});

// 3.1 Documentação interativa Swagger UI — disponível em /api/docs
// Exposta em todos os ambientes (exceto produção estrita)
if (env.nodeEnv !== 'production') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'ProofChain API Docs',
    swaggerOptions: {
      persistAuthorization: true,       // mantém o JWT entre recarregamentos
      displayRequestDuration: true,     // mostra tempo de resposta nas chamadas
      filter: true,                     // habilita busca por endpoint
      docExpansion: 'none',             // começa com todos os grupos recolhidos
    },
  }));

  // Endpoint que serve a spec raw em JSON (útil para Insomnia / Postman)
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/titulos', tituloRoutes);
app.use('/api/public/titulos', tituloRoutes); // Permite que a rota pública do frontend funcione sem cair no fallback
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

// ============================================================================
// Task 3: SAFETY NET — Listeners globais de processo
// Garante que o servidor NUNCA derruba silenciosamente por exceções não tratadas.
// ============================================================================

// Captura Promises rejeitadas sem .catch() — ex: chamadas assíncronas sem await
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔴 [SAFETY NET] Unhandled Promise Rejection:', {
    promise,
    reason,
  });
  // NÃO encerra o processo em dev — apenas loga para diagnóstico
  // Em produção, considere: process.exit(1) + restart via PM2/systemd
});

// Captura exceções síncronas que escaparam de todos os try/catch
process.on('uncaughtException', (err) => {
  console.error('🔴 [SAFETY NET] Uncaught Exception — servidor continua:', {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
  });
  // NÃO encerra o processo — o servidor permanece de pé
});

export default app;
