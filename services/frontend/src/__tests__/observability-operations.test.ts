import {
  defaultFrontendSloThresholds,
  evaluateFrontendAlerts,
} from '../observability/alerts';
import {
  frontendDashboardLinks,
  resolveRunbookForAlert,
} from '../observability/operations';
import {
  createTelemetryEvent,
  InMemoryTelemetryStore,
} from '../observability/telemetry';

describe('frontend observability and operations', () => {
  it('captures telemetry events for route transitions and interactions', () => {
    const store = new InMemoryTelemetryStore();
    const routeEvent = createTelemetryEvent('ROUTE_TRANSITION', 'to-tracking', '1.0.0', {
      route: '/tracking',
      durationMs: 120,
    });

    store.record(routeEvent);
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].type).toBe('ROUTE_TRANSITION');
  });

  it('emits warning and critical alerts based on SLO thresholds', () => {
    const warningAlerts = evaluateFrontendAlerts({ errorRatePercent: 2.5, p95InteractionMs: 420 });
    const criticalAlerts = evaluateFrontendAlerts({ errorRatePercent: 6, p95InteractionMs: 900 });

    expect(warningAlerts.some((a) => a.severity === 'warning')).toBe(true);
    expect(criticalAlerts.some((a) => a.severity === 'critical')).toBe(true);
    expect(defaultFrontendSloThresholds.errorRatePercentCritical).toBe(5);
  });

  it('maps alerts to runbooks and keeps dashboard references', () => {
    expect(frontendDashboardLinks.length).toBeGreaterThanOrEqual(3);
    expect(resolveRunbookForAlert('HIGH_ERROR_RATE')?.url).toContain('/runbooks/frontend/');
    expect(resolveRunbookForAlert('UNKNOWN')).toBeNull();
  });
});
