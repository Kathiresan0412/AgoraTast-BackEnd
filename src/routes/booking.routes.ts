import { Router } from 'express';
import { acceptBooking, declineBooking } from '../controllers/booking.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

export const bookingRoutes = Router();

bookingRoutes.use(authenticate, authorize(['provider']));

bookingRoutes.post('/:id/accept', acceptBooking);
bookingRoutes.post('/:id/decline', declineBooking);
