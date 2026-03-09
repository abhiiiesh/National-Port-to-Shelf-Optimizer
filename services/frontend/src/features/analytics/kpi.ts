import type { FrontendPerformanceSnapshot } from '../../config/contracts';

export interface AnalyticsFilters {
  route?: string;
  retailer?: string;
  mode?: 'RAIL' | 'ROAD';
  period?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}

export interface KpiDeltaView {
  delayedRatePercent: number;
  avgTransitHours: number;
  comparisonLabel: string;
}

export const buildKpiDeltaView = (
  snapshot: FrontendPerformanceSnapshot,
  baselineTransitHours: number,
  filters: AnalyticsFilters
): KpiDeltaView => {
  const delayedRatePercent =
    snapshot.totalShipments === 0
      ? 0
      : Number(((snapshot.delayedShipments / snapshot.totalShipments) * 100).toFixed(2));

  const comparisonLabel =
    [filters.route, filters.retailer, filters.mode, filters.period].filter(Boolean).join(' | ') ||
    'global';

  return {
    delayedRatePercent,
    avgTransitHours: Number(snapshot.avgTransitHours.toFixed(2)),
    comparisonLabel: `${comparisonLabel} vs baseline ${baselineTransitHours.toFixed(2)}h`,
  };
};
