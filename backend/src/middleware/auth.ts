import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma, $Enums } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: $Enums.UserRole;
    firstName: string;
    lastName: string;
  };
  file?: File;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

export const requireRole = (roles: $Enums.UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions. Required roles: ' + roles.join(', ') 
      });
    }

    next();
  };
};

export const requireSuperAdmin = requireRole([$Enums.UserRole.SUPER_ADMIN]);
export const requireAnyAdmin = requireRole([$Enums.UserRole.ADMIN, $Enums.UserRole.SUPER_ADMIN]);

// Field-level redaction based on user role
export const redactSensitiveFields = (data: any, userRole: $Enums.UserRole): any => {
  if (!data) return data;

  // If user is Super Admin, return all data
  if (userRole === $Enums.UserRole.SUPER_ADMIN) {
    return data;
  }

  // For Admin users, redact internal cost and margin data
  const redactFields = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(redactFields);
    }
    
    if (obj && typeof obj === 'object') {
      const redacted = { ...obj };
      
      // Remove sensitive fields for Admin users
      delete redacted.internalCost;
      delete redacted.cost;
      delete redacted.totalCost;
      delete redacted.paymentInfo;
      
      // Recursively redact nested objects
      Object.keys(redacted).forEach(key => {
        if (redacted[key] && typeof redacted[key] === 'object') {
          redacted[key] = redactFields(redacted[key]);
        }
      });
      
      return redacted;
    }
    
    return obj;
  };

  return redactFields(data);
};
