import { DomainEvent, Location, LocationType, TransportMode, VesselStatus } from '@port-to-shelf/shared-types';
import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { VesselTrackingService } from '../../../vessel-tracking/src/service';
import { PredictionService } from '../../../ai-prediction/src/service';
import { SlotManagementService } from '../../../slot-management/src/service';
import { AuctionService } from '../../../auction/src/service';
import { ContainerTrackingService } from '../../../container-tracking/src/service';
import { ULIPIntegrationService } from '../../../ulip-integration/src/service';

describe('Task 31 Integration testing and end-to-end flows', () => {
  const createLocation = (type: LocationType, id: string, latitude = 19.076, longitude = 72.8777): Location => ({
    type,
    id,
    name: `${type}-${id}`,
    coordinates: {
      latitude,
      longitude,
      timestamp: new Date('2026-05-01T00:00:00.000Z'),
      speed: 0,
      heading: 0,
    },
  });

  test('31.1 vessel enters waters -> prediction -> slots created -> auction initiated', async () => {
    const bus = new InMemoryEventBus();

    const vesselService = new VesselTrackingService(undefined, bus);
    const predictionService = new PredictionService(undefined, bus);
    const slotService = new SlotManagementService(undefined, undefined, bus);
    const auctionService = new AuctionService(undefined, undefined, bus);

    predictionService.bindToEventBus(bus);
    slotService.bindToEventBus(bus);
    auctionService.bindToEventBus(bus);

    slotService.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INMUM', destination: 'INDEL' },
      totalCapacity: 5,
      availableCapacity: 5,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const vessel = await vesselService.registerVessel({
      name: 'MV Integration',
      imoNumber: '1234567',
      destinationPort: 'INMUM',
      initialPosition: {
        latitude: 18.9,
        longitude: 72.7,
        timestamp: new Date('2026-05-01T00:00:00.000Z'),
        speed: 12,
        heading: 85,
      },
      containerManifest: { totalContainers: 50, containerIds: ['ABCD1234567'] },
    });

    await vesselService.updatePosition(vessel.id, {
      latitude: 19,
      longitude: 72.8,
      timestamp: new Date('2026-05-01T01:00:00.000Z'),
      speed: 13,
      heading: 90,
    });

    await predictionService.predictArrival({
      vesselId: vessel.id,
      portId: 'INMUM',
      status: VesselStatus.EN_ROUTE,
      currentSpeed: 13,
      distanceRemaining: 120,
      historicalAverageSpeed: 12,
      portCongestion: 0.15,
      timestamp: new Date('2026-05-01T01:00:00.000Z'),
    });

    await bus.publish({
      eventId: 'task31-slot-input',
      eventType: 'prediction.generated',
      timestamp: new Date('2026-05-01T01:05:00.000Z'),
      source: 'ai-prediction',
      version: 1,
      payload: {
        vesselId: vessel.id,
        portId: 'INMUM',
        containerCount: 2,
        destinations: ['INDEL'],
      },
    });

    const slots = slotService.listSlots().filter((slot) => slot.destination === 'INDEL');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].capacity).toBeGreaterThan(0);

    await slotService.reserveSlot(slots[0].id, 'ABCD1234567');

    const activeAuctions = auctionService.listActiveAuctions();
    expect(activeAuctions.length).toBeGreaterThan(0);
    expect(bus.getEvents('auction.created').length).toBeGreaterThan(0);
  });

  test('31.2 container journey flow reaches delivered state across all transport modes', async () => {
    const service = new ContainerTrackingService();
    const containerId = 'WXYZ7654321';

    await service.createContainer({
      id: containerId,
      ownerId: 'retailer-1',
      vesselId: 'vessel-1',
      destinationWarehouse: 'INDEL',
    });

    const atPort = await service.updateTransportMode(
      containerId,
      TransportMode.VESSEL,
      createLocation(LocationType.PORT, 'INMUM'),
      new Date('2026-05-02T00:00:00.000Z')
    );
    expect(atPort.status).toBe('AT_PORT');

    const onRail = await service.updateTransportMode(
      containerId,
      TransportMode.RAIL,
      createLocation(LocationType.RAIL_TERMINAL, 'INMUT'),
      new Date('2026-05-02T06:00:00.000Z')
    );
    expect(onRail.status).toBe('ON_RAIL');

    const onTruck = await service.updateTransportMode(
      containerId,
      TransportMode.TRUCK,
      createLocation(LocationType.IN_TRANSIT, 'INHIG'),
      new Date('2026-05-02T12:00:00.000Z')
    );
    expect(onTruck.status).toBe('ON_TRUCK');

    const delivered = await service.markDelivered(
      containerId,
      createLocation(LocationType.WAREHOUSE, 'INDEL'),
      new Date('2026-05-02T18:00:00.000Z')
    );

    const journey = service.getContainerJourney(containerId);

    expect(delivered.status).toBe('DELIVERED');
    expect(journey.map((event) => event.eventType)).toEqual([
      'container.created',
      'container.mode.changed',
      'container.mode.changed',
      'container.mode.changed',
      'container.delivered',
    ]);
  });

  test('31.3 auction bidding flow picks winners and emits closure notification', async () => {
    const bus = new InMemoryEventBus();
    const auctionService = new AuctionService(undefined, undefined, bus);

    const start = new Date('2026-05-03T00:00:00.000Z');
    const auction = await auctionService.createAuction({
      vesselId: 'v-auc-31',
      portId: 'INMUM',
      slots: [
        {
          transportMode: TransportMode.RAIL,
          origin: 'INMUM',
          destination: 'INDEL',
          departureTime: new Date('2026-05-03T04:00:00.000Z'),
          capacity: 1,
          minimumBid: 100,
        },
      ],
      startTime: start,
      endTime: new Date(start.getTime() + 60 * 60 * 1000),
    });

    auctionService.registerContainerOwnership('ABCD1234567', 'retailer-A');
    auctionService.registerContainerOwnership('EFGH1234567', 'retailer-A');

    await auctionService.submitBid({
      auctionId: auction.id,
      slotId: auction.slots[0].id,
      retailerId: 'retailer-A',
      containerId: 'ABCD1234567',
      bidAmount: 500,
    });

    await auctionService.submitBid({
      auctionId: auction.id,
      slotId: auction.slots[0].id,
      retailerId: 'retailer-A',
      containerId: 'EFGH1234567',
      bidAmount: 700,
    });

    const result = await auctionService.closeAuction(auction.id);

    expect(result.winners).toHaveLength(1);
    expect(result.winners[0].bid.bidAmount).toBe(700);
    expect(bus.getEvents('bid.submitted')).toHaveLength(2);
    expect(bus.getEvents('auction.closed')).toHaveLength(1);
    expect((bus.getEvents('auction.closed')[0].payload as { winnerCount: number }).winnerCount).toBe(1);
  });

  test('31.4 ULIP synchronization flow publishes container event and receives inbound subscriber event', async () => {
    const calledUrls: string[] = [];
    const receivedEventIds: string[] = [];

    const service = new ULIPIntegrationService(
      {
        clientId: 'task31-client',
        clientSecret: 'task31-secret',
        tokenEndpoint: 'https://ulip.example/token',
        defaultScope: ['events:write'],
      },
      {
        post: async (url: string) => {
          calledUrls.push(url);
          if (url.includes('/token')) {
            return { accessToken: 'task31-token', tokenType: 'Bearer', expiresIn: 3600, scope: ['events:write'] };
          }
          return { ok: true };
        },
      }
    );

    await service.publishEvent({
      eventId: 'task31-container-event',
      eventType: 'container.mode.changed',
      timestamp: new Date('2026-05-04T00:00:00.000Z'),
      source: 'container-tracking',
      data: { containerId: 'ABCD1234567', mode: 'RAIL' },
      metadata: { containerId: 'ABCD1234567', location: 'INMUM' },
    });

    const bus = new InMemoryEventBus();
    service.subscribeToEvents(bus, async (event) => {
      receivedEventIds.push(event.eventId);
    });

    const inboundContainerEvent: DomainEvent = {
      eventId: 'task31-road-sync-1',
      eventType: 'road.transport.updated' as any,
      timestamp: new Date('2026-05-04T01:00:00.000Z'),
      source: 'road-provider',
      version: 1,
      payload: { containerId: 'ABCD1234567', status: 'en-route' },
    };

    await bus.publish(inboundContainerEvent);

    expect(calledUrls.some((url) => url.includes('/events'))).toBe(true);
    expect(receivedEventIds).toEqual(['task31-road-sync-1']);
  });

  test('31.5 demurrage priority flow flags priority container and creates prioritized slots for auction', async () => {
    const bus = new InMemoryEventBus();
    const containerService = new ContainerTrackingService(undefined, bus, { demurrageFreeHours: 12 });
    const slotService = new SlotManagementService(undefined, undefined, bus);
    const auctionService = new AuctionService(undefined, undefined, bus);

    await containerService.createContainer({
      id: 'IJKL1234567',
      ownerId: 'retailer-priority',
      vesselId: 'v-priority',
      destinationWarehouse: 'INDEL',
    });

    const atPort = await containerService.updateTransportMode(
      'IJKL1234567',
      TransportMode.VESSEL,
      createLocation(LocationType.PORT, 'INMUM'),
      new Date('2026-05-05T00:00:00.000Z')
    );

    expect(atPort.demurrageInfo?.isPriority).toBe(true);
    expect(bus.getEvents('demurrage.alert')).toHaveLength(1);

    slotService.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INMUM', destination: 'INDEL' },
      totalCapacity: 3,
      availableCapacity: 3,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const prioritizedSlots = slotService.createSlots(
      {
        vesselId: 'v-priority',
        portId: 'INMUM',
        predictedArrival: new Date('2026-05-05T06:00:00.000Z'),
        containerCount: 1,
        destinations: ['INDEL'],
      },
      { highPriorityContainers: 1 }
    );

    expect(prioritizedSlots[0].priorityScore).toBe(100);

    const auction = await auctionService.createAuction({
      vesselId: 'v-priority',
      portId: 'INMUM',
      slots: [
        {
          transportMode: prioritizedSlots[0].mode,
          origin: prioritizedSlots[0].origin,
          destination: prioritizedSlots[0].destination,
          departureTime: prioritizedSlots[0].departureTime,
          capacity: prioritizedSlots[0].capacity,
          minimumBid: 100,
        },
      ],
      startTime: new Date('2026-05-05T06:00:00.000Z'),
      endTime: new Date('2026-05-05T07:00:00.000Z'),
    });

    expect(auction.slots[0].destination).toBe('INDEL');
    expect(auction.status).toBe('ACTIVE');
  });
});
