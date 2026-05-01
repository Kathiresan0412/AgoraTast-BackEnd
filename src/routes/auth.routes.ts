import { Router } from 'express';
import { body } from 'express-validator';
import { login, getMe } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

authRoutes.get('/me', authenticate, getMe);
