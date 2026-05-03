import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import './types';

import { authRoutes } from './routes/auth.routes';
import { tenantRoutes } from './routes/tenant.routes';
import { serviceRoutes } from './routes/service.routes';
import { bookingRoutes } from './routes/booking.routes';
import { reviewRoutes } from './routes/review.routes';
import { adminRoutes } from './routes/admin.routes';
import { categoryRoutes } from './routes/category.routes';
import { userRoutes } from './routes/user.routes';
import { providerRoutes } from './routes/provider.routes';
import { messageRoutes } from './routes/message.routes';
import { serviceTypeRoutes } from './routes/service-type.routes';
import { apiLogStream, getRequestLogContext, serializeError, writeApiEvent } from './config/logger';

const app = express();

const apiOverview = {
  name: 'AgoraTask API',
  status: 'ok',
  version: '1.0.0',
  routes: {
    health: '/health',
    auth: '/api/auth',
    users: '/api/users',
    admin: '/api/admin',
    provider: '/api/provider',
    serviceTypes: '/api/service-types',
    bookings: '/api/bookings',
    messages: '/api/messages',
    services: '/api/v1/services',
    categories: '/api/v1/categories',
    reviews: '/api/v1/reviews',
    tenants: '/api/v1/tenants',
  },
};

// --- Security & Middleware ---
app.use((req, res, next) => {
  req.requestId = req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);

  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    if (res.statusCode < 400) return;

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    writeApiEvent(res.statusCode >= 500 ? 'error' : 'warn', 'http_error_response', {
      ...getRequestLogContext(req),
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      contentLength: Number(res.getHeader('content-length')) || undefined,
    });
  });

  next();
});
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));
morgan.token('user-id', req => (req as express.Request).user?.id || '-');
morgan.token('user-role', req => (req as express.Request).user?.role || '-');
app.use(morgan(':date[iso] :remote-addr :method :url :status :response-time ms request=:res[x-request-id] user=:user-id role=:user-role', {
  stream: apiLogStream,
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// --- Routes ---
app.get('/', (_, res) => res.json(apiOverview));
app.get('/api', (_, res) => res.json(apiOverview));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/service-types', serviceTypeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/messages', messageRoutes);

// Keep existing routes if they are needed for backward compatibility or other features
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  writeApiEvent('error', 'unhandled_error', {
    ...getRequestLogContext(req),
    error: serializeError(err),
  });
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app;
