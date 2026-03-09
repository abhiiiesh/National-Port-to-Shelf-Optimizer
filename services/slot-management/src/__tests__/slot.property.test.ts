import fc from 'fast-check';
import { TransportMode } from '@port-to-shelf/shared-types';
import { SlotManagementService } from '../service';

const reqArb = fc.record({
  vesselId: fc.string({ minLength: 3, maxLength: 20 }),
  portId: fc.constantFrom('INNSA', 'INMUN', 'INCCU'),
  predictedArrival: fc.date({ min: new Date('2026-01-01T00:00:00.000Z'), max: new Date('2030-12-31T00:00:00.000Z') }),
  containerCount: fc.integer({ min: 1, max: 500 }),
  destinations: fc.array(fc.constantFrom('INDEL', 'INBLR', 'INHYD', 'INPUN'), { minLength: 1, maxLength: 4 }),
});

describe('Slot management properties (Task 12)', () => {
  test('Property 15: Slot Creation from Predictions', async () => {
    await fc.assert(
      fc.asyncProperty(reqArb, async (request) => {
        const service = new SlotManagementService();
        request.destinations.forEach((destination) => {
          service.updateCapacity({
            mode: TransportMode.RAIL,
            route: { origin: request.portId, destination },
            totalCapacity: 1000,
            availableCapacity: 1000,
            reservedCapacity: 0,
            utilizationRate: 0,
          });
          service.updateCapacity({
            mode: TransportMode.TRUCK,
            route: { origin: request.portId, destination },
            totalCapacity: 1000,
            availableCapacity: 1000,
            reservedCapacity: 0,
            utilizationRate: 0,
          });
        });

        const slots = service.createSlots(request);
        expect(slots.length).toBe(request.destinations.length);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 18: Capacity Constraint Enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 20 }), async (capacity) => {
        const service = new SlotManagementService();
        service.updateCapacity({
          mode: TransportMode.RAIL,
          route: { origin: 'INNSA', destination: 'INDEL' },
          totalCapacity: capacity,
          availableCapacity: capacity,
          reservedCapacity: 0,
          utilizationRate: 0,
        });

        const [slot] = service.createSlots({
          vesselId: 'v-1',
          portId: 'INNSA',
          predictedArrival: new Date('2026-01-01T00:00:00.000Z'),
          containerCount: 999,
          destinations: ['INDEL'],
        });

        expect(slot.capacity).toBeLessThanOrEqual(capacity);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 19: Slot Assignment Updates Availability', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (capacity) => {
        const service = new SlotManagementService();
        service.updateCapacity({
          mode: TransportMode.RAIL,
          route: { origin: 'INNSA', destination: 'INDEL' },
          totalCapacity: capacity,
          availableCapacity: capacity,
          reservedCapacity: 0,
          utilizationRate: 0,
        });

        const [slot] = service.createSlots({
          vesselId: 'v-2',
          portId: 'INNSA',
          predictedArrival: new Date('2026-01-01T00:00:00.000Z'),
          containerCount: 1,
          destinations: ['INDEL'],
        });

        await service.reserveSlot(slot.id, 'CONT1234567');
        const available = service.getAvailableCapacity(TransportMode.RAIL, 'INNSA', 'INDEL');
        expect(available).toBe(capacity - 1);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 32: Capacity Update Processing', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 1000 }), async (cap) => {
        const service = new SlotManagementService();
        service.updateCapacity({
          mode: TransportMode.TRUCK,
          route: { origin: 'INMUN', destination: 'INBLR' },
          totalCapacity: cap,
          availableCapacity: cap,
          reservedCapacity: 0,
          utilizationRate: 0,
        });

        expect(service.getAvailableCapacity(TransportMode.TRUCK, 'INMUN', 'INBLR')).toBe(cap);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 34: Separate Mode Capacity Tracking', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 5, max: 50 }), fc.integer({ min: 5, max: 50 }), async (railCap, truckCap) => {
        const service = new SlotManagementService();
        service.updateCapacity({
          mode: TransportMode.RAIL,
          route: { origin: 'INNSA', destination: 'INDEL' },
          totalCapacity: railCap,
          availableCapacity: railCap,
          reservedCapacity: 0,
          utilizationRate: 0,
        });
        service.updateCapacity({
          mode: TransportMode.TRUCK,
          route: { origin: 'INNSA', destination: 'INDEL' },
          totalCapacity: truckCap,
          availableCapacity: truckCap,
          reservedCapacity: 0,
          utilizationRate: 0,
        });

        expect(service.getAvailableCapacity(TransportMode.RAIL, 'INNSA', 'INDEL')).toBe(railCap);
        expect(service.getAvailableCapacity(TransportMode.TRUCK, 'INNSA', 'INDEL')).toBe(truckCap);
      }),
      { numRuns: 40 }
    );
  });
});
