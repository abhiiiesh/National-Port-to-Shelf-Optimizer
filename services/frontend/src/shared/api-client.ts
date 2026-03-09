import {
  type FrontendPerformanceSnapshot,
  type FrontendVesselSummary,
  isFrontendPerformanceSnapshot,
  isFrontendVesselSummary,
} from '../config/contracts';
import { getFrontendEnvironment } from '../config/environment';

const buildUrl = (path: string): string => {
  const env = getFrontendEnvironment();
  return `${env.apiGatewayBaseUrl}${path}`;
};

const fetchJson = async (path: string): Promise<unknown> => {
  const response = await fetch(buildUrl(path));
  return response.json();
};

export const fetchVessels = async (): Promise<FrontendVesselSummary[]> => {
  const payload = await fetchJson('/api/v1/vessels');
  if (!Array.isArray(payload) || !payload.every(isFrontendVesselSummary)) {
    throw new Error('Contract validation failed for vessels payload');
  }

  return payload;
};

export const fetchPerformance = async (): Promise<FrontendPerformanceSnapshot> => {
  const payload = await fetchJson('/api/v1/metrics/performance');
  if (!isFrontendPerformanceSnapshot(payload)) {
    throw new Error('Contract validation failed for performance payload');
  }

  return payload;
};
