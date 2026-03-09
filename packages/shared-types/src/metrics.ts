export interface TimelineMetric {
  containerId: string;
  startedAt: Date;
  deliveredAt: Date;
  durationHours: number;
}

export interface DemurrageMetric {
  containerId: string;
  demurrageCost: number;
  recordedAt: Date;
}

export interface AuctionParticipationMetric {
  auctionId: string;
  participantCount: number;
  totalBids: number;
  recordedAt: Date;
}

export interface SlotUtilizationMetric {
  route: { origin: string; destination: string };
  mode: 'RAIL' | 'TRUCK';
  totalCapacity: number;
  reservedCapacity: number;
  utilizationRate: number;
  recordedAt: Date;
}

export interface PerformanceReport {
  generatedAt: Date;
  timeline: {
    completedJourneys: number;
    averagePortToShelfHours: number;
  };
  demurrage: {
    averageCost: number;
    totalCost: number;
  };
  auctions: {
    averageParticipationRate: number;
    totalAuctions: number;
  };
  slots: {
    averageUtilizationRate: number;
  };
  baselineComparison?: {
    timelineDeltaHours: number;
    demurrageDelta: number;
    participationDelta: number;
    utilizationDelta: number;
  };
}
