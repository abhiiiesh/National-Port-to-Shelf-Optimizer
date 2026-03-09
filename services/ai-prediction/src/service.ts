import {
  AccuracyMetrics,
  ArrivalPrediction,
  DomainEvent,
  PredictionFactors,
  VesselStatus,
  WeatherData,
} from '@port-to-shelf/shared-types';
import { calculateArrivalPrediction, shouldGeneratePrediction } from './algorithm';
import { PredictionRepository } from './repository';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<boolean>;
}

export interface EventSubscriber {
  subscribe(topic: string, consumerGroup: string, handler: (event: DomainEvent) => Promise<void>): unknown;
}

export interface PredictionRequest {
  vesselId: string;
  portId: string;
  status: VesselStatus;
  currentSpeed: number;
  distanceRemaining: number;
  historicalAverageSpeed: number;
  portCongestion: number;
  weather?: WeatherData;
  timestamp?: Date;
}

export class PredictionService {
  constructor(private readonly repository = new PredictionRepository(), private readonly eventPublisher?: EventPublisher) {}

  async predictArrival(request: PredictionRequest): Promise<ArrivalPrediction> {
    if (!shouldGeneratePrediction(request.status)) {
      throw new Error('Predictions are only generated for en-route vessels');
    }

    const factors: PredictionFactors = {
      currentSpeed: request.currentSpeed,
      distanceRemaining: request.distanceRemaining,
      historicalAverageSpeed: request.historicalAverageSpeed,
      portCongestion: request.portCongestion,
      weatherConditions: request.weather ?? {
        windSpeed: 0,
        waveHeight: 0,
        visibility: 10,
        forecast: 'unknown',
      },
    };

    const generatedAt = request.timestamp ?? new Date();
    const prediction = calculateArrivalPrediction(request.vesselId, request.portId, factors, generatedAt);
    this.repository.storePrediction(prediction);

    await this.publishEvent({
      eventId: `${request.vesselId}-${generatedAt.getTime()}-prediction-generated`,
      eventType: 'prediction.generated',
      timestamp: generatedAt,
      source: 'ai-prediction',
      version: 1,
      payload: {
        vesselId: request.vesselId,
        predictionType: 'generated',
      },
    });

    return prediction;
  }

  async updatePrediction(request: PredictionRequest): Promise<ArrivalPrediction> {
    const updated = await this.predictArrival(request);

    await this.publishEvent({
      eventId: `${request.vesselId}-${Date.now()}-prediction-updated`,
      eventType: 'prediction.updated',
      timestamp: new Date(),
      source: 'ai-prediction',
      version: 1,
      payload: {
        vesselId: request.vesselId,
        predictionType: 'updated',
      },
    });

    return updated;
  }

  evaluatePredictionAccuracy(vesselId: string, actualTime: Date, thresholdHours = 6): AccuracyMetrics {
    const latest = this.repository.getLatestPrediction(vesselId);
    if (!latest) {
      throw new Error(`No predictions found for vessel ${vesselId}`);
    }

    const errorHours = Math.abs(actualTime.getTime() - latest.predictedArrivalTime.getTime()) / (60 * 60 * 1000);
    const metric: AccuracyMetrics = {
      vesselId,
      predictedTime: latest.predictedArrivalTime,
      actualTime,
      errorHours,
      withinThreshold: errorHours <= thresholdHours,
    };

    return this.repository.storeAccuracyMetric(metric);
  }

  getLatestPrediction(vesselId: string): ArrivalPrediction | undefined {
    return this.repository.getLatestPrediction(vesselId);
  }

  getAccuracyMetrics(vesselId: string): AccuracyMetrics[] {
    return this.repository.getAccuracyMetrics(vesselId);
  }

  bindToEventBus(subscriber: EventSubscriber): void {
    subscriber.subscribe('vessel.position.updated', 'ai-prediction-service', async (event) => {
      const payload = event.payload as {
        vesselId: string;
        portId?: string;
        currentSpeed?: number;
        distanceRemaining?: number;
        historicalAverageSpeed?: number;
        portCongestion?: number;
      };

      if (!payload.vesselId) {
        return;
      }

      await this.updatePrediction({
        vesselId: payload.vesselId,
        portId: payload.portId ?? 'UNKNOWN',
        status: VesselStatus.EN_ROUTE,
        currentSpeed: payload.currentSpeed ?? 10,
        distanceRemaining: payload.distanceRemaining ?? 300,
        historicalAverageSpeed: payload.historicalAverageSpeed ?? 12,
        portCongestion: payload.portCongestion ?? 0.2,
      });
    });
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    if (!this.eventPublisher) {
      return;
    }

    await this.eventPublisher.publish(event);
  }
}
