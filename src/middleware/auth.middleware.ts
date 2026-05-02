import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';
import { writeAuthLog } from '../config/logger';


export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    writeAuthLog(`401 missing-token method=${req.method} path=${req.originalUrl} ip=${req.ip}`);
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded as any;
    next();
  } catch (err) {
    writeAuthLog(`401 invalid-token method=${req.method} path=${req.originalUrl} ip=${req.ip}`);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      writeAuthLog(
        `403 forbidden method=${req.method} path=${req.originalUrl} ip=${req.ip} user=${req.user?.id || '-'} role=${req.user?.role || '-'} required=${roles.join('|')}`
      );
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
