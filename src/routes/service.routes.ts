import { Router } from 'express';
import { getPublicProviderBySlug, getPublicServiceBySlug, getPublicServices } from '../controllers/service.controller';

export const serviceRoutes = Router();

serviceRoutes.get('/providers/:slug', getPublicProviderBySlug);
serviceRoutes.get('/:slug', getPublicServiceBySlug);
serviceRoutes.get('/', getPublicServices);
