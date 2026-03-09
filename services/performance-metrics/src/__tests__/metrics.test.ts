import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { PerformanceMetricsService } from '../service';

describe('PerformanceMetricsService edge cases', () => {
  test('metrics with no completed journeys are zero-safe', () => {
    const service = new PerformanceMetricsService();
    const report = service.generateReport();

    expect(report.timeline.completedJourneys).toBe(0);
    expect(report.timeline.averagePortToShelfHours).toBe(0);
  });

  test('metrics with zero demurrage costs remain zero', () => {
    const service = new PerformanceMetricsService();
    service.recordDemurrageMetric({ containerId: 'C1', demurrageCost: 0, recordedAt: new Date() });

    const dem = service.calculateAverageDemurrageCost();
    expect(dem.averageCost).toBe(0);
    expect(dem.totalCost).toBe(0);
  });

  test('report generation without baseline omits baseline comparison', () => {
    const service = new PerformanceMetricsService();
    const report = service.generateReport();

    expect(report.baselineComparison).toBeUndefined();
  });

  test('event bus integration records container and auction metrics', async () => {
    const bus = new InMemoryEventBus();
    const service = new PerformanceMetricsService();
    service.bindToEventBus(bus);

    await bus.publish({
      eventId: 'evt-cont-deliv',
      eventType: 'container.delivered',
      timestamp: new Date('2026-06-01T12:00:00.000Z'),
      source: 'container-tracking',
      version: 1,
      payload: {
        containerId: 'C100',
        journeyStartAt: '2026-06-01T00:00:00.000Z',
        deliveredAt: '2026-06-01T12:00:00.000Z',
        demurrageCost: 140,
      },
    });

    await bus.publish({
      eventId: 'evt-auct-closed',
      eventType: 'auction.closed',
      timestamp: new Date('2026-06-02T00:00:00.000Z'),
      source: 'auction-service',
      version: 1,
      payload: {
        auctionId: 'A100',
        participantCount: 5,
        totalBids: 9,
        slotUtilization: {
          origin: 'INNSA', destination: 'INDEL', mode: 'RAIL', totalCapacity: 10, reservedCapacity: 7,
        },
      },
    });

    const report = service.generateReport();
    expect(report.timeline.completedJourneys).toBe(1);
    expect(report.demurrage.totalCost).toBe(140);
    expect(report.auctions.totalAuctions).toBe(1);
    expect(report.slots.averageUtilizationRate).toBeCloseTo(0.7, 8);
  });
});
