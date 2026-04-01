import {
  type FrontendAuctionFeed,
  type FrontendAccessRequest,
  type FrontendActionMutationResult,
  type FrontendAuthToken,
  type FrontendAuthUser,
  type FrontendAuthValidation,
  isApiErrorEnvelope,
  isFrontendAuctionFeed,
  isFrontendAccessRequest,
  isFrontendActionMutationResult,
  isFrontendAuthToken,
  isFrontendAuthUser,
  isFrontendAuthValidation,
  type FrontendPerformanceSnapshot,
  type FrontendSlotRecommendation,
  type FrontendVesselSummary,
  isFrontendPerformanceSnapshot,
  isFrontendSlotRecommendation,
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

export const registerAuthUser = async (
  username: string,
  password: string,
  roles: string[]
): Promise<FrontendAuthUser> => {
  const payload = await fetchJson(
    '/auth/register',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username, password, roles }),
    },
    false
  );
  if (!isFrontendAuthUser(payload)) {
    throw new Error('Contract validation failed for auth register payload');
  }

  return payload;
};

export const createAccessRequest = async (
  request: FrontendAccessRequest
): Promise<FrontendAccessRequest> => {
  const payload = await fetchJson('/api/v1/access-control/requests', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  if (!isFrontendAccessRequest(payload)) {
    throw new Error('Contract validation failed for access request create payload');
  }

  return payload;
};

export const reviewAccessRequest = async (
  requestId: string,
  outcome: 'Approved' | 'Rejected'
): Promise<FrontendAccessRequest> => {
  const payload = await fetchJson(`/api/v1/access-control/requests/${requestId}/review`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ outcome }),
  });
  if (!isFrontendAccessRequest(payload)) {
    throw new Error('Contract validation failed for access request review payload');
  }

  return payload;
};

export const submitTrackingAction = async (
  trackingId: string,
  action: 'reroute' | 'escalate' | 'hold' | 'release'
): Promise<FrontendActionMutationResult> => {
  const payload = await fetchJson(`/api/v1/tracking/${trackingId}/actions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
  if (!isFrontendActionMutationResult(payload)) {
    throw new Error('Contract validation failed for tracking action payload');
  }

  return payload;
};

export const submitAuctionAction = async (
  auctionId: string,
  action: 'create-auction' | 'pause-auction' | 'close-auction' | 'award-auction' | 'reject-bid'
): Promise<FrontendActionMutationResult> => {
  const payload = await fetchJson(`/api/v1/auctions/${auctionId}/actions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
  if (!isFrontendActionMutationResult(payload)) {
    throw new Error('Contract validation failed for auction action payload');
  }

  return payload;
};

export const fetchSlotRecommendations = async (): Promise<FrontendSlotRecommendation[]> => {
  const payload = await fetchJson('/api/v1/slots/recommendations');
  if (!Array.isArray(payload) || !payload.every(isFrontendSlotRecommendation)) {
    throw new Error('Contract validation failed for slot recommendation payload');
  }

  return payload;
};

export const submitSlotOverride = async (
  recommendationId: string,
  allocation: number,
  reason: string
): Promise<FrontendActionMutationResult> => {
  const payload = await fetchJson(`/api/v1/slots/recommendations/${recommendationId}/override`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ allocation, reason }),
  });
  if (!isFrontendActionMutationResult(payload)) {
    throw new Error('Contract validation failed for slot override payload');
  }

  return payload;
};
