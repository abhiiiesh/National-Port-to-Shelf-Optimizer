import { resolveRouteForUser } from '../app/navigation';
import {
  createEmptyState,
  createErrorState,
  createLoadingState,
  createReadyState,
} from '../app/request-state';
import { appRoutes } from '../app/routes';
import { resolveQueryPolicy } from '../shared/query-policy';
import { RequestControllerRegistry } from '../shared/request-controller';

describe('application shell and navigation maturity', () => {
  it('defines domain routes with lazy module references', async () => {
    expect(appRoutes.length).toBeGreaterThanOrEqual(5);
    const moduleRef = await appRoutes[0].lazyModule();
    expect(moduleRef).toContain('features/');
  });

  it('resolves allowed route for authorized role', () => {
    const result = resolveRouteForUser('/tracking', 'PORT_OPERATOR');
    expect(result.reason).toBe('resolved');
    expect(result.redirectTo).toBeNull();
    expect(result.route?.key).toBe('tracking-overview');
  });

  it('returns unauthorized fallback for forbidden route', () => {
    const result = resolveRouteForUser('/admin', 'RETAILER');
    expect(result.reason).toBe('unauthorized');
    expect(result.redirectTo).toBe('/unauthorized');
  });

  it('returns not found fallback for unknown route', () => {
    const result = resolveRouteForUser('/unknown', 'ADMIN');
    expect(result.reason).toBe('not_found');
    expect(result.redirectTo).toBe('/not-found');
  });

  it('supports standardized loading, empty, ready and error states', () => {
    const loading = createLoadingState<string[]>();
    const empty = createEmptyState<string[]>();
    const ready = createReadyState(['container-1']);
    const error = createErrorState<string[]>('Gateway timeout');

    expect(loading.status).toBe('loading');
    expect(empty.status).toBe('empty');
    expect(ready.data).toEqual(['container-1']);
    expect(error.errorMessage).toBe('Gateway timeout');
  });

  it('standardizes query policy with override support', () => {
    const policy = resolveQueryPolicy({ staleTimeMs: 60_000 });
    expect(policy.retryCount).toBe(2);
    expect(policy.staleTimeMs).toBe(60_000);
  });

  it('cancels prior requests by key for rapid navigation', () => {
    const registry = new RequestControllerRegistry();
    const firstSignal = registry.createForKey('tracking:list');
    const secondSignal = registry.createForKey('tracking:list');

    expect(firstSignal.aborted).toBe(true);
    expect(secondSignal.aborted).toBe(false);
    expect(registry.activeCount()).toBe(1);

    registry.abortAll();
    expect(secondSignal.aborted).toBe(true);
    expect(registry.activeCount()).toBe(0);
  });
});
