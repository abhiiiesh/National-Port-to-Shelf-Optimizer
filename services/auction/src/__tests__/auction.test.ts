import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { TransportMode } from '@port-to-shelf/shared-types';
import { AuctionService } from '../service';

describe('AuctionService edge cases', () => {
  test('auction with no bids closes with no winners', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v-edge-1',
      portId: 'INNSA',
      slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(),
      endTime: new Date('2099-01-01T00:00:00.000Z'),
    });

    const result = await service.closeAuction(auction.id);
    expect(result.winners).toHaveLength(0);
  });

  test('auction with single bid produces one accepted winner', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v-edge-2',
      portId: 'INNSA',
      slots: [{ transportMode: TransportMode.TRUCK, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(),
      endTime: new Date('2099-01-01T00:00:00.000Z'),
    });

    const slotId = auction.slots[0].id;
    service.registerContainerOwnership('CNTSINGLE1', 'ret-single');
    await service.submitBid({ auctionId: auction.id, slotId, retailerId: 'ret-single', containerId: 'CNTSINGLE1', bidAmount: 150 });

    const result = await service.closeAuction(auction.id);
    expect(result.winners).toHaveLength(1);
    expect(result.winners[0].bid.status).toBe('ACCEPTED');
  });

  test('bid on expired auction is rejected', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v-edge-3',
      portId: 'INNSA',
      slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date('2020-01-01T00:00:00.000Z'),
      endTime: new Date('2020-01-01T00:00:00.000Z'),
    });

    const slotId = auction.slots[0].id;
    service.registerContainerOwnership('CNTEXP0001', 'ret-exp');
    await expect(service.submitBid({ auctionId: auction.id, slotId, retailerId: 'ret-exp', containerId: 'CNTEXP0001', bidAmount: 120 })).rejects.toThrow('inactive or expired');
  });

  test('slot events can initiate auction via event bus integration', async () => {
    const bus = new InMemoryEventBus();
    const service = new AuctionService(undefined, undefined, bus);
    service.bindToEventBus(bus);

    await bus.publish({
      eventId: 'slot-res-evt',
      eventType: 'slot.reserved',
      timestamp: new Date(),
      source: 'slot-management',
      version: 1,
      payload: { slotId: 'slot-1', containerId: 'CNTBIND001' },
    });

    expect(service.listActiveAuctions().length).toBeGreaterThan(0);
  });

  test('backup creation and restoration recovers auction state', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v-backup',
      portId: 'INNSA',
      slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(),
      endTime: new Date('2099-01-01T00:00:00.000Z'),
    });

    const snapshot = service.createBackupSnapshot();
    const restored = new AuctionService();
    restored.restoreBackupSnapshot(snapshot);

    expect(restored.getAuction(auction.id)?.id).toBe(auction.id);
  });
});
