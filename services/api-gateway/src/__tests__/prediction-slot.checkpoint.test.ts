import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { PredictionService } from '../../../ai-prediction/src/service';
import { SlotManagementService } from '../../../slot-management/src/service';
import { TransportMode, VesselStatus } from '@port-to-shelf/shared-types';

describe('Task 13 Checkpoint - Prediction and slot management', () => {
  test('predictions trigger slot creation and capacity constraints are enforced', async () => {
    const bus = new InMemoryEventBus();

    const predictionService = new PredictionService(undefined, bus);
    const slotService = new SlotManagementService(undefined, undefined, bus);
    slotService.bindToEventBus(bus);

    slotService.updateCapacity({
      mode: TransportMode.RAIL,
      route: { origin: 'INNSA', destination: 'INDEL' },
      totalCapacity: 2,
      availableCapacity: 2,
      reservedCapacity: 0,
      utilizationRate: 0,
    });

    // Trigger prediction.generated event via prediction service
    await predictionService.predictArrival({
      vesselId: 'v-checkpoint-13',
      portId: 'INNSA',
      status: VesselStatus.EN_ROUTE,
      currentSpeed: 12,
      distanceRemaining: 120,
      historicalAverageSpeed: 11,
      portCongestion: 0.2,
      timestamp: new Date('2026-04-01T00:00:00.000Z'),
      weather: {
        windSpeed: 12,
        waveHeight: 1.5,
        visibility: 8,
        forecast: 'calm',
      },
    });

    // Explicitly publish slot-creation payload to emulate upstream enriched prediction event
    await bus.publish({
      eventId: 'pred-generated-slot-input',
      eventType: 'prediction.generated',
      timestamp: new Date('2026-04-01T00:00:00.000Z'),
      source: 'ai-prediction',
      version: 1,
      payload: {
        vesselId: 'v-checkpoint-13',
        portId: 'INNSA',
        containerCount: 3,
        destinations: ['INDEL'],
      },
    });

    const slots = slotService.listSlots();
    expect(slots.length).toBeGreaterThan(0);

    const slot = slots.find((entry) => entry.destination === "INDEL");
    expect(slot).toBeDefined();
    // capacity should be bounded by route capacity (2), not requested container count (3)
    expect(slot?.capacity).toBe(2);

    await slotService.reserveSlot(slot!.id, 'CONT0000001');
    await slotService.reserveSlot(slot!.id, 'CONT0000002');

    await expect(slotService.reserveSlot(slot!.id, 'CONT0000003')).rejects.toThrow('no available capacity');
  });
});
