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

export interface FrontendAuctionSlot {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  minimumBid: number;
  capacity: number;
}

export interface FrontendAuctionBid {
  id: string;
  retailerId: string;
  containerId: string;
  bidAmount: number;
  timestamp: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'OUTBID';
}

export interface FrontendAuctionFeed {
  id: string;
  vesselId: string;
  portId: string;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  slots: FrontendAuctionSlot[];
  bids: FrontendAuctionBid[];
}

export interface FrontendAuthValidation {
  valid: boolean;
  userId?: string;
  roles?: string[];
}

export interface FrontendAuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  roles: string[];
}

export interface FrontendAuthUser {
  id: string;
  username: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FrontendAccessRequest {
  requestId: string;
  requesterName: string;
  team: string;
  currentRole: string;
  requestedRole: string;
  requestedBy: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  reason: string;
  tenant: string;
  submittedAt: string;
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

const isFrontendAuctionSlot = (value: unknown): value is FrontendAuctionSlot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.origin === 'string' &&
    typeof value.destination === 'string' &&
    typeof value.departureTime === 'string' &&
    typeof value.minimumBid === 'number' &&
    typeof value.capacity === 'number'
  );
};

const isFrontendAuctionBid = (value: unknown): value is FrontendAuctionBid => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.retailerId === 'string' &&
    typeof value.containerId === 'string' &&
    typeof value.bidAmount === 'number' &&
    typeof value.timestamp === 'string' &&
    (value.status === 'SUBMITTED' ||
      value.status === 'ACCEPTED' ||
      value.status === 'REJECTED' ||
      value.status === 'OUTBID')
  );
};

export const isFrontendAuctionFeed = (value: unknown): value is FrontendAuctionFeed => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.vesselId === 'string' &&
    typeof value.portId === 'string' &&
    typeof value.startTime === 'string' &&
    typeof value.endTime === 'string' &&
    (value.status === 'PENDING' ||
      value.status === 'ACTIVE' ||
      value.status === 'CLOSED' ||
      value.status === 'CANCELLED') &&
    Array.isArray(value.slots) &&
    value.slots.every(isFrontendAuctionSlot) &&
    Array.isArray(value.bids) &&
    value.bids.every(isFrontendAuctionBid)
  );
};

export const isFrontendAuthValidation = (value: unknown): value is FrontendAuthValidation => {
  if (!isRecord(value) || typeof value.valid !== 'boolean') {
    return false;
  }

  return (
    (value.userId === undefined || typeof value.userId === 'string') &&
    (value.roles === undefined ||
      (Array.isArray(value.roles) && value.roles.every((role) => typeof role === 'string')))
  );
};

export const isFrontendAuthToken = (value: unknown): value is FrontendAuthToken => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.accessToken === 'string' &&
    typeof value.refreshToken === 'string' &&
    typeof value.expiresIn === 'number' &&
    typeof value.userId === 'string' &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string')
  );
};

export const isFrontendAuthUser = (value: unknown): value is FrontendAuthUser => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.username === 'string' &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => typeof role === 'string') &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
};

export const isFrontendAccessRequest = (value: unknown): value is FrontendAccessRequest => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.requestId === 'string' &&
    typeof value.requesterName === 'string' &&
    typeof value.team === 'string' &&
    typeof value.currentRole === 'string' &&
    typeof value.requestedRole === 'string' &&
    typeof value.requestedBy === 'string' &&
    (value.status === 'Pending Approval' ||
      value.status === 'Approved' ||
      value.status === 'Rejected') &&
    typeof value.reason === 'string' &&
    typeof value.tenant === 'string' &&
    typeof value.submittedAt === 'string'
  );
};
