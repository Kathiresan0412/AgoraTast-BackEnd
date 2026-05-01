import { Request, Response, NextFunction } from 'express';

export type UserRole = 'super_admin' | 'tenant_admin' | 'tenant_staff' | 'customer';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string | null;
  full_name: string | null;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
