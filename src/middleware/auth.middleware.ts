import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUser } from '../types';
import { getRequestLogContext, serializeError, writeAuthEvent } from '../config/logger';


export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    writeAuthEvent('auth_missing_token', {
      ...getRequestLogContext(req),
      status: 401,
    });
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded as any;
    next();
  } catch (err) {
    writeAuthEvent('auth_invalid_token', {
      ...getRequestLogContext(req),
      status: 401,
      error: serializeError(err),
    });
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    writeAuthEvent('auth_invalid_header', {
      ...getRequestLogContext(req),
      status: 401,
    });
    res.status(401).json({ error: 'Unauthorized: Invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = decoded as any;
    next();
  } catch (err) {
    writeAuthEvent('auth_invalid_token', {
      ...getRequestLogContext(req),
      status: 401,
      error: serializeError(err),
    });
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      writeAuthEvent('auth_forbidden_role', {
        ...getRequestLogContext(req),
        status: 403,
        requiredRoles: roles,
      });
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};
