import { TransportMode, Route } from './common';

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export interface SlotCreationRequest {
  vesselId: string;
  portId: string;
  predictedArrival: Date;
  containerCount: number;
  destinations: string[]; // UN/LOCODE
}

export interface Reservation {
  id: string;
  slotId: string;
  containerId: string;
  status: ReservationStatus;
  createdAt: Date;
  expiresAt: Date;
}

export interface CapacityInfo {
  mode: TransportMode;
  route: Route;
  totalCapacity: number; // TEU
  availableCapacity: number; // TEU
  reservedCapacity: number; // TEU
  utilizationRate: number; // 0-1
}
