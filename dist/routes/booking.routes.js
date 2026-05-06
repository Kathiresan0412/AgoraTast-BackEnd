"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingRoutes = void 0;
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validate_middleware_1 = require("../middleware/validate.middleware");
exports.bookingRoutes = (0, express_1.Router)();
exports.bookingRoutes.use(auth_middleware_1.authenticate);
exports.bookingRoutes.get('/my', (0, auth_middleware_1.authorize)(['customer', 'provider']), booking_controller_1.listMyBookings);
exports.bookingRoutes.post('/', (0, auth_middleware_1.authorize)(['customer']), [
    (0, express_validator_1.body)('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.body)('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
    (0, express_validator_1.body)('scheduledTime').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    (0, express_validator_1.body)('scheduled_time').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    (0, express_validator_1.body)().custom(value => {
        if (!value.providerServiceId && !value.provider_service_id) {
            throw new Error('Service is required');
        }
        if (!value.scheduledTime && !value.scheduled_time) {
            throw new Error('Scheduled time is required');
        }
        return true;
    }),
], validate_middleware_1.validateRequest, booking_controller_1.createBooking);
exports.bookingRoutes.post('/:id/cancel', (0, auth_middleware_1.authorize)(['customer']), [(0, express_validator_1.param)('id').isUUID().withMessage('Booking ID must be valid')], validate_middleware_1.validateRequest, booking_controller_1.cancelBooking);
exports.bookingRoutes.post('/:id/accept', (0, auth_middleware_1.authorize)(['provider']), [(0, express_validator_1.param)('id').isUUID().withMessage('Booking ID must be valid')], validate_middleware_1.validateRequest, booking_controller_1.acceptBooking);
exports.bookingRoutes.post('/:id/decline', (0, auth_middleware_1.authorize)(['provider']), [(0, express_validator_1.param)('id').isUUID().withMessage('Booking ID must be valid')], validate_middleware_1.validateRequest, booking_controller_1.declineBooking);
