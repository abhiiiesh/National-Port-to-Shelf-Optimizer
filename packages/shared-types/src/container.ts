import { Location, TransportMode } from './common';

export enum ContainerStatus {
  ON_VESSEL = 'ON_VESSEL',
  AT_PORT = 'AT_PORT',
  ON_RAIL = 'ON_RAIL',
  ON_TRUCK = 'ON_TRUCK',
  DELIVERED = 'DELIVERED',
}

export interface JourneyEvent {
  timestamp: Date;
  eventType: string;
  location: Location;
  transportMode: TransportMode;
  metadata: Record<string, unknown>;
}

export interface DemurrageInfo {
  arrivalAtPort: Date;
  freeTimeHours: number;
  demurrageStartTime: Date;
  demurrageCost: number;
  isPriority: boolean;
}

export interface Container {
  id: string; // ISO 6346 format
  ownerId: string; // Retailer ID
  currentLocation: Location;
  currentMode: TransportMode;
  status: ContainerStatus;
  journey: JourneyEvent[];
  demurrageInfo?: DemurrageInfo;
}

export interface ContainerRegistration {
  id: string;
  ownerId: string;
  vesselId: string;
  destinationWarehouse: string;
}

export interface ContainerQuery {
  ownerId?: string;
  status?: ContainerStatus;
  currentMode?: TransportMode;
  destinationWarehouse?: string;
}
