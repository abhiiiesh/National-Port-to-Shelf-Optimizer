export interface WeatherData {
  windSpeed: number;
  waveHeight: number;
  visibility: number;
  forecast: string;
}

export interface PredictionFactors {
  currentSpeed: number;
  distanceRemaining: number; // nautical miles
  weatherConditions: WeatherData;
  historicalAverageSpeed: number;
  portCongestion: number; // 0-1
}

export interface ArrivalPrediction {
  vesselId: string;
  portId: string;
  predictedArrivalTime: Date;
  confidenceInterval: number; // hours
  confidence: number; // 0-1
  factors: PredictionFactors;
  generatedAt: Date;
}

export interface AccuracyMetrics {
  vesselId: string;
  predictedTime: Date;
  actualTime: Date;
  errorHours: number;
  withinThreshold: boolean;
}

export interface TrainingData {
  vesselId: string;
  route: string;
  historicalSpeed: number;
  weatherConditions: WeatherData;
  actualArrivalTime: Date;
}

export interface ModelMetrics {
  accuracy: number;
  meanAbsoluteError: number;
  trainedAt: Date;
}

export interface VesselData {
  position: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
  };
  weather?: WeatherData;
  timestamp: Date;
}
