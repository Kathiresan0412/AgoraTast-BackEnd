import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import './types';

import { authRoutes }     from './routes/auth.routes';
import { tenantRoutes }   from './routes/tenant.routes';
import { serviceRoutes }  from './routes/service.routes';
import { bookingRoutes }  from './routes/booking.routes';
import { reviewRoutes }   from './routes/review.routes';
import { adminRoutes }    from './routes/admin.routes';
import { categoryRoutes } from './routes/category.routes';
import { userRoutes }     from './routes/user.routes';
import { providerRoutes } from './routes/provider.routes';
import { messageRoutes }  from './routes/message.routes';
import { serviceTypeRoutes } from './routes/service-type.routes';

const app = express();

// --- Security & Middleware ---
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// --- Routes ---
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/provider',      providerRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/bookings',      bookingRoutes);
app.use('/api/messages',      messageRoutes);

// Keep existing routes if they are needed for backward compatibility or other features
app.use('/api/v1/tenants',    tenantRoutes);
app.use('/api/v1/services',   serviceRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/reviews',    reviewRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
