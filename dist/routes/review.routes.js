"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const review_controller_1 = require("../controllers/review.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
exports.reviewRoutes = (0, express_1.Router)();
const targetQueryValidation = [
    (0, express_validator_1.query)('providerId').optional().isUUID().withMessage('Provider ID must be valid'),
    (0, express_validator_1.query)('provider_id').optional().isUUID().withMessage('Provider ID must be valid'),
    (0, express_validator_1.query)('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.query)('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.query)('serviceId').optional().isUUID().withMessage('Service ID must be valid'),
];
const reviewBodyValidation = [
    (0, express_validator_1.body)('providerId').optional().isUUID().withMessage('Provider ID must be valid'),
    (0, express_validator_1.body)('provider_id').optional().isUUID().withMessage('Provider ID must be valid'),
    (0, express_validator_1.body)('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.body)('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.body)('bookingId').optional({ nullable: true }).isUUID().withMessage('Booking ID must be valid'),
    (0, express_validator_1.body)('booking_id').optional({ nullable: true }).isUUID().withMessage('Booking ID must be valid'),
    (0, express_validator_1.body)('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('comment').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }).withMessage('Comment must be 2000 characters or less'),
];
const updateBodyValidation = [
    (0, express_validator_1.body)('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    (0, express_validator_1.body)('comment').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }).withMessage('Comment must be 2000 characters or less'),
    (0, express_validator_1.body)().custom((value) => {
        if (value.rating === undefined && value.comment === undefined) {
            throw new Error('Rating or comment is required');
        }
        return true;
    }),
];
exports.reviewRoutes.get('/', auth_middleware_1.optionalAuthenticate, targetQueryValidation, validate_middleware_1.validateRequest, review_controller_1.listReviews);
exports.reviewRoutes.get('/system', auth_middleware_1.optionalAuthenticate, review_controller_1.listSystemReviews);
exports.reviewRoutes.get('/system/my', auth_middleware_1.authenticate, review_controller_1.getMySystemReview);
exports.reviewRoutes.get('/my', auth_middleware_1.authenticate, targetQueryValidation, validate_middleware_1.validateRequest, review_controller_1.getMyReview);
exports.reviewRoutes.get('/providers/:providerId/services', auth_middleware_1.optionalAuthenticate, [(0, express_validator_1.param)('providerId').isUUID()], validate_middleware_1.validateRequest, review_controller_1.listProviderServiceReviews);
exports.reviewRoutes.get('/providers/:providerId', auth_middleware_1.optionalAuthenticate, [(0, express_validator_1.param)('providerId').isUUID()], validate_middleware_1.validateRequest, review_controller_1.listReviews);
exports.reviewRoutes.get('/services/:serviceId', auth_middleware_1.optionalAuthenticate, [(0, express_validator_1.param)('serviceId').isUUID()], validate_middleware_1.validateRequest, review_controller_1.listReviews);
exports.reviewRoutes.post('/', auth_middleware_1.authenticate, reviewBodyValidation, validate_middleware_1.validateRequest, review_controller_1.createReview);
exports.reviewRoutes.post('/system', auth_middleware_1.authenticate, reviewBodyValidation, validate_middleware_1.validateRequest, review_controller_1.createSystemReview);
exports.reviewRoutes.post('/providers/:providerId', auth_middleware_1.authenticate, [(0, express_validator_1.param)('providerId').isUUID(), ...reviewBodyValidation], validate_middleware_1.validateRequest, review_controller_1.createReview);
exports.reviewRoutes.post('/services/:serviceId', auth_middleware_1.authenticate, [(0, express_validator_1.param)('serviceId').isUUID(), ...reviewBodyValidation], validate_middleware_1.validateRequest, review_controller_1.createReview);
exports.reviewRoutes.put('/:reviewId', auth_middleware_1.authenticate, [(0, express_validator_1.param)('reviewId').isUUID(), ...updateBodyValidation], validate_middleware_1.validateRequest, review_controller_1.updateReview);
exports.reviewRoutes.delete('/:reviewId', auth_middleware_1.authenticate, [(0, express_validator_1.param)('reviewId').isUUID()], validate_middleware_1.validateRequest, review_controller_1.deleteReview);
