export const API_CONTRACT_VERSION = 'v1';

export interface ApiErrorEnvelope {
  code: string;
  message: string;
  requestId?: string;
}

export interface FrontendVesselSummary {
  vesselId: string;
  vesselName: string;
  eta: string;
  status: 'ON_TIME' | 'DELAYED' | 'ARRIVED';
}

export interface FrontendPerformanceSnapshot {
  totalShipments: number;
  delayedShipments: number;
  avgTransitHours: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === 'string' && typeof value.message === 'string';
};

export const isFrontendVesselSummary = (value: unknown): value is FrontendVesselSummary => {
  if (!isRecord(value)) {
    return false;
  }

  const status = value.status;
  return (
    typeof value.vesselId === 'string' &&
    typeof value.vesselName === 'string' &&
    typeof value.eta === 'string' &&
    (status === 'ON_TIME' || status === 'DELAYED' || status === 'ARRIVED')
  );
};

export const isFrontendPerformanceSnapshot = (
  value: unknown
): value is FrontendPerformanceSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.totalShipments === 'number' &&
    typeof value.delayedShipments === 'number' &&
    typeof value.avgTransitHours === 'number'
  );
};
