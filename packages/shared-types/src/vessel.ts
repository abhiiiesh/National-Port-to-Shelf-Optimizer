import { Position } from './common';

export enum VesselStatus {
  EN_ROUTE = 'EN_ROUTE',
  ARRIVED = 'ARRIVED',
  BERTHED = 'BERTHED',
  DEPARTED = 'DEPARTED',
}

export interface EstimatedArrival {
  portId: string;
  estimatedTime: Date;
  confidenceInterval: number; // hours
  lastUpdated: Date;
}

export interface ContainerManifest {
  totalContainers: number;
  containerIds: string[];
}

export interface Vessel {
  id: string;
  name: string;
  imoNumber: string;
  currentPosition: Position;
  estimatedArrival: EstimatedArrival;
  containerManifest: ContainerManifest;
  status: VesselStatus;
}

export interface VesselRegistration {
  name: string;
  imoNumber: string;
  initialPosition: Position;
  destinationPort: string;
  containerManifest: ContainerManifest;
}
