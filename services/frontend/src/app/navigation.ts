import type { UserRole } from './access-control';
import { appRoutes, notFoundFallbackPath, type AppRoute, unauthorizedFallbackPath } from './routes';

export interface RouteResolution {
  route: AppRoute | null;
  redirectTo: string | null;
  reason: 'resolved' | 'unauthorized' | 'not_found';
}

export const resolveRouteForUser = (path: string, role: UserRole): RouteResolution => {
  const route = appRoutes.find((candidate) => candidate.path === path);

  if (!route) {
    return { route: null, redirectTo: notFoundFallbackPath, reason: 'not_found' };
  }

  if (!route.allowedRoles.includes(role)) {
    return { route: null, redirectTo: unauthorizedFallbackPath, reason: 'unauthorized' };
  }

  return { route, redirectTo: null, reason: 'resolved' };
};
