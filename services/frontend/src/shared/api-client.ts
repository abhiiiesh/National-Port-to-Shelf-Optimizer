import {
  type FrontendAuctionFeed,
  type FrontendAuthValidation,
  isApiErrorEnvelope,
  isFrontendAuctionFeed,
  isFrontendAuthValidation,
  type FrontendPerformanceSnapshot,
  type FrontendVesselSummary,
  isFrontendPerformanceSnapshot,
  isFrontendVesselSummary,
} from '../config/contracts';
import { getFrontendEnvironment } from '../config/environment';
import { getStoredAccessToken } from '../config/session';

const buildUrl = (path: string): string => {
  const env = getFrontendEnvironment();
  return `${env.apiGatewayBaseUrl}${path}`;
};

const fetchJson = async (path: string): Promise<unknown> => {
  const token = getStoredAccessToken();
  const response = await fetch(buildUrl(path), {
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
  });
  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    if (isApiErrorEnvelope(payload)) {
      throw new Error(`${payload.code}: ${payload.message}`);
    }

    throw new Error(`Request failed for ${path} with status ${response.status}`);
  }

  return payload;
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

export const fetchAuctions = async (): Promise<FrontendAuctionFeed[]> => {
  const payload = await fetchJson('/api/v1/auctions');
  if (!Array.isArray(payload) || !payload.every(isFrontendAuctionFeed)) {
    throw new Error('Contract validation failed for auctions payload');
  }

  return payload;
};

export const fetchAuthValidation = async (): Promise<FrontendAuthValidation> => {
  const payload = await fetchJson('/auth/validate');
  if (!isFrontendAuthValidation(payload)) {
    throw new Error('Contract validation failed for auth validation payload');
  }

  return payload;
};
