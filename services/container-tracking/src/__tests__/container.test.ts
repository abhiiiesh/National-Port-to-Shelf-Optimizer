import { ContainerStatus, Location, LocationType, TransportMode } from '@port-to-shelf/shared-types';
import { ContainerRepository } from '../repository';
import { ContainerTrackingService } from '../service';

function validLocation(id = 'INNSA', type = LocationType.PORT): Location {
  return {
    type,
    id,
    name: 'Sample Location',
    coordinates: {
      latitude: 10,
      longitude: 72,
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      speed: 0,
      heading: 0,
    },
  };
}

describe('ContainerTrackingService edge cases', () => {
  test('rejects invalid ISO 6346 container ID', async () => {
    const service = new ContainerTrackingService();

    await expect(
      service.createContainer({
        id: 'BAD123',
        ownerId: 'ret-1',
        vesselId: 'v-1',
        destinationWarehouse: 'WH_MUM',
      })
    ).rejects.toThrow('Invalid ISO 6346');
  });

  test('rejects invalid UN/LOCODE', async () => {
    const service = new ContainerTrackingService();
    const created = await service.createContainer({
      id: 'ABCD1234567',
      ownerId: 'ret-1',
      vesselId: 'v-1',
      destinationWarehouse: 'WH_MUM',
    });

    await expect(
      service.updateTransportMode(created.id, TransportMode.TRUCK, {
        ...validLocation('12BAD'),
        id: '12BAD',
      })
    ).rejects.toThrow('Invalid UN/LOCODE');
  });

  test('container with no additional journey events returns creation event only', async () => {
    const service = new ContainerTrackingService();
    const created = await service.createContainer({
      id: 'WXYZ7654321',
      ownerId: 'ret-2',
      vesselId: 'v-2',
      destinationWarehouse: 'WH_DEL',
    });

    const journey = service.getContainerJourney(created.id);

    expect(journey).toHaveLength(1);
    expect(journey[0].eventType).toBe('container.created');
  });

  test('publishes mode change, demurrage alert and delivered events', async () => {
    const events: string[] = [];
    const publisher = {
      publish: async (event: { eventType: string }) => {
        events.push(event.eventType);
        return true;
      },
    };

    const service = new ContainerTrackingService(undefined, publisher);
    const created = await service.createContainer({
      id: 'EFGH1234567',
      ownerId: 'ret-3',
      vesselId: 'v-3',
      destinationWarehouse: 'WH_BLR',
    });

    await service.updateTransportMode(
      created.id,
      TransportMode.TRUCK,
      validLocation('INNSA', LocationType.PORT),
      new Date('2026-01-01T00:00:00.000Z')
    );

    await service.updateTransportMode(
      created.id,
      TransportMode.TRUCK,
      validLocation('INNSA', LocationType.PORT),
      new Date('2026-01-03T12:30:00.000Z')
    );

    const delivered = await service.markDelivered(
      created.id,
      validLocation('INDEL', LocationType.WAREHOUSE),
      new Date('2026-01-03T14:00:00.000Z')
    );

    expect(delivered.status).toBe(ContainerStatus.DELIVERED);
    expect(events).toContain('container.mode.changed');
    expect(events).toContain('demurrage.alert');
    expect(events).toContain('container.delivered');
  });

  test('backup creation and restoration recovers container state', async () => {
    const service = new ContainerTrackingService();
    const container = await service.createContainer({
      id: 'REST1234567',
      ownerId: 'ret-restore',
      vesselId: 'v-restore',
      destinationWarehouse: 'WH_DEL',
    });

    const snapshot = service.createBackupSnapshot();
    const restored = new ContainerTrackingService();
    restored.restoreBackupSnapshot(snapshot);

    expect(restored.getContainer(container.id)?.id).toBe(container.id);
  });

  test('transaction rollback on error restores previous repository state', () => {
    const repository = new ContainerRepository();

    expect(() => {
      repository.executeTransaction(() => {
        repository.create({
          id: 'ROLL1234567',
          ownerId: 'ret-roll',
          currentLocation: validLocation('INTRN', LocationType.IN_TRANSIT),
          currentMode: TransportMode.VESSEL,
          status: ContainerStatus.ON_VESSEL,
          journey: [],
        });
        throw new Error('forced rollback');
      });
    }).toThrow('forced rollback');

    expect(repository.findById('ROLL1234567')).toBeUndefined();
  });

  test('recovery from repository failure can use backup restore', async () => {
    const service = new ContainerTrackingService();
    const container = await service.createContainer({
      id: 'RCVR1234567',
      ownerId: 'ret-recover',
      vesselId: 'v-recover',
      destinationWarehouse: 'WH_DEL',
    });

    const snapshot = service.createBackupSnapshot();
    const recovered = new ContainerTrackingService();
    recovered.restoreBackupSnapshot(snapshot);

    expect(recovered.getContainer(container.id)).toBeDefined();
  });
});
