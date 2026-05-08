import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  createReview,
  createSystemReview,
  deleteReview,
  getMyReview,
  getMySystemReview,
  listReviews,
  listSystemReviews,
  updateReview,
} from '../controllers/review.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';

export const reviewRoutes = Router();

const targetQueryValidation = [
  query('providerId').optional().isUUID().withMessage('Provider ID must be valid'),
  query('provider_id').optional().isUUID().withMessage('Provider ID must be valid'),
  query('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
  query('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
  query('serviceId').optional().isUUID().withMessage('Service ID must be valid'),
];

const reviewBodyValidation = [
  body('providerId').optional().isUUID().withMessage('Provider ID must be valid'),
  body('provider_id').optional().isUUID().withMessage('Provider ID must be valid'),
  body('providerServiceId').optional().isUUID().withMessage('Service ID must be valid'),
  body('provider_service_id').optional().isUUID().withMessage('Service ID must be valid'),
  body('bookingId').optional({ nullable: true }).isUUID().withMessage('Booking ID must be valid'),
  body('booking_id').optional({ nullable: true }).isUUID().withMessage('Booking ID must be valid'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }).withMessage('Comment must be 2000 characters or less'),
];

const updateBodyValidation = [
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional({ nullable: true }).isString().trim().isLength({ max: 2000 }).withMessage('Comment must be 2000 characters or less'),
  body().custom((value) => {
    if (value.rating === undefined && value.comment === undefined) {
      throw new Error('Rating or comment is required');
    }
    return true;
  }),
];

reviewRoutes.get('/', optionalAuthenticate, targetQueryValidation, validateRequest, listReviews);
reviewRoutes.get('/system', optionalAuthenticate, listSystemReviews);
reviewRoutes.get('/system/my', authenticate, getMySystemReview);
reviewRoutes.get('/my', authenticate, targetQueryValidation, validateRequest, getMyReview);
reviewRoutes.get('/providers/:providerId', optionalAuthenticate, [param('providerId').isUUID()], validateRequest, listReviews);
reviewRoutes.get('/services/:serviceId', optionalAuthenticate, [param('serviceId').isUUID()], validateRequest, listReviews);

reviewRoutes.post('/', authenticate, reviewBodyValidation, validateRequest, createReview);
reviewRoutes.post('/system', authenticate, reviewBodyValidation, validateRequest, createSystemReview);
reviewRoutes.post('/providers/:providerId', authenticate, [param('providerId').isUUID(), ...reviewBodyValidation], validateRequest, createReview);
reviewRoutes.post('/services/:serviceId', authenticate, [param('serviceId').isUUID(), ...reviewBodyValidation], validateRequest, createReview);

reviewRoutes.put('/:reviewId', authenticate, [param('reviewId').isUUID(), ...updateBodyValidation], validateRequest, updateReview);
reviewRoutes.delete('/:reviewId', authenticate, [param('reviewId').isUUID()], validateRequest, deleteReview);
