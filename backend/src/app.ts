import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { validateEnv, env } from './config/env';

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

// 4. Inicialização do Servidor
app.listen(env.port, () => {
  console.log(`🚀 Backend inicializado na porta ${env.port}`);
});

export default app;
