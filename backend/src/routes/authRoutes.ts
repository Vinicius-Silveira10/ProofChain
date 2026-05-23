import { Router } from 'express';
import { authController, loginLimiter } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

export const authRoutes = Router();

// Endpoint público com rate limiting rigoroso
authRoutes.post('/login', loginLimiter, authController.login);

// Endpoint protegido
authRoutes.get('/me', authenticate, authController.me);
