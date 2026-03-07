import { TransportMode } from './common';

export interface ULIPToken {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string[];
}

export interface EventMetadata {
  containerId?: string;
  vesselId?: string;
  location?: string; // UN/LOCODE
  transportMode?: TransportMode;
}

export interface ULIPEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  source: string;
  data: Record<string, unknown>;
  metadata: EventMetadata;
}

export interface EventSubscription {
  subscriptionId: string;
  eventTypes: string[];
  callback: (event: ULIPEvent) => Promise<void>;
}

export interface PortData {
  portId: string; // UN/LOCODE
  name: string;
  congestionLevel: number; // 0-1
  availableBerths: number;
  averageWaitTime: number; // hours
  gateOperatingHours: {
    open: string;
    close: string;
    timezone: string;
  };
}

export interface RailCapacity {
  route: { origin: string; destination: string };
  date: Date;
  availableWagons: number;
  capacity: number; // TEU
  transitTime: number; // hours
  cost: number;
}

export interface TruckAvailability {
  location: string; // UN/LOCODE
  date: Date;
  availableTrucks: number;
  fleetProviders: FleetProvider[];
}

export interface FleetProvider {
  id: string;
  name: string;
  availableCapacity: number; // TEU
  ratePerKm: number;
}

export interface RailBookingRequest {
  containerId: string;
  route: { origin: string; destination: string };
  departureDate: Date;
  capacity: number; // TEU
}

export interface TruckBookingRequest {
  containerId: string;
  pickupLocation: string; // UN/LOCODE
  deliveryLocation: string; // UN/LOCODE
  pickupDate: Date;
  fleetProviderId: string;
}

export enum CustomsClearanceStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  CLEARED = 'CLEARED',
  HELD = 'HELD',
  REJECTED = 'REJECTED',
}

export interface CustomsHold {
  reason: string;
  appliedDate: Date;
  expectedResolution: Date;
}

export interface CustomsStatus {
  containerId: string;
  status: CustomsClearanceStatus;
  clearanceDate?: Date;
  holds: CustomsHold[];
  documentsRequired: string[];
}

export interface Document {
  type: string;
  content: string;
  format: string;
}
