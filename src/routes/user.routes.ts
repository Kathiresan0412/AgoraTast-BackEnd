import { Router } from 'express';
import { body } from 'express-validator';
import { updateProfile, updatePassword } from '../controllers/user.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';

export const userRoutes = Router();

userRoutes.put(
  '/profile',
  authenticate,
  [
    body('name').optional().isString(),
    body('profileImage').optional().isString()
  ],
  validateRequest,
  updateProfile
);

userRoutes.put(
  '/password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
  ],
  validateRequest,
  updatePassword
);
