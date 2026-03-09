import { AuctionService } from '../../../auction/src/service';
import { PerformanceMetricsService } from '../../../performance-metrics/src/service';
import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { TransportMode } from '@port-to-shelf/shared-types';

describe('Task 16 Checkpoint - Core business logic complete', () => {
  test('auctions work end-to-end and metrics are calculated correctly', async () => {
    const bus = new InMemoryEventBus();

    const auctionService = new AuctionService(undefined, undefined, bus);
    const metricsService = new PerformanceMetricsService();
    metricsService.bindToEventBus(bus);

    const auction = await auctionService.createAuction({
      vesselId: 'v-core-16',
      portId: 'INNSA',
      slots: [
        {
          transportMode: TransportMode.RAIL,
          origin: 'INNSA',
          destination: 'INDEL',
          departureTime: new Date('2026-07-01T02:00:00.000Z'),
          capacity: 1,
          minimumBid: 100,
        },
      ],
      startTime: new Date('2026-07-01T00:00:00.000Z'),
      endTime: new Date('2099-07-01T06:00:00.000Z'),
    });

    const slotId = auction.slots[0].id;
    auctionService.registerContainerOwnership('CONT0000016', 'ret-16');

    await auctionService.submitBid({
      auctionId: auction.id,
      slotId,
      retailerId: 'ret-16',
      containerId: 'CONT0000016',
      bidAmount: 160,
    });

    const result = await auctionService.closeAuction(auction.id);
    expect(result.winners).toHaveLength(1);
    expect(result.winners[0].bid.bidAmount).toBe(160);

    await bus.publish({
      eventId: 'evt-auction-closed-metrics',
      eventType: 'auction.closed',
      timestamp: new Date('2026-07-01T07:00:00.000Z'),
      source: 'auction-service',
      version: 1,
      payload: {
        auctionId: auction.id,
        participantCount: 1,
        totalBids: 1,
        slotUtilization: {
          origin: 'INNSA',
          destination: 'INDEL',
          mode: 'RAIL',
          totalCapacity: 10,
          reservedCapacity: 8,
        },
      },
    });

    await bus.publish({
      eventId: 'evt-container-delivered-metrics',
      eventType: 'container.delivered',
      timestamp: new Date('2026-07-02T12:00:00.000Z'),
      source: 'container-tracking',
      version: 1,
      payload: {
        containerId: 'CONT0000016',
        journeyStartAt: '2026-07-01T00:00:00.000Z',
        deliveredAt: '2026-07-02T12:00:00.000Z',
        demurrageCost: 220,
      },
    });

    const report = metricsService.generateReport();
    expect(report.auctions.totalAuctions).toBe(2);
    expect(report.auctions.averageParticipationRate).toBe(0.5);
    expect(report.demurrage.totalCost).toBe(220);
    expect(report.timeline.completedJourneys).toBe(1);
    expect(report.slots.averageUtilizationRate).toBeCloseTo(0.8, 8);
  });
});
