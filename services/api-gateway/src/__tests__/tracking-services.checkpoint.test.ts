import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { ContainerTrackingService } from '../../../container-tracking/src/service';
import { VesselTrackingService } from '../../../vessel-tracking/src/service';
import { LocationType, TransportMode } from '@port-to-shelf/shared-types';

function createLocation(id: string, type: LocationType) {
  return {
    type,
    id,
    name: `${id}-name`,
    coordinates: {
      latitude: 19.1,
      longitude: 72.8,
      timestamp: new Date('2026-02-01T00:00:00.000Z'),
      speed: 0,
      heading: 0,
    },
  };
}

describe('Task 10 Checkpoint - Tracking services', () => {
  test('vessels and containers can be tracked and events are published', async () => {
    const bus = new InMemoryEventBus();
    const publishedEventTypes: string[] = [];

    bus.subscribe('vessel.position.updated', 'checkpoint-group', async (event) => {
      publishedEventTypes.push(event.eventType);
    });
    bus.subscribe('vessel.arrived', 'checkpoint-group', async (event) => {
      publishedEventTypes.push(event.eventType);
    });
    bus.subscribe('container.mode.changed', 'checkpoint-group', async (event) => {
      publishedEventTypes.push(event.eventType);
    });
    bus.subscribe('container.delivered', 'checkpoint-group', async (event) => {
      publishedEventTypes.push(event.eventType);
    });

    const vesselService = new VesselTrackingService(undefined, bus);
    const containerService = new ContainerTrackingService(undefined, bus);

    const vessel = await vesselService.registerVessel({
      name: 'BCSL Test Vessel',
      imoNumber: 'IMO4567890',
      initialPosition: {
        latitude: 18.95,
        longitude: 72.82,
        timestamp: new Date('2026-02-01T01:00:00.000Z'),
        speed: 12,
        heading: 90,
      },
      destinationPort: 'INNSA',
      containerManifest: {
        totalContainers: 1,
        containerIds: ['ABCD1234567'],
      },
    });

    const container = await containerService.createContainer({
      id: 'ABCD1234567',
      ownerId: 'ret-10',
      vesselId: vessel.id,
      destinationWarehouse: 'WH_CHN',
    });

    await vesselService.updatePosition(vessel.id, {
      latitude: 19.0,
      longitude: 72.9,
      timestamp: new Date('2026-02-01T03:00:00.000Z'),
      speed: 11,
      heading: 95,
    });
    await vesselService.recordArrival(vessel.id, new Date('2026-02-01T10:00:00.000Z'));

    await containerService.updateTransportMode(
      container.id,
      TransportMode.TRUCK,
      createLocation('INNSA', LocationType.PORT),
      new Date('2026-02-01T11:00:00.000Z')
    );
    await containerService.markDelivered(
      container.id,
      createLocation('INCHN', LocationType.WAREHOUSE),
      new Date('2026-02-02T08:00:00.000Z')
    );

    const trackedVessel = vesselService.getVessel(vessel.id);
    const trackedContainer = containerService.getContainer(container.id);

    expect(trackedVessel?.id).toBe(vessel.id);
    expect(trackedContainer?.id).toBe(container.id);
    expect(trackedContainer?.status).toBe('DELIVERED');

    expect(publishedEventTypes).toContain('vessel.position.updated');
    expect(publishedEventTypes).toContain('vessel.arrived');
    expect(publishedEventTypes).toContain('container.mode.changed');
    expect(publishedEventTypes).toContain('container.delivered');
  });
});
