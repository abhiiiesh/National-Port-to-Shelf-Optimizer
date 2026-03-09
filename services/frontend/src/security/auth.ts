export interface AuthClaims {
  userId: string;
  tenantId: string;
  roles: Array<'PORT_OPERATOR' | 'RETAILER' | 'LOGISTICS_PARTNER' | 'ADMIN'>;
  scopes: string[];
  exp: number;
}

export interface SessionTokenState {
  accessToken: string;
  refreshToken: string;
  expiresAtEpochSeconds: number;
}

const scopeMap: Record<string, string[]> = {
  '/tracking': ['tracking:read'],
  '/slots': ['slots:read'],
  '/auctions': ['auctions:read'],
  '/analytics': ['metrics:read'],
  '/admin': ['admin:read'],
};

export const canAccessPath = (claims: AuthClaims, path: string): boolean => {
  const requiredScopes = scopeMap[path] ?? [];
  return requiredScopes.every((scope) => claims.scopes.includes(scope));
};

export const canAccessTenantResource = (claims: AuthClaims, resourceTenantId: string): boolean =>
  claims.tenantId === resourceTenantId;

export const shouldRefreshSession = (
  session: SessionTokenState,
  nowEpochSeconds: number,
  refreshLeadSeconds = 120
): boolean => session.expiresAtEpochSeconds - nowEpochSeconds <= refreshLeadSeconds;
