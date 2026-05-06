import { Router } from 'express';
import { getDashboardStats, getProviders, getPendingProviders, getReviews, getServices, getLoginHistory, getActivityLogs, approveProvider, rejectProvider, approveService, rejectService, updateReviewStatus } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const adminRoutes = Router();

adminRoutes.use(authenticate, authorize(['admin']));

adminRoutes.get('/dashboard-stats', getDashboardStats);
adminRoutes.get('/services', getServices);
adminRoutes.get('/reviews', getReviews);
adminRoutes.get('/login-history', getLoginHistory);
adminRoutes.get('/activity-logs', getActivityLogs);
adminRoutes.get('/providers', getProviders);
adminRoutes.get('/pending-providers', getPendingProviders);
adminRoutes.post('/services/:id/approve', approveService);
adminRoutes.post('/services/:id/reject', rejectService);
adminRoutes.patch('/reviews/:id/status', updateReviewStatus);
adminRoutes.post('/providers/:id/approve', approveProvider);
adminRoutes.post('/providers/:id/reject', rejectProvider);
