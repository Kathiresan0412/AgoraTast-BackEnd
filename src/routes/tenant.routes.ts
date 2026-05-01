import { Router } from 'express';

export const tenantRoutes = Router();

tenantRoutes.get('/', (req, res) => {
  res.json({ message: 'Tenant routes' });
});
