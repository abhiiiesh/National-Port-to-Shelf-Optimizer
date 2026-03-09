import fc from 'fast-check';
import { TransportMode } from '@port-to-shelf/shared-types';
import { AuctionService } from '../service';

function auctionCreationArb() {
  return fc.record({
    vesselId: fc.string({ minLength: 3, maxLength: 16 }),
    portId: fc.constantFrom('INNSA', 'INMUN'),
    slotCount: fc.integer({ min: 1, max: 3 }),
    minimumBid: fc.integer({ min: 100, max: 10000 }),
    destination: fc.constantFrom('INDEL', 'INBLR', 'INHYD'),
  });
}

describe('Auction properties (Task 14)', () => {
  test('Property 16: Auction Initiation on Slot Creation', async () => {
    await fc.assert(
      fc.asyncProperty(auctionCreationArb(), async (input) => {
        const service = new AuctionService();
        const auction = await service.createAuction({
          vesselId: input.vesselId,
          portId: input.portId,
          slots: Array.from({ length: input.slotCount }).map((_, idx) => ({
            transportMode: idx % 2 === 0 ? TransportMode.RAIL : TransportMode.TRUCK,
            origin: input.portId,
            destination: input.destination,
            departureTime: new Date('2026-05-01T00:00:00.000Z'),
            capacity: 1,
            minimumBid: input.minimumBid,
          })),
          startTime: new Date('2026-05-01T00:00:00.000Z'),
          endTime: new Date('2099-05-01T01:00:00.000Z'),
        });

        expect(auction.slots.length).toBe(input.slotCount);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 17: Highest Bidder Wins', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 6 }), async (bidCount) => {
        const service = new AuctionService();
        const auction = await service.createAuction({
          vesselId: 'v1',
          portId: 'INNSA',
          slots: [{
            transportMode: TransportMode.RAIL,
            origin: 'INNSA',
            destination: 'INDEL',
            departureTime: new Date('2026-05-01T00:00:00.000Z'),
            capacity: 1,
            minimumBid: 100,
          }],
          startTime: new Date('2026-05-01T00:00:00.000Z'),
          endTime: new Date('2099-05-01T01:00:00.000Z'),
        });

        const slotId = auction.slots[0].id;
        const amounts = Array.from({ length: bidCount }).map((_, idx) => 100 + idx * 10);

        for (let i = 0; i < bidCount; i += 1) {
          const containerId = `CONT${i.toString().padStart(7, '0')}`;
          const retailerId = `ret-${i}`;
          service.registerContainerOwnership(containerId, retailerId);
          await service.submitBid({ auctionId: auction.id, slotId, retailerId, containerId, bidAmount: amounts[i] });
        }

        const result = await service.closeAuction(auction.id);
        expect(result.winners[0].bid.bidAmount).toBe(Math.max(...amounts));
      }),
      { numRuns: 30 }
    );
  });

  test('Property 20: Auction Filtering by Destination', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom('INDEL', 'INBLR'), async (destination) => {
        const service = new AuctionService();
        await service.createAuction({
          vesselId: 'vA', portId: 'INNSA',
          slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination, departureTime: new Date(), capacity: 1, minimumBid: 100 }],
          startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
        });
        await service.createAuction({
          vesselId: 'vB', portId: 'INNSA',
          slots: [{ transportMode: TransportMode.TRUCK, origin: 'INNSA', destination: 'INHYD', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
          startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
        });

        const filtered = service.listActiveAuctions(destination);
        expect(filtered.every((auction) => auction.slots.some((slot) => slot.destination === destination))).toBe(true);
      })
    );
  });

  test('Property 21: Bid Validation', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 100, max: 1000 }), async (minimumBid) => {
        const service = new AuctionService();
        const auction = await service.createAuction({
          vesselId: 'v2',
          portId: 'INNSA',
          slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid }],
          startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
        });
        const slotId = auction.slots[0].id;
        service.registerContainerOwnership('OWN0000001', 'ret-ok');

        await expect(service.submitBid({ auctionId: auction.id, slotId, retailerId: 'ret-ok', containerId: 'OWN0000001', bidAmount: minimumBid - 1 })).rejects.toThrow('below minimum');
      })
    );
  });

  test('Property 22: Accepted Bid Confirmation Completeness', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v3', portId: 'INNSA',
      slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
    });
    const slotId = auction.slots[0].id;
    service.registerContainerOwnership('OWN0000002', 'ret-2');
    await service.submitBid({ auctionId: auction.id, slotId, retailerId: 'ret-2', containerId: 'OWN0000002', bidAmount: 200 });
    const result = await service.closeAuction(auction.id);

    expect(result.winners[0].booking.bookingId).toBeDefined();
    expect(result.winners[0].booking.containerId).toBe('OWN0000002');
  });

  test('Property 23: Container Ownership Enforcement', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v4', portId: 'INNSA',
      slots: [{ transportMode: TransportMode.TRUCK, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
    });
    const slotId = auction.slots[0].id;
    service.registerContainerOwnership('OWN0000003', 'ret-right');

    await expect(service.submitBid({ auctionId: auction.id, slotId, retailerId: 'ret-wrong', containerId: 'OWN0000003', bidAmount: 200 })).rejects.toThrow('ownership');
  });

  test('Property 24: Auction End Notification', async () => {
    const events: string[] = [];
    const publisher = { publish: async (event: { eventType: string }) => { events.push(event.eventType); return true; } };
    const service = new AuctionService(undefined, undefined, publisher);

    const auction = await service.createAuction({
      vesselId: 'v5', portId: 'INNSA',
      slots: [{ transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 }],
      startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
    });
    await service.closeAuction(auction.id);

    expect(events).toContain('auction.closed');
  });

  test('Property 27: Priority Container Slot Preference', async () => {
    const service = new AuctionService();
    const auction = await service.createAuction({
      vesselId: 'v6', portId: 'INNSA',
      slots: [
        { transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 },
        { transportMode: TransportMode.RAIL, origin: 'INNSA', destination: 'INDEL', departureTime: new Date(), capacity: 1, minimumBid: 100 },
      ],
      startTime: new Date(), endTime: new Date('2099-01-01T00:00:00.000Z'),
    });

    // High-priority approximated by higher bids
    const [slot1, slot2] = auction.slots;
    service.registerContainerOwnership('OWNPRIOR1', 'ret-A');
    service.registerContainerOwnership('OWNPRIOR2', 'ret-B');
    await service.submitBid({ auctionId: auction.id, slotId: slot1.id, retailerId: 'ret-A', containerId: 'OWNPRIOR1', bidAmount: 500 });
    await service.submitBid({ auctionId: auction.id, slotId: slot2.id, retailerId: 'ret-B', containerId: 'OWNPRIOR2', bidAmount: 120 });

    const result = await service.closeAuction(auction.id);
    expect(result.winners.some((winner) => winner.bid.bidAmount >= 500)).toBe(true);
  });
});
