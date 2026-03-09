import { AccuracyMetrics, ArrivalPrediction } from '@port-to-shelf/shared-types';

export class PredictionRepository {
  private readonly predictionsByVessel = new Map<string, ArrivalPrediction[]>();
  private readonly accuracyByVessel = new Map<string, AccuracyMetrics[]>();

  storePrediction(prediction: ArrivalPrediction): ArrivalPrediction {
    const existing = this.predictionsByVessel.get(prediction.vesselId) ?? [];
    existing.push(prediction);
    existing.sort((a, b) => a.generatedAt.getTime() - b.generatedAt.getTime());
    this.predictionsByVessel.set(prediction.vesselId, existing);
    return prediction;
  }

  getLatestPrediction(vesselId: string): ArrivalPrediction | undefined {
    const all = this.predictionsByVessel.get(vesselId) ?? [];
    return all[all.length - 1];
  }

  getPredictions(vesselId: string): ArrivalPrediction[] {
    return [...(this.predictionsByVessel.get(vesselId) ?? [])];
  }

  storeAccuracyMetric(metric: AccuracyMetrics): AccuracyMetrics {
    const existing = this.accuracyByVessel.get(metric.vesselId) ?? [];
    existing.push(metric);
    this.accuracyByVessel.set(metric.vesselId, existing);
    return metric;
  }

  getAccuracyMetrics(vesselId: string): AccuracyMetrics[] {
    return [...(this.accuracyByVessel.get(vesselId) ?? [])];
  }
}
