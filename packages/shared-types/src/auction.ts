import { TransportMode } from './common';

export enum AuctionStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum BidStatus {
  SUBMITTED = 'SUBMITTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  OUTBID = 'OUTBID',
}

export interface Slot {
  id: string;
  transportMode: TransportMode;
  origin: string; // UN/LOCODE
  destination: string; // UN/LOCODE
  departureTime: Date;
  capacity: number; // TEU (Twenty-foot Equivalent Unit)
  minimumBid: number;
}

export interface Auction {
  id: string;
  vesselId: string;
  portId: string;
  slots: Slot[];
  startTime: Date;
  endTime: Date;
  status: AuctionStatus;
  bids: Bid[];
}

export interface BidSubmission {
  auctionId: string;
  slotId: string;
  retailerId: string;
  containerId: string;
  bidAmount: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  slotId: string;
  retailerId: string;
  containerId: string;
  bidAmount: number;
  timestamp: Date;
  status: BidStatus;
}

export interface BookingConfirmation {
  bookingId: string;
  containerId: string;
  transportMode: TransportMode;
  route: { origin: string; destination: string };
  scheduledDeparture: Date;
  estimatedArrival: Date;
  cost: number;
  status: string;
}

export interface BidWinner {
  slotId: string;
  bid: Bid;
  booking: BookingConfirmation;
}

export interface AuctionResult {
  auctionId: string;
  winners: BidWinner[];
  closedAt: Date;
}

export interface AuctionCreation {
  vesselId: string;
  portId: string;
  slots: Omit<Slot, 'id'>[];
  startTime: Date;
  endTime: Date;
}
