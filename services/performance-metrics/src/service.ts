import {
  DomainEvent,
  PerformanceReport,
  SlotUtilizationMetric,
  TimelineMetric,
  DemurrageMetric,
  AuctionParticipationMetric,
} from '@port-to-shelf/shared-types';
import { MetricsRepository } from './repository';

export interface EventSubscriber {
  subscribe(topic: string, consumerGroup: string, handler: (event: DomainEvent) => Promise<void>): unknown;
}

export class PerformanceMetricsService {
  constructor(private readonly repository = new MetricsRepository()) {}

  calculateTimelineMetric(containerId: string, startedAt: Date, deliveredAt: Date): TimelineMetric {
    const durationHours = Math.max(0, (deliveredAt.getTime() - startedAt.getTime()) / (60 * 60 * 1000));
    return this.repository.storeTimeline({ containerId, startedAt, deliveredAt, durationHours });
  }

  calculateAverageDemurrageCost(metrics?: DemurrageMetric[]): { averageCost: number; totalCost: number } {
    const records = metrics ?? this.repository.listDemurrage();
    if (records.length === 0) {
      return { averageCost: 0, totalCost: 0 };
    }

    const total = records.reduce((acc, record) => acc + record.demurrageCost, 0);
    return { averageCost: total / records.length, totalCost: total };
  }

  calculateAuctionParticipationRate(metrics?: AuctionParticipationMetric[]): number {
    const records = metrics ?? this.repository.listAuction();
    if (records.length === 0) {
      return 0;
    }

    return records.reduce((acc, item) => acc + item.participantCount, 0) / records.length;
  }

  calculateSlotUtilizationRate(metrics?: SlotUtilizationMetric[]): number {
    const records = metrics ?? this.repository.listSlot();
    if (records.length === 0) {
      return 0;
    }

    return records.reduce((acc, item) => acc + item.utilizationRate, 0) / records.length;
  }

  generateReport(baseline?: PerformanceReport): PerformanceReport {
    const timelines = this.repository.listTimeline();
    const demurrage = this.calculateAverageDemurrageCost();
    const auctionRate = this.calculateAuctionParticipationRate();
    const slotRate = this.calculateSlotUtilizationRate();

    const avgTimeline = timelines.length
      ? timelines.reduce((acc, t) => acc + t.durationHours, 0) / timelines.length
      : 0;

    const report: PerformanceReport = {
      generatedAt: new Date(),
      timeline: {
        completedJourneys: timelines.length,
        averagePortToShelfHours: avgTimeline,
      },
      demurrage,
      auctions: {
        averageParticipationRate: auctionRate,
        totalAuctions: this.repository.listAuction().length,
      },
      slots: {
        averageUtilizationRate: slotRate,
      },
    };

    if (baseline) {
      report.baselineComparison = {
        timelineDeltaHours: report.timeline.averagePortToShelfHours - baseline.timeline.averagePortToShelfHours,
        demurrageDelta: report.demurrage.averageCost - baseline.demurrage.averageCost,
        participationDelta: report.auctions.averageParticipationRate - baseline.auctions.averageParticipationRate,
        utilizationDelta: report.slots.averageUtilizationRate - baseline.slots.averageUtilizationRate,
      };
    }

    return report;
  }

  recordDemurrageMetric(metric: DemurrageMetric): DemurrageMetric {
    return this.repository.storeDemurrage(metric);
  }

  recordAuctionMetric(metric: AuctionParticipationMetric): AuctionParticipationMetric {
    return this.repository.storeAuction(metric);
  }

  recordSlotMetric(metric: SlotUtilizationMetric): SlotUtilizationMetric {
    return this.repository.storeSlot(metric);
  }

  bindToEventBus(subscriber: EventSubscriber): void {
    subscriber.subscribe('container.delivered', 'performance-metrics', async (event) => {
      const payload = event.payload as {
        containerId?: string;
        journeyStartAt?: string;
        deliveredAt?: string;
        demurrageCost?: number;
      };

      if (payload.containerId && payload.journeyStartAt && payload.deliveredAt) {
        this.calculateTimelineMetric(payload.containerId, new Date(payload.journeyStartAt), new Date(payload.deliveredAt));
      }

      if (payload.containerId && typeof payload.demurrageCost === 'number') {
        this.recordDemurrageMetric({
          containerId: payload.containerId,
          demurrageCost: payload.demurrageCost,
          recordedAt: event.timestamp,
        });
      }
    });

    subscriber.subscribe('auction.closed', 'performance-metrics', async (event) => {
      const payload = event.payload as {
        auctionId?: string;
        participantCount?: number;
        totalBids?: number;
        slotUtilization?: {
          origin: string;
          destination: string;
          mode: 'RAIL' | 'TRUCK';
          totalCapacity: number;
          reservedCapacity: number;
        };
      };

      if (payload.auctionId) {
        this.recordAuctionMetric({
          auctionId: payload.auctionId,
          participantCount: payload.participantCount ?? 0,
          totalBids: payload.totalBids ?? 0,
          recordedAt: event.timestamp,
        });
      }

      if (payload.slotUtilization) {
        const util = payload.slotUtilization;
        this.recordSlotMetric({
          route: { origin: util.origin, destination: util.destination },
          mode: util.mode,
          totalCapacity: util.totalCapacity,
          reservedCapacity: util.reservedCapacity,
          utilizationRate: util.totalCapacity > 0 ? util.reservedCapacity / util.totalCapacity : 0,
          recordedAt: event.timestamp,
        });
      }
    });
  }
}
