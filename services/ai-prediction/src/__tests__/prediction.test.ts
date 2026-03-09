import { InMemoryEventBus } from '../../../../packages/event-bus/src';
import { VesselStatus } from '@port-to-shelf/shared-types';
import { PredictionService } from '../service';

describe('PredictionService edge cases and integration (Task 11.9)', () => {
  test('prediction works with missing weather data', async () => {
    const service = new PredictionService();

    const prediction = await service.predictArrival({
      vesselId: 'v-1',
      portId: 'INNSA',
      status: VesselStatus.EN_ROUTE,
      currentSpeed: 12,
      distanceRemaining: 240,
      historicalAverageSpeed: 11,
      portCongestion: 0.2,
    });

    expect(prediction.factors.weatherConditions.forecast).toBe('unknown');
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  test('prediction for vessel at port is rejected', async () => {
    const service = new PredictionService();

    await expect(
      service.predictArrival({
        vesselId: 'v-2',
        portId: 'INNSA',
        status: VesselStatus.ARRIVED,
        currentSpeed: 0,
        distanceRemaining: 0,
        historicalAverageSpeed: 10,
        portCongestion: 0.3,
      })
    ).rejects.toThrow('en-route');
  });

  test('prediction accuracy evaluation computes error and threshold', async () => {
    const service = new PredictionService();
    const prediction = await service.predictArrival({
      vesselId: 'v-3',
      portId: 'INNSA',
      status: VesselStatus.EN_ROUTE,
      currentSpeed: 10,
      distanceRemaining: 200,
      historicalAverageSpeed: 10,
      portCongestion: 0.2,
      timestamp: new Date('2026-03-01T00:00:00.000Z'),
    });

    const metric = service.evaluatePredictionAccuracy(
      'v-3',
      new Date(prediction.predictedArrivalTime.getTime() + 2 * 60 * 60 * 1000),
      6
    );

    expect(metric.errorHours).toBeCloseTo(2, 5);
    expect(metric.withinThreshold).toBe(true);
  });

  test('event bus integration subscribes to vessel updates and publishes prediction events', async () => {
    const bus = new InMemoryEventBus();
    const published: string[] = [];
    bus.subscribe('prediction.generated', 'test', async (event) => {
      published.push(event.eventType);
    });
    bus.subscribe('prediction.updated', 'test', async (event) => {
      published.push(event.eventType);
    });

    const service = new PredictionService(undefined, bus);
    service.bindToEventBus(bus);

    await bus.publish({
      eventId: 'evt-vessel-pos',
      eventType: 'vessel.position.updated',
      timestamp: new Date('2026-03-02T00:00:00.000Z'),
      source: 'vessel-tracking',
      version: 1,
      payload: {
        vesselId: 'v-4',
        portId: 'INMUN',
        currentSpeed: 11,
        distanceRemaining: 220,
        historicalAverageSpeed: 10,
        portCongestion: 0.25,
      },
    });

    expect(service.getLatestPrediction('v-4')).toBeDefined();
    expect(published).toContain('prediction.generated');
    expect(published).toContain('prediction.updated');
  });
});
