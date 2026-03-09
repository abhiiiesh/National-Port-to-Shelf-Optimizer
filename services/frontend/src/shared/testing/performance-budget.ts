export interface PerformanceBudget {
  maxEstimatedBundleKb: number;
  maxInteractionLatencyMs: number;
}

export const defaultPerformanceBudget: PerformanceBudget = {
  maxEstimatedBundleKb: 250,
  maxInteractionLatencyMs: 200,
};

export interface FrontendPerformanceSnapshot {
  estimatedBundleKb: number;
  interactionLatencyMs: number;
}

export interface PerformanceBudgetResult {
  withinBudget: boolean;
  violations: string[];
}

export const evaluatePerformanceBudget = (
  snapshot: FrontendPerformanceSnapshot,
  budget: PerformanceBudget = defaultPerformanceBudget
): PerformanceBudgetResult => {
  const violations: string[] = [];

  if (snapshot.estimatedBundleKb > budget.maxEstimatedBundleKb) {
    violations.push(
      `Bundle size ${snapshot.estimatedBundleKb}kb exceeds ${budget.maxEstimatedBundleKb}kb`
    );
  }

  if (snapshot.interactionLatencyMs > budget.maxInteractionLatencyMs) {
    violations.push(
      `Interaction latency ${snapshot.interactionLatencyMs}ms exceeds ${budget.maxInteractionLatencyMs}ms`
    );
  }

  return {
    withinBudget: violations.length === 0,
    violations,
  };
};
