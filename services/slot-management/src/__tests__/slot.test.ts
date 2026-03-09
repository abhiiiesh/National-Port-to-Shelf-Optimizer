import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { TransportMode } from '@port-to-shelf/shared-types';
import { SlotManagementService } from '../service';

describe('SlotManagementService edge cases and integration', () => {
  test('slot creation with zero capacity creates non-reservable slot', async () => {
    const service = new SlotManagementService();
    service.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 0,
      availableCapacity: 0,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const [slot] = service.createSlots({
      vesselId: 'v1',
      portId: 'INNSA',
      predictedArrival: new Date(),
      containerCount: 1,
      destinations: ['INDEL'],
    });

    expect(slot.capacity).toBe(0);
    await expect(service.reserveSlot(slot.id, 'ABCD1234567')).rejects.toThrow('zero capacity');
  });

  test('reservation expiration releases slot and restores capacity', async () => {
    const service = new SlotManagementService();
    service.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 5,
      availableCapacity: 5,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const [slot] = service.createSlots({
      vesselId: 'v2',
      portId: 'INNSA',
      predictedArrival: new Date(),
      containerCount: 3,
      destinations: ['INDEL'],
    });

    const reservation = await service.reserveSlot(slot.id, 'EFGH1234567');
    const expired = service.expireReservation(reservation.id);

    expect(expired.status).toBe('EXPIRED');
    expect(service.getAvailableCapacity(TransportMode.RAIL, 'INNSA', 'INDEL')).toBe(5);
  });

  test('capacity decrease affects future slots', () => {
    const service = new SlotManagementService();
    service.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 10,
      availableCapacity: 10,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const [slotA] = service.createSlots({
      vesselId: 'v3',
      portId: 'INNSA',
      predictedArrival: new Date(),
      containerCount: 7,
      destinations: ['INDEL'],
    });
    expect(slotA.capacity).toBe(7);

    service.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 2,
      availableCapacity: 2,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const [slotB] = service.createSlots({
      vesselId: 'v4',
      portId: 'INNSA',
      predictedArrival: new Date(),
      containerCount: 7,
      destinations: ['INDEL'],
    });
    expect(slotB.capacity).toBe(2);
  });

  test('prediction events can trigger slot creation and reservation publishes event', async () => {
    const bus = new InMemoryEventBus();
    const service = new SlotManagementService(undefined, undefined, bus);

    service.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 10,
      availableCapacity: 10,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    const seenEvents: string[] = [];
    bus.subscribe('slot.reserved', 'slot-test', async (event) => {
      seenEvents.push(event.eventType);
    });

    service.bindToEventBus(bus);
    await bus.publish({
      eventId: 'pred-1',
      eventType: 'prediction.generated',
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
      source: 'ai-prediction',
      version: 1,
      payload: {
        vesselId: 'v5',
        portId: 'INNSA',
        containerCount: 2,
        destinations: ['INDEL'],
      },
    });

    const slot = service.listSlots()[0];
    expect(slot).toBeDefined();

    await service.reserveSlot(slot.id, 'IJKL1234567');
    expect(seenEvents).toContain('slot.reserved');
  });
});
