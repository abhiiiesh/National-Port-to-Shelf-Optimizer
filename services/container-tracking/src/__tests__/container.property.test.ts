import fc from 'fast-check';
import { ContainerQuery, ContainerRegistration, ContainerStatus, Location, LocationType, TransportMode } from '@port-to-shelf/shared-types';
import { ContainerTrackingService } from '../service';

function validRegistrationArb() {
  return fc.record({
    id: fc
      .tuple(
        fc.stringMatching(/^[A-Z]{4}$/),
        fc.stringMatching(/^\d{7}$/)
      )
      .map(([a, b]) => `${a}${b}`),
    ownerId: fc.string({ minLength: 3, maxLength: 12 }),
    vesselId: fc.string({ minLength: 3, maxLength: 16 }),
    destinationWarehouse: fc.constantFrom('WH_MUM', 'WH_DEL', 'WH_BLR'),
  });
}

function locationArb(type: LocationType = LocationType.PORT) {
  return fc.record({
    type: fc.constant(type),
    id: fc
      .tuple(fc.stringMatching(/^[A-Z]{2}$/), fc.stringMatching(/^[A-Z0-9]{3}$/))
      .map(([a, b]) => `${a}${b}`),
    name: fc.string({ minLength: 3, maxLength: 20 }),
    coordinates: fc.record({
      latitude: fc.double({ min: -89.9, max: 89.9, noNaN: true }),
      longitude: fc.double({ min: -179.9, max: 179.9, noNaN: true }),
      timestamp: fc.date(),
      speed: fc.double({ min: 0, max: 20, noNaN: true }),
      heading: fc.double({ min: 0, max: 359.99, noNaN: true }),
    }),
  });
}

describe('Container Tracking Properties (Task 9)', () => {
  test('Property 6: Container Tracking Record Creation', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), async (registration) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);

        expect(created.id).toBe(registration.id);
        expect(created.ownerId).toBe(registration.ownerId);
        expect(created.journey.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 7: Transport Mode Transition Recording', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), locationArb(LocationType.RAIL_TERMINAL), async (registration, location) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);
        const updated = await service.updateTransportMode(created.id, TransportMode.RAIL, location as Location);

        const last = updated.journey[updated.journey.length - 1];
        expect(updated.currentMode).toBe(TransportMode.RAIL);
        expect(last.eventType).toBe('container.mode.changed');
        expect(last.transportMode).toBe(TransportMode.RAIL);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 8: Journey History Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), fc.array(locationArb(), { minLength: 1, maxLength: 5 }), async (registration, locations) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);

        let mode = TransportMode.TRUCK;
        for (const loc of locations) {
          await service.updateTransportMode(created.id, mode, loc as Location);
          mode = mode === TransportMode.TRUCK ? TransportMode.RAIL : TransportMode.TRUCK;
        }

        const journey = service.getContainerJourney(created.id);
        expect(journey.length).toBe(1 + locations.length);
      }),
      { numRuns: 30 }
    );
  });

  test('Property 9: Container Location Consistency', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), locationArb(LocationType.WAREHOUSE), async (registration, location) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);
        const updated = await service.updateTransportMode(created.id, TransportMode.TRUCK, location as Location);

        expect(updated.currentLocation.id).toBe(location.id);
        expect(updated.currentLocation.type).toBe(location.type);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 10: Journey Completion Marking', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), locationArb(LocationType.WAREHOUSE), async (registration, location) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);

        const delivered = await service.markDelivered(created.id, location as Location);

        expect(delivered.status).toBe(ContainerStatus.DELIVERED);
        expect(delivered.journey[delivered.journey.length - 1].eventType).toBe('container.delivered');
      }),
      { numRuns: 40 }
    );
  });

  test('Property 25: Demurrage-Free Time Calculation', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), locationArb(LocationType.PORT), async (registration, portLocation) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);

        const atPort = await service.updateTransportMode(
          created.id,
          TransportMode.TRUCK,
          portLocation as Location,
          new Date('2026-01-01T00:00:00.000Z')
        );

        expect(atPort.demurrageInfo).toBeDefined();
        expect(atPort.demurrageInfo?.freeTimeHours).toBeGreaterThan(0);
      }),
      { numRuns: 30 }
    );
  });

  test('Property 26: High Priority Flagging', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), locationArb(LocationType.PORT), async (registration, portLocation) => {
        const service = new ContainerTrackingService();
        const created = await service.createContainer(registration as ContainerRegistration);

        await service.updateTransportMode(
          created.id,
          TransportMode.TRUCK,
          portLocation as Location,
          new Date('2026-01-01T00:00:00.000Z')
        );

        const nearDeadline = await service.updateTransportMode(
          created.id,
          TransportMode.TRUCK,
          portLocation as Location,
          new Date('2026-01-03T12:30:00.000Z')
        );

        expect(nearDeadline.demurrageInfo?.isPriority).toBe(true);
      }),
      { numRuns: 30 }
    );
  });

  test('Property 45: Retailer Data Isolation', async () => {
    await fc.assert(
      fc.asyncProperty(validRegistrationArb(), validRegistrationArb(), async (a, b) => {
        fc.pre(a.ownerId !== b.ownerId && a.id !== b.id);
        const service = new ContainerTrackingService();

        await service.createContainer(a as ContainerRegistration);
        await service.createContainer(b as ContainerRegistration);

        const resultA = service.queryContainers({ ownerId: a.ownerId } as ContainerQuery);
        expect(resultA.every((container) => container.ownerId === a.ownerId)).toBe(true);
      }),
      { numRuns: 40 }
    );
  });
});
