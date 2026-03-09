import fc from 'fast-check';
import { PerformanceReport } from '@port-to-shelf/shared-types';
import { PerformanceMetricsService } from '../service';

describe('Performance metrics properties (Task 15)', () => {
  test('Property 35: Port-to-Shelf Timeline Calculation', async () => {
    await fc.assert(
      fc.asyncProperty(fc.date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2035-12-31T23:59:59.999Z') }), fc.integer({ min: 0, max: 240 }), async (start, deltaHours) => {
        const service = new PerformanceMetricsService();
        const deliveredAt = new Date(start.getTime() + deltaHours * 60 * 60 * 1000);

        const metric = service.calculateTimelineMetric('C1', start, deliveredAt);
        expect(metric.durationHours).toBeCloseTo(deltaHours, 8);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 36: Average Demurrage Cost Calculation', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.double({ min: 0, max: 10000, noNaN: true }), { minLength: 1, maxLength: 20 }), async (costs) => {
        const service = new PerformanceMetricsService();
        costs.forEach((cost, idx) => {
          service.recordDemurrageMetric({ containerId: `C${idx}`, demurrageCost: cost, recordedAt: new Date() });
        });

        const result = service.calculateAverageDemurrageCost();
        const expected = costs.reduce((a, b) => a + b, 0) / costs.length;
        expect(result.averageCost).toBeCloseTo(expected, 8);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 37: Report Metrics Completeness', () => {
    const service = new PerformanceMetricsService();
    service.calculateTimelineMetric('C1', new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T12:00:00.000Z'));
    service.recordDemurrageMetric({ containerId: 'C1', demurrageCost: 200, recordedAt: new Date() });
    service.recordAuctionMetric({ auctionId: 'A1', participantCount: 3, totalBids: 5, recordedAt: new Date() });
    service.recordSlotMetric({
      route: { origin: 'INNSA', destination: 'INDEL' },
      mode: 'RAIL',
      totalCapacity: 10,
      reservedCapacity: 6,
      utilizationRate: 0.6,
      recordedAt: new Date(),
    });

    const report = service.generateReport();
    expect(report.timeline).toBeDefined();
    expect(report.demurrage).toBeDefined();
    expect(report.auctions).toBeDefined();
    expect(report.slots).toBeDefined();
  });

  test('Property 38: Auction Metrics Tracking', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 200 }), async (participants, bids) => {
        const service = new PerformanceMetricsService();
        service.recordAuctionMetric({ auctionId: 'A1', participantCount: participants, totalBids: bids, recordedAt: new Date() });

        const report = service.generateReport();
        expect(report.auctions.averageParticipationRate).toBe(participants);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 39: Baseline Comparison Metrics', () => {
    const service = new PerformanceMetricsService();
    service.calculateTimelineMetric('C1', new Date('2026-01-01T00:00:00.000Z'), new Date('2026-01-01T10:00:00.000Z'));
    service.recordDemurrageMetric({ containerId: 'C1', demurrageCost: 100, recordedAt: new Date() });
    service.recordAuctionMetric({ auctionId: 'A1', participantCount: 4, totalBids: 6, recordedAt: new Date() });
    service.recordSlotMetric({
      route: { origin: 'INNSA', destination: 'INDEL' }, mode: 'TRUCK',
      totalCapacity: 10, reservedCapacity: 5, utilizationRate: 0.5, recordedAt: new Date(),
    });

    const baseline: PerformanceReport = {
      generatedAt: new Date(),
      timeline: { completedJourneys: 1, averagePortToShelfHours: 8 },
      demurrage: { averageCost: 80, totalCost: 80 },
      auctions: { averageParticipationRate: 3, totalAuctions: 1 },
      slots: { averageUtilizationRate: 0.3 },
    };

    const report = service.generateReport(baseline);
    expect(report.baselineComparison).toBeDefined();
  });
});
