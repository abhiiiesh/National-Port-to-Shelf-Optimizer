import { Position, VesselRegistration, VesselStatus } from '@port-to-shelf/shared-types';
import { VesselTrackingService } from '../service';

function sampleRegistration(overrides: Partial<VesselRegistration> = {}): VesselRegistration {
  return {
    name: 'Vessel A',
    imoNumber: 'IMO1234567',
    initialPosition: {
      latitude: 12.99,
      longitude: 80.22,
      timestamp: new Date('2026-01-01T10:00:00.000Z'),
      speed: 13,
      heading: 120,
    },
    destinationPort: 'INNSA',
    containerManifest: {
      totalContainers: 0,
      containerIds: [],
    },
    ...overrides,
  };
}

describe('VesselTrackingService edge cases and event integration', () => {
  test('supports vessel with empty manifest', async () => {
    const service = new VesselTrackingService();
    const vessel = await service.registerVessel(sampleRegistration());

    expect(vessel.containerManifest.totalContainers).toBe(0);
    expect(vessel.containerManifest.containerIds).toEqual([]);
  });

  test('rejects duplicate IMO numbers', async () => {
    const service = new VesselTrackingService();
    await service.registerVessel(sampleRegistration({ imoNumber: 'IMO7654321' }));

    await expect(service.registerVessel(sampleRegistration({ imoNumber: 'IMO7654321' }))).rejects.toThrow(
      'already exists'
    );
  });

  test('rejects invalid position coordinates', async () => {
    const service = new VesselTrackingService();

    const invalidPosition: Position = {
      latitude: 123,
      longitude: 88,
      timestamp: new Date(),
      speed: 1,
      heading: 10,
    };

    await expect(
      service.registerVessel(sampleRegistration({ initialPosition: invalidPosition, imoNumber: 'IMO2222222' }))
    ).rejects.toThrow('Invalid latitude');
  });

  test('publishes position-updated and arrived events', async () => {
    const events: string[] = [];
    const publisher = {
      publish: async (event: { eventType: string }) => {
        events.push(event.eventType);
        return true;
      },
    };

    const service = new VesselTrackingService(undefined, publisher);
    const vessel = await service.registerVessel(sampleRegistration({ imoNumber: 'IMO9999999' }));

    await service.updatePosition(vessel.id, {
      latitude: 13,
      longitude: 80,
      timestamp: new Date('2026-01-01T12:00:00.000Z'),
      speed: 10,
      heading: 90,
    });
    const arrived = await service.recordArrival(vessel.id, new Date('2026-01-01T15:00:00.000Z'));

    expect(arrived.status).toBe(VesselStatus.ARRIVED);
    expect(events).toEqual(['vessel.position.updated', 'vessel.arrived']);
  });
});
