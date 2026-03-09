import { resolveQueryPolicy } from '../shared/query-policy';
import { RequestControllerRegistry } from '../shared/request-controller';
import {
  defaultPerformanceBudget,
  evaluatePerformanceBudget,
} from '../shared/testing/performance-budget';

describe('frontend resilience and non-functional tests', () => {
  it('applies retry and stale-time defaults for resilience', () => {
    const policy = resolveQueryPolicy();
    expect(policy.retryCount).toBeGreaterThanOrEqual(1);
    expect(policy.staleTimeMs).toBeGreaterThan(0);
  });

  it('cancels in-flight requests during rapid route transitions', () => {
    const registry = new RequestControllerRegistry();
    const first = registry.createForKey('metrics:filters');
    const second = registry.createForKey('metrics:filters');

    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);

    registry.abortAll();
    expect(second.aborted).toBe(true);
  });

  it('passes performance budget checks for acceptable snapshots', () => {
    const result = evaluatePerformanceBudget({
      estimatedBundleKb: defaultPerformanceBudget.maxEstimatedBundleKb - 10,
      interactionLatencyMs: defaultPerformanceBudget.maxInteractionLatencyMs - 20,
    });

    expect(result.withinBudget).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('flags budget violations for degraded snapshots', () => {
    const result = evaluatePerformanceBudget({
      estimatedBundleKb: defaultPerformanceBudget.maxEstimatedBundleKb + 50,
      interactionLatencyMs: defaultPerformanceBudget.maxInteractionLatencyMs + 100,
    });

    expect(result.withinBudget).toBe(false);
    expect(result.violations.length).toBe(2);
  });
});
