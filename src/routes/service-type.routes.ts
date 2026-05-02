import { Router } from 'express';
import { body } from 'express-validator';
import { getServiceTypes, createServiceType, updateServiceType, toggleServiceTypeStatus, deleteServiceType } from '../controllers/service-type.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const serviceTypeRoutes = Router();

// Publicly accessible but logic filters out inactive ones unless admin (handled in controller)
serviceTypeRoutes.get('/', authenticate, getServiceTypes);

// Only admins can modify
serviceTypeRoutes.post(
  '/',
  authenticate,
  authorize(['admin']),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('parent_id').optional({ nullable: true }).isUUID().withMessage('Parent id must be a valid UUID'),
    body('slug').optional().isString(),
    body('description').optional().isString(),
    body('icon').optional().isString(),
    body('color').optional().isString(),
    body('active').optional().isBoolean(),
    body('sort_order').optional().isInt()
  ],
  validateRequest,
  createServiceType
);

serviceTypeRoutes.put(
  '/:id',
  authenticate,
  authorize(['admin']),
  [
    body('parent_id').optional({ nullable: true }).isUUID().withMessage('Parent id must be a valid UUID'),
    body('slug').optional().isString(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('icon').optional().isString(),
    body('color').optional().isString(),
    body('sort_order').optional().isInt()
  ],
  validateRequest,
  updateServiceType
);

serviceTypeRoutes.patch(
  '/:id/status',
  authenticate,
  authorize(['admin']),
  [
    body('active').isBoolean().withMessage('Active status must be a boolean')
  ],
  validateRequest,
  toggleServiceTypeStatus
);

serviceTypeRoutes.delete('/:id', authenticate, authorize(['admin']), deleteServiceType);
