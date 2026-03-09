import fc from 'fast-check';
import { Position, VesselRegistration, VesselStatus } from '@port-to-shelf/shared-types';
import { VesselTrackingService } from '../service';

const positionArb = fc.record({
  latitude: fc.double({ min: -89.9, max: 89.9, noNaN: true }),
  longitude: fc.double({ min: -179.9, max: 179.9, noNaN: true }),
  timestamp: fc.date(),
  speed: fc.double({ min: 0, max: 40, noNaN: true }),
  heading: fc.double({ min: 0, max: 359.99, noNaN: true }),
});

function registrationArb() {
  return fc.record({
    name: fc.string({ minLength: 3, maxLength: 24 }),
    imoNumber: fc.stringMatching(/^IMO\d{7}$/),
    initialPosition: positionArb,
    destinationPort: fc.constantFrom('INNSA', 'INMUN', 'INCCU'),
    containerManifest: fc.record({
      totalContainers: fc.integer({ min: 0, max: 20000 }),
      containerIds: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 30 }),
    }),
  });
}

describe('Vessel Tracking Properties (Task 8)', () => {
  test('Property 1: Vessel Tracking Initialization', async () => {
    await fc.assert(
      fc.asyncProperty(registrationArb(), async (registration) => {
        const service = new VesselTrackingService();
        const vessel = await service.registerVessel(registration as VesselRegistration);

        expect(vessel.id).toBeDefined();
        expect(vessel.imoNumber).toBe(registration.imoNumber);
        expect(vessel.status).toBe(VesselStatus.EN_ROUTE);
      }),
      { numRuns: 50 }
    );
  });

  test('Property 2: Position Update Triggers Recalculation', async () => {
    await fc.assert(
      fc.asyncProperty(registrationArb(), positionArb, async (registration, nextPosition) => {
        const service = new VesselTrackingService();
        const vessel = await service.registerVessel(registration as VesselRegistration);

        const updated = await service.updatePosition(vessel.id, nextPosition as Position);

        expect(updated.currentPosition.latitude).toBe(nextPosition.latitude);
        expect(updated.estimatedArrival.lastUpdated.toISOString()).toBe(nextPosition.timestamp.toISOString());
      }),
      { numRuns: 50 }
    );
  });

  test('Property 3: Arrival Recording Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(registrationArb(), fc.date(), async (registration, arrivalAt) => {
        const service = new VesselTrackingService();
        const vessel = await service.registerVessel(registration as VesselRegistration);

        const arrived = await service.recordArrival(vessel.id, arrivalAt);

        expect(arrived.status).toBe(VesselStatus.ARRIVED);
        expect(arrived.estimatedArrival.estimatedTime.toISOString()).toBe(arrivalAt.toISOString());
      }),
      { numRuns: 50 }
    );
  });

  test('Property 4: Vessel Registry Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(registrationArb(), { minLength: 1, maxLength: 8 }), async (registrations) => {
        const service = new VesselTrackingService();
        const uniqueRegs = registrations.filter(
          (entry, idx, arr) => arr.findIndex((x) => x.imoNumber === entry.imoNumber) === idx
        );

        for (const reg of uniqueRegs) {
          await service.registerVessel(reg as VesselRegistration);
        }

        const active = service.listActiveVessels();
        expect(active).toHaveLength(uniqueRegs.length);
      }),
      { numRuns: 30 }
    );
  });

  test('Property 5: Vessel Query Response Completeness', async () => {
    await fc.assert(
      fc.asyncProperty(registrationArb(), async (registration) => {
        const service = new VesselTrackingService();
        const vessel = await service.registerVessel(registration as VesselRegistration);

        const queried = service.getVessel(vessel.id);

        expect(queried).toBeDefined();
        expect(queried?.id).toBe(vessel.id);
        expect(queried?.name).toBe(vessel.name);
        expect(queried?.containerManifest.totalContainers).toBe(vessel.containerManifest.totalContainers);
      }),
      { numRuns: 50 }
    );
  });
});
