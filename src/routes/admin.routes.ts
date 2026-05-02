import { Router } from 'express';
import { getDashboardStats, getProviders, getPendingProviders, approveProvider, rejectProvider } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize(['admin']));

adminRoutes.get('/dashboard-stats', getDashboardStats);
adminRoutes.get('/providers', getProviders);
adminRoutes.get('/pending-providers', getPendingProviders);
adminRoutes.post('/providers/:id/approve', approveProvider);
adminRoutes.post('/providers/:id/reject', rejectProvider);
