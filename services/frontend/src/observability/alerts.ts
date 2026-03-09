export interface FrontendSloThresholds {
  errorRatePercentWarning: number;
  errorRatePercentCritical: number;
  p95InteractionMsWarning: number;
  p95InteractionMsCritical: number;
}

export interface FrontendHealthSnapshot {
  errorRatePercent: number;
  p95InteractionMs: number;
}

export interface FrontendAlert {
  severity: 'warning' | 'critical';
  code: 'HIGH_ERROR_RATE' | 'HIGH_INTERACTION_LATENCY';
  message: string;
}

export const defaultFrontendSloThresholds: FrontendSloThresholds = {
  errorRatePercentWarning: 2,
  errorRatePercentCritical: 5,
  p95InteractionMsWarning: 400,
  p95InteractionMsCritical: 800,
};

export const evaluateFrontendAlerts = (
  snapshot: FrontendHealthSnapshot,
  thresholds: FrontendSloThresholds = defaultFrontendSloThresholds
): FrontendAlert[] => {
  const alerts: FrontendAlert[] = [];

  if (snapshot.errorRatePercent >= thresholds.errorRatePercentCritical) {
    alerts.push({
      severity: 'critical',
      code: 'HIGH_ERROR_RATE',
      message: `Frontend error rate ${snapshot.errorRatePercent}% exceeded critical threshold ${thresholds.errorRatePercentCritical}%`,
    });
  } else if (snapshot.errorRatePercent >= thresholds.errorRatePercentWarning) {
    alerts.push({
      severity: 'warning',
      code: 'HIGH_ERROR_RATE',
      message: `Frontend error rate ${snapshot.errorRatePercent}% exceeded warning threshold ${thresholds.errorRatePercentWarning}%`,
    });
  }

  if (snapshot.p95InteractionMs >= thresholds.p95InteractionMsCritical) {
    alerts.push({
      severity: 'critical',
      code: 'HIGH_INTERACTION_LATENCY',
      message: `Frontend p95 interaction latency ${snapshot.p95InteractionMs}ms exceeded critical threshold ${thresholds.p95InteractionMsCritical}ms`,
    });
  } else if (snapshot.p95InteractionMs >= thresholds.p95InteractionMsWarning) {
    alerts.push({
      severity: 'warning',
      code: 'HIGH_INTERACTION_LATENCY',
      message: `Frontend p95 interaction latency ${snapshot.p95InteractionMs}ms exceeded warning threshold ${thresholds.p95InteractionMsWarning}ms`,
    });
  }

  return alerts;
};
