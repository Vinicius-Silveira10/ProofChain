import { Request, Response } from 'express';
import { authService } from '../services/authService';
import rateLimit from 'express-rate-limit';
import { AuthRequest } from '../middleware/auth';

// Limiter específico para a rota de login: 5 tentativas a cada 15 min.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente após 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authController = {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Validação de formato (fail-fast, não vai nem pro banco)
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const { token, user } = await authService.login(email, password);

      res.status(200).json({
        token,
        user,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Conta desativada') {
        res.status(403).json({ error: 'Conta desativada' });
        return;
      }
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  },

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }
      res.status(200).json(req.user);
    } catch (error) {
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  },
};
