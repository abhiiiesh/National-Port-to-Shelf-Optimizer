import { ArrivalPrediction, PredictionFactors, VesselStatus } from '@port-to-shelf/shared-types';

export function calculateArrivalPrediction(
  vesselId: string,
  portId: string,
  factors: PredictionFactors,
  generatedAt: Date
): ArrivalPrediction {
  const effectiveSpeed = Math.max(1, factors.currentSpeed * weatherSpeedFactor(factors) * congestionSpeedFactor(factors));
  const etaHours = factors.distanceRemaining / effectiveSpeed;
  const confidenceInterval = calculateConfidenceIntervalHours(factors);
  const confidence = Math.max(0.1, Math.min(0.99, 1 - confidenceInterval / 24));

  return {
    vesselId,
    portId,
    predictedArrivalTime: new Date(generatedAt.getTime() + etaHours * 60 * 60 * 1000),
    confidenceInterval,
    confidence,
    factors,
    generatedAt,
  };
}

export function shouldGeneratePrediction(status: VesselStatus): boolean {
  return status === VesselStatus.EN_ROUTE;
}

function weatherSpeedFactor(factors: PredictionFactors): number {
  const windPenalty = Math.min(0.3, factors.weatherConditions.windSpeed / 200);
  const wavePenalty = Math.min(0.25, factors.weatherConditions.waveHeight / 20);
  return 1 - (windPenalty + wavePenalty);
}

function congestionSpeedFactor(factors: PredictionFactors): number {
  return Math.max(0.6, 1 - factors.portCongestion * 0.4);
}

function calculateConfidenceIntervalHours(factors: PredictionFactors): number {
  const weatherVolatility = factors.weatherConditions.windSpeed / 25 + factors.weatherConditions.waveHeight / 5;
  const speedVariance = Math.abs(factors.currentSpeed - factors.historicalAverageSpeed) / 5;
  const congestionImpact = factors.portCongestion * 3;

  return Math.max(1, weatherVolatility + speedVariance + congestionImpact);
}
