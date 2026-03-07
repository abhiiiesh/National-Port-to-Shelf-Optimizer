import { Role } from '@port-to-shelf/shared-types';
import { AuthService } from '../services/auth.service';
import { AuthorizationService, AuthorizationContext } from '../services/authorization.service';

export interface AuthRequest {
  headers: {
    authorization?: string;
  };
  user?: AuthorizationContext;
}

export interface AuthResponse {
  status: (code: number) => AuthResponse;
  json: (data: any) => void;
}

export type NextFunction = () => void;

/**
 * Middleware to authenticate requests
 */
export function authenticate(authService: AuthService) {
  return async (req: AuthRequest, res: AuthResponse, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
            timestamp: new Date(),
          },
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const validation = await authService.validateToken(token);

      if (!validation.valid || !validation.userId || !validation.roles) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            timestamp: new Date(),
          },
        });
        return;
      }

      // Attach user context to request
      req.user = {
        userId: validation.userId,
        roles: validation.roles,
      };

      next();
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication error',
          timestamp: new Date(),
        },
      });
    }
  };
}

/**
 * Middleware to authorize requests based on roles
 */
export function authorize(authorizationService: AuthorizationService, requiredRoles: Role[]) {
  return (req: AuthRequest, res: AuthResponse, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date(),
        },
      });
      return;
    }

    const hasPermission = authorizationService.hasAnyRole(req.user, requiredRoles);

    if (!hasPermission) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
          timestamp: new Date(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to authorize resource access
 */
export function authorizeResource(
  authorizationService: AuthorizationService,
  resource: string,
  action: string
) {
  return (req: AuthRequest, res: AuthResponse, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          timestamp: new Date(),
        },
      });
      return;
    }

    const hasPermission = authorizationService.authorize(req.user, resource, action);

    if (!hasPermission) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Not authorized to ${action} ${resource}`,
          timestamp: new Date(),
        },
      });
      return;
    }

    next();
  };
}
