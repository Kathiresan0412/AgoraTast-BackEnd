import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, googleLogin, getMe } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';

export const authRoutes = Router();

authRoutes.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['customer', 'provider']).withMessage('Role must be customer or provider'),
  ],
  validateRequest,
  register
);

authRoutes.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  login
);

authRoutes.post(
  '/google',
  [
    body('credential').notEmpty().withMessage('Google credential is required'),
    body('role').optional().isIn(['customer', 'provider']).withMessage('Role must be customer or provider'),
  ],
  validateRequest,
  googleLogin
);

authRoutes.get('/me', authenticate, getMe);
