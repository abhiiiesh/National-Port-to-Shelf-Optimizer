import fc from 'fast-check';
import { VesselStatus } from '@port-to-shelf/shared-types';
import { PredictionService, PredictionRequest } from '../service';

describe('AI Prediction properties (Task 11)', () => {
  const requestArb = fc.record({
    vesselId: fc.string({ minLength: 3, maxLength: 20 }),
    portId: fc.constantFrom('INNSA', 'INMUN', 'INCCU'),
    status: fc.constant(VesselStatus.EN_ROUTE),
    currentSpeed: fc.double({ min: 1, max: 25, noNaN: true }),
    distanceRemaining: fc.double({ min: 1, max: 3000, noNaN: true }),
    historicalAverageSpeed: fc.double({ min: 1, max: 25, noNaN: true }),
    portCongestion: fc.double({ min: 0, max: 1, noNaN: true }),
    weather: fc.record({
      windSpeed: fc.double({ min: 0, max: 80, noNaN: true }),
      waveHeight: fc.double({ min: 0, max: 8, noNaN: true }),
      visibility: fc.double({ min: 1, max: 15, noNaN: true }),
      forecast: fc.constantFrom('calm', 'cloudy', 'rough'),
    }),
    timestamp: fc.date({ min: new Date('2020-01-01T00:00:00.000Z'), max: new Date('2035-12-31T23:59:59.999Z') }),
  });

  test('Property 11: Prediction Generation for En-Route Vessels', async () => {
    await fc.assert(
      fc.asyncProperty(requestArb, async (request) => {
        const service = new PredictionService();
        const prediction = await service.predictArrival(request as PredictionRequest);

        expect(prediction.vesselId).toBe(request.vesselId);
        expect(prediction.predictedArrivalTime.getTime()).toBeGreaterThan(request.timestamp.getTime());
      }),
      { numRuns: 40 }
    );
  });

  test('Property 12: Prediction Update on New Data', async () => {
    await fc.assert(
      fc.asyncProperty(requestArb, requestArb, async (baseReq, newerReq) => {
        const service = new PredictionService();
        await service.predictArrival(baseReq as PredictionRequest);

        const updatedReq: PredictionRequest = {
          ...(newerReq as PredictionRequest),
          vesselId: baseReq.vesselId,
          timestamp: new Date((baseReq.timestamp as Date).getTime() + 60 * 60 * 1000),
        };

        const updated = await service.updatePrediction(updatedReq);
        expect(updated.vesselId).toBe(baseReq.vesselId);

        const latest = service.getLatestPrediction(baseReq.vesselId);
        expect(latest?.generatedAt.getTime()).toBe(updated.generatedAt.getTime());
      }),
      { numRuns: 40 }
    );
  });

  test('Property 13: Low Confidence Flagging', async () => {
    await fc.assert(
      fc.asyncProperty(requestArb, async (request) => {
        const service = new PredictionService();
        const prediction = await service.predictArrival(request as PredictionRequest);

        const lowConfidence = prediction.confidence < 0.5;
        expect(lowConfidence).toBe(prediction.confidenceInterval > 12);
      }),
      { numRuns: 40 }
    );
  });

  test('Property 14: Prediction Accuracy Metrics Storage', async () => {
    await fc.assert(
      fc.asyncProperty(requestArb, fc.integer({ min: -12, max: 12 }), async (request, deltaHours) => {
        const service = new PredictionService();
        const prediction = await service.predictArrival(request as PredictionRequest);

        const actualTime = new Date(prediction.predictedArrivalTime.getTime() + deltaHours * 60 * 60 * 1000);
        const metric = service.evaluatePredictionAccuracy(request.vesselId, actualTime, 6);

        expect(metric.vesselId).toBe(request.vesselId);
        expect(service.getAccuracyMetrics(request.vesselId).length).toBe(1);
      }),
      { numRuns: 40 }
    );
  });
});
