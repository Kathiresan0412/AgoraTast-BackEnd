"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const provider_controller_1 = require("../controllers/provider.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
const image_validation_1 = require("../utils/image-validation");
exports.providerRoutes = (0, express_1.Router)();
exports.providerRoutes.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)(['provider']));
exports.providerRoutes.get('/dashboard-stats', provider_controller_1.getDashboardStats);
exports.providerRoutes.get('/booking-requests', provider_controller_1.getBookingRequests);
exports.providerRoutes.get('/services', provider_controller_1.getProviderServices);
const serviceBodyValidation = [
    (0, express_validator_1.body)('title').notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('description').optional().isString(),
    (0, express_validator_1.body)('base_price').optional({ nullable: true }).isNumeric(),
    (0, express_validator_1.body)('price_type').optional().isIn(['fixed', 'hourly', 'quote']),
    (0, express_validator_1.body)('duration_mins').optional({ nullable: true }).isInt({ min: 1 }),
    (0, express_validator_1.body)('service_area').optional().isArray(),
    (0, express_validator_1.body)('images').optional().isArray(),
    (0, express_validator_1.body)('images.*').optional().custom(image_validation_1.isAllowedImageValue).withMessage('Service images must be valid image URLs or image uploads under 2MB'),
    (0, express_validator_1.body)('status').optional().isIn(['draft', 'active', 'paused', 'pending_review', 'rejected']),
    (0, express_validator_1.body)('service_type_ids').isArray({ min: 1 }).withMessage('Select at least one service type'),
    (0, express_validator_1.body)('service_type_ids.*').isUUID().withMessage('Service type ids must be valid UUIDs'),
];
exports.providerRoutes.post('/services', serviceBodyValidation, validate_middleware_1.validateRequest, provider_controller_1.createProviderService);
exports.providerRoutes.put('/services/:serviceId', [(0, express_validator_1.param)('serviceId').isUUID().withMessage('Service ID must be valid'), ...serviceBodyValidation], validate_middleware_1.validateRequest, provider_controller_1.updateProviderService);
exports.providerRoutes.delete('/services/:serviceId', [(0, express_validator_1.param)('serviceId').isUUID().withMessage('Service ID must be valid')], validate_middleware_1.validateRequest, provider_controller_1.deleteProviderService);
