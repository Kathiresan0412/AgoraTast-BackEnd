"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("./types");
const auth_routes_1 = require("./routes/auth.routes");
const tenant_routes_1 = require("./routes/tenant.routes");
const service_routes_1 = require("./routes/service.routes");
const booking_routes_1 = require("./routes/booking.routes");
const review_routes_1 = require("./routes/review.routes");
const admin_routes_1 = require("./routes/admin.routes");
const category_routes_1 = require("./routes/category.routes");
const user_routes_1 = require("./routes/user.routes");
const provider_routes_1 = require("./routes/provider.routes");
const message_routes_1 = require("./routes/message.routes");
const service_type_routes_1 = require("./routes/service-type.routes");
const logger_1 = require("./config/logger");
const app = (0, express_1.default)();
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
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use((0, morgan_1.default)('combined'));
morgan_1.default.token('user-id', req => req.user?.id || '-');
morgan_1.default.token('user-role', req => req.user?.role || '-');
app.use((0, morgan_1.default)(':date[iso] :remote-addr :method :url :status :response-time ms user=:user-id role=:user-role', {
    stream: logger_1.apiLogStream,
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);
// --- Routes ---
app.get('/', (_, res) => res.json(apiOverview));
app.get('/api', (_, res) => res.json(apiOverview));
app.use('/api/auth', auth_routes_1.authRoutes);
app.use('/api/users', user_routes_1.userRoutes);
app.use('/api/admin', admin_routes_1.adminRoutes);
app.use('/api/provider', provider_routes_1.providerRoutes);
app.use('/api/service-types', service_type_routes_1.serviceTypeRoutes);
app.use('/api/bookings', booking_routes_1.bookingRoutes);
app.use('/api/messages', message_routes_1.messageRoutes);
// Keep existing routes if they are needed for backward compatibility or other features
app.use('/api/v1/tenants', tenant_routes_1.tenantRoutes);
app.use('/api/v1/services', service_routes_1.serviceRoutes);
app.use('/api/v1/categories', category_routes_1.categoryRoutes);
app.use('/api/v1/reviews', review_routes_1.reviewRoutes);
// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date() }));
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
    console.log(`API logs writing to ${logger_1.apiLogPath}`);
});
