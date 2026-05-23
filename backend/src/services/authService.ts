import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';

export type SafeUser = Omit<User, 'passwordHash'>;

export class AuthService {
  /**
   * Realiza o login do usuário, validando credenciais e retornando um JWT.
   */
  async login(email: string, password: string): Promise<{ token: string; user: SafeUser }> {
    // 1. Buscar usuário por email no PostgreSQL (Prisma).
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 2. Se não encontrado: lançar erro genérico "Credenciais inválidas"
      // (não revelar se o email existe ou não — segurança).
      throw new Error('Credenciais inválidas');
    }

    if (!user.isActive) {
      // 3. Verificar se user.isActive === true. Se não: lançar "Conta desativada".
      throw new Error('Conta desativada');
    }

    // 4. Comparar password com passwordHash via bcrypt.compare.
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // 5. Se não confere: lançar "Credenciais inválidas".
      throw new Error('Credenciais inválidas');
    }

    // 6. Gerar JWT com payload: { sub: user.id, email, role, iat, exp }.
    // expiresIn cuida de 'exp' e 'iat' é inserido por padrão.
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, env.jwtSecret, {
      expiresIn: (process.env.JWT_EXPIRES_IN || '8h') as jwt.SignOptions['expiresIn'],
    });

    // 7. Retornar token e SafeUser (sem passwordHash).
    const { passwordHash, ...safeUser } = user;

    return { token, user: safeUser };
  }
}

export const authService = new AuthService();
