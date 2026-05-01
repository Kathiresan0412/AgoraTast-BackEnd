import { Router } from 'express';

export const serviceRoutes = Router();

serviceRoutes.get('/', (req, res) => {
  res.json({ message: 'Service routes' });
});
