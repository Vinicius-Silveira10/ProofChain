import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

interface ProofChainJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 1. Extrair token do header: Authorization: Bearer <token>.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 2. Se ausente: retornar HTTP 401
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // 3. Verificar token com jwt.verify(token, JWT_SECRET).
    let decoded: ProofChainJwtPayload;
    try {
      decoded = jwt.verify(token, env.jwtSecret) as ProofChainJwtPayload;
    } catch (err) {
      // 4. Se inválido ou expirado: HTTP 401
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    // 5. Buscar user no banco pelo sub do payload
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub as string }
    });

    if (!user || !user.isActive) {
      // evitar tokens de usuários desativados ou deletados
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }

    // 6. Anexar req.user
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    next();
  };
};
