import { Router } from 'express';

export const reviewRoutes = Router();

reviewRoutes.get('/', (req, res) => {
  res.json({ message: 'Review routes' });
});
