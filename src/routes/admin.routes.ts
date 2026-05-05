import { Router } from 'express';
import { getDashboardStats, getProviders, getPendingProviders, getServices, approveProvider, rejectProvider, approveService, rejectService } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize(['admin']));

adminRoutes.get('/dashboard-stats', getDashboardStats);
adminRoutes.get('/services', getServices);
adminRoutes.get('/providers', getProviders);
adminRoutes.get('/pending-providers', getPendingProviders);
adminRoutes.post('/services/:id/approve', approveService);
adminRoutes.post('/services/:id/reject', rejectService);
adminRoutes.post('/providers/:id/approve', approveProvider);
adminRoutes.post('/providers/:id/reject', rejectProvider);
