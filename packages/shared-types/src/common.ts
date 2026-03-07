// Common types and enums

export enum TransportMode {
  VESSEL = 'VESSEL',
  RAIL = 'RAIL',
  TRUCK = 'TRUCK',
}

export enum LocationType {
  PORT = 'PORT',
  RAIL_TERMINAL = 'RAIL_TERMINAL',
  WAREHOUSE = 'WAREHOUSE',
  IN_TRANSIT = 'IN_TRANSIT',
}

export interface Position {
  latitude: number;
  longitude: number;
  timestamp: Date;
  speed: number; // knots
  heading: number; // degrees
}

export interface Location {
  type: LocationType;
  id: string; // UN/LOCODE
  name: string;
  coordinates: Position;
}

export interface Route {
  origin: string; // UN/LOCODE
  destination: string; // UN/LOCODE
}

export interface OperatingHours {
  open: string;
  close: string;
  timezone: string;
}
