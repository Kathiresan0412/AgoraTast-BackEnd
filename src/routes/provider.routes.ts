import { Router } from 'express';
import { getDashboardStats, getBookingRequests } from '../controllers/provider.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const providerRoutes = Router();

providerRoutes.use(authenticate, authorize(['provider']));

providerRoutes.get('/dashboard-stats', getDashboardStats);
providerRoutes.get('/booking-requests', getBookingRequests);
