import { normalizeUserRole, type UserRole } from './access-control';
import { appRoutes, notFoundFallbackPath, type AppRoute, unauthorizedFallbackPath } from './routes';

export interface RouteResolution {
  route: AppRoute | null;
  redirectTo: string | null;
  reason: 'resolved' | 'unauthorized' | 'not_found';
}

const legacyPathMap: Record<string, string> = {
  '/admin': '/access-control',
  '/analytics': '/reports',
};

export const resolveRouteForUser = (path: string, role: UserRole): RouteResolution => {
  const resolvedPath = legacyPathMap[path] ?? path;
  const normalizedRole = normalizeUserRole(role);
  const route = appRoutes.find((candidate) => candidate.path === resolvedPath);

  if (!route) {
    return { route: null, redirectTo: notFoundFallbackPath, reason: 'not_found' };
  }

  if (!route.allowedRoles.includes(normalizedRole)) {
    return { route: null, redirectTo: unauthorizedFallbackPath, reason: 'unauthorized' };
  }

  return { route, redirectTo: null, reason: 'resolved' };
};
