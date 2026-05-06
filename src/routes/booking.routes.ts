import { Router } from 'express';
import { body, param } from 'express-validator';
import { acceptBooking, cancelBooking, createBooking, declineBooking, listMyBookings } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const bookingRoutes = Router();

bookingRoutes.use(authenticate);

bookingRoutes.get('/my', authorize(['customer', 'provider']), listMyBookings);

bookingRoutes.post(
  '/',
  authorize(['customer']),
  [
    body('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
    body('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
    body('scheduledTime').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    body('scheduled_time').optional().isISO8601().withMessage('Scheduled time must be a valid date'),
    body().custom(value => {
      if (!value.providerServiceId && !value.provider_service_id) {
        throw new Error('Service is required');
      }
      if (!value.scheduledTime && !value.scheduled_time) {
        throw new Error('Scheduled time is required');
      }
      return true;
    }),
  ],
  validateRequest,
  createBooking
);

bookingRoutes.post('/:id/cancel', authorize(['customer']), [param('id').isUUID().withMessage('Booking ID must be valid')], validateRequest, cancelBooking);
bookingRoutes.post('/:id/accept', authorize(['provider']), [param('id').isUUID().withMessage('Booking ID must be valid')], validateRequest, acceptBooking);
bookingRoutes.post('/:id/decline', authorize(['provider']), [param('id').isUUID().withMessage('Booking ID must be valid')], validateRequest, declineBooking);
