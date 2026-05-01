import { Router } from 'express';

export const categoryRoutes = Router();

categoryRoutes.get('/', (req, res) => {
  res.json({ message: 'Category routes' });
});
