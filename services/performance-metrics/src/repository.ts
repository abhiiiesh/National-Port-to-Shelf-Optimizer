import {
  AuctionParticipationMetric,
  DemurrageMetric,
  SlotUtilizationMetric,
  TimelineMetric,
} from '@port-to-shelf/shared-types';

export class MetricsRepository {
  private readonly timelineMetrics: TimelineMetric[] = [];
  private readonly demurrageMetrics: DemurrageMetric[] = [];
  private readonly auctionMetrics: AuctionParticipationMetric[] = [];
  private readonly slotMetrics: SlotUtilizationMetric[] = [];

  storeTimeline(metric: TimelineMetric): TimelineMetric {
    this.timelineMetrics.push(metric);
    return metric;
  }

  listTimeline(): TimelineMetric[] {
    return [...this.timelineMetrics];
  }

  storeDemurrage(metric: DemurrageMetric): DemurrageMetric {
    this.demurrageMetrics.push(metric);
    return metric;
  }

  listDemurrage(): DemurrageMetric[] {
    return [...this.demurrageMetrics];
  }

  storeAuction(metric: AuctionParticipationMetric): AuctionParticipationMetric {
    this.auctionMetrics.push(metric);
    return metric;
  }

  listAuction(): AuctionParticipationMetric[] {
    return [...this.auctionMetrics];
  }

  storeSlot(metric: SlotUtilizationMetric): SlotUtilizationMetric {
    this.slotMetrics.push(metric);
    return metric;
  }

  listSlot(): SlotUtilizationMetric[] {
    return [...this.slotMetrics];
  }
}
