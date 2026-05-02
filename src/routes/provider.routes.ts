import { Router } from 'express';
import { body } from 'express-validator';
import { getDashboardStats, getBookingRequests, getProviderServices, createProviderService } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const providerRoutes = Router();

providerRoutes.use(authenticate, authorize(['provider']));

providerRoutes.get('/dashboard-stats', getDashboardStats);
providerRoutes.get('/booking-requests', getBookingRequests);
providerRoutes.get('/services', getProviderServices);
providerRoutes.post(
  '/services',
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('base_price').optional({ nullable: true }).isNumeric(),
    body('price_type').optional().isIn(['fixed', 'hourly', 'quote']),
    body('duration_mins').optional({ nullable: true }).isInt({ min: 1 }),
    body('service_area').optional().isArray(),
    body('images').optional().isArray(),
    body('status').optional().isIn(['draft', 'active', 'paused', 'pending_review', 'rejected']),
    body('service_type_ids').isArray({ min: 1 }).withMessage('Select at least one service type'),
    body('service_type_ids.*').isUUID().withMessage('Service type ids must be valid UUIDs'),
  ],
  validateRequest,
  createProviderService
);
