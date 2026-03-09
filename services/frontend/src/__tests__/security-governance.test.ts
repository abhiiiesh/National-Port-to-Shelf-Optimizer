import {
  canAccessPath,
  canAccessTenantResource,
  shouldRefreshSession,
  type AuthClaims,
} from '../security/auth';
import { buildAuditMessage, maskSensitiveValue, redactLogPayload } from '../security/data-protection';

describe('frontend security and governance', () => {
  const claims: AuthClaims = {
    userId: 'user-1',
    tenantId: 'tenant-a',
    roles: ['PORT_OPERATOR'],
    scopes: ['tracking:read', 'slots:read', 'auctions:read'],
    exp: 9999999999,
  };

  it('enforces scope-based path access', () => {
    expect(canAccessPath(claims, '/tracking')).toBe(true);
    expect(canAccessPath(claims, '/admin')).toBe(false);
  });

  it('enforces tenant ownership checks', () => {
    expect(canAccessTenantResource(claims, 'tenant-a')).toBe(true);
    expect(canAccessTenantResource(claims, 'tenant-b')).toBe(false);
  });

  it('triggers session refresh near expiry', () => {
    expect(
      shouldRefreshSession(
        {
          accessToken: 'a',
          refreshToken: 'r',
          expiresAtEpochSeconds: 1_000,
        },
        910,
        120,
      ),
    ).toBe(true);
  });

  it('masks sensitive values and redacts secure log keys', () => {
    expect(maskSensitiveValue('ABCDEF123456')).toBe('********3456');

    const redacted = redactLogPayload({
      authorization: 'Bearer secret',
      password: 'abc',
      ok: true,
    });

    expect(redacted.authorization).toBe('[REDACTED]');
    expect(redacted.password).toBe('[REDACTED]');
    expect(redacted.ok).toBe(true);
  });

  it('builds auditable action messages', () => {
    const message = buildAuditMessage({
      action: 'FINALIZE_AUCTION',
      actorUserId: 'admin-1',
      tenantId: 'tenant-a',
      referenceId: 'auc-22',
      comment: 'approved after review',
    });

    expect(message).toContain('[AUDIT]');
    expect(message).toContain('FINALIZE_AUCTION');
    expect(message).toContain('tenant-a');
  });
});
