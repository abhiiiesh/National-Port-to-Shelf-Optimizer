import {
  type FrontendAuctionFeed,
  type FrontendAuthToken,
  type FrontendAuthValidation,
  isApiErrorEnvelope,
  isFrontendAuctionFeed,
  isFrontendAuthToken,
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

const fetchJson = async (
  path: string,
  init: RequestInit = {},
  includeStoredAuth = true
): Promise<unknown> => {
  const token = includeStoredAuth ? getStoredAccessToken() : null;
  const headers = {
    ...(init.headers ?? {}),
    ...(token
      ? {
          authorization: `Bearer ${token}`,
        }
      : {}),
  };
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
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

export const loginToAuthService = async (
  username: string,
  password: string
): Promise<FrontendAuthToken> => {
  const payload = await fetchJson(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    },
    false
  );
  if (!isFrontendAuthToken(payload)) {
    throw new Error('Contract validation failed for auth login payload');
  }

  return payload;
};
