export type AuthUserRole =
  | 'OPERATIONS_MANAGER'
  | 'PORT_ADMIN'
  | 'AUCTION_OPERATOR'
  | 'EXECUTIVE_STAKEHOLDER'
  | 'ADMIN'
  | 'PORT_OPERATOR'
  | 'RETAILER'
  | 'LOGISTICS_PARTNER';

export interface AuthClaims {
  userId: string;
  tenantId: string;
  roles: AuthUserRole[];
  scopes: string[];
  exp: number;
}

export interface SessionTokenState {
  accessToken: string;
  refreshToken: string;
  expiresAtEpochSeconds: number;
}

const scopeMap: Record<string, string[]> = {
  '/dashboard': ['dashboard:read'],
  '/tracking': ['tracking:read'],
  '/slots': ['slots:read'],
  '/auctions': ['auctions:read'],
  '/reports': ['reports:read'],
  '/news': ['news:read'],
  '/access-control': ['admin:roles'],
};

const legacyScopePathMap: Record<string, string> = {
  '/admin': '/access-control',
  '/analytics': '/reports',
};

export const canAccessPath = (claims: AuthClaims, path: string): boolean => {
  const resolvedPath = legacyScopePathMap[path] ?? path;
  const requiredScopes = scopeMap[resolvedPath];

  if (!requiredScopes) {
    return false;
  }

  return requiredScopes.every((scope) => claims.scopes.includes(scope));
};

export const canAccessTenantResource = (claims: AuthClaims, resourceTenantId: string): boolean =>
  claims.tenantId === resourceTenantId;

export const shouldRefreshSession = (
  session: SessionTokenState,
  nowEpochSeconds: number,
  refreshLeadSeconds = 120
): boolean => session.expiresAtEpochSeconds - nowEpochSeconds <= refreshLeadSeconds;
