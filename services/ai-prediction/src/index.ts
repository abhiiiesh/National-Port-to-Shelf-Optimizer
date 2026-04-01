import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { VesselStatus, WeatherData } from '@port-to-shelf/shared-types';
import { PredictionRequest, PredictionService } from './service';

export interface PredictionServerConfig {
  port: number;
}

const defaultConfig: PredictionServerConfig = {
  port: Number(process.env.AI_PREDICTION_SERVICE_PORT || process.env.PORT || 3006),
};

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? (JSON.parse(raw) as unknown) : {};
}

function toPredictionRequest(input: unknown): PredictionRequest {
  const body = (input || {}) as Record<string, unknown>;
  const weather = body.weather as Partial<WeatherData> | undefined;

  return {
    vesselId: String(body.vesselId || ''),
    portId: String(body.portId || ''),
    status: (body.status as VesselStatus) ?? VesselStatus.EN_ROUTE,
    currentSpeed: Number(body.currentSpeed ?? 0),
    distanceRemaining: Number(body.distanceRemaining ?? 0),
    historicalAverageSpeed: Number(body.historicalAverageSpeed ?? 0),
    portCongestion: Number(body.portCongestion ?? 0),
    weather: weather
      ? {
          windSpeed: Number(weather.windSpeed ?? 0),
          waveHeight: Number(weather.waveHeight ?? 0),
          visibility: Number(weather.visibility ?? 10),
          forecast: String(weather.forecast ?? 'unknown'),
        }
      : undefined,
    timestamp: body.timestamp ? new Date(String(body.timestamp)) : undefined,
  };
}

export function createPredictionServer(
  config: Partial<PredictionServerConfig> = {},
  service = new PredictionService()
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, { status: 'ok', service: 'ai-prediction' });
        return;
      }

      if (method === 'POST' && url.pathname === '/predictions') {
        const body = await readBody(req);
        const prediction = await service.predictArrival(toPredictionRequest(body));
        json(res, 201, prediction);
        return;
      }

      const vesselLatestMatch = url.pathname.match(/^\/predictions\/([^/]+)\/latest$/);
      if (method === 'GET' && vesselLatestMatch) {
        const prediction = service.getLatestPrediction(vesselLatestMatch[1]);
        if (!prediction) {
          json(res, 404, { error: 'Prediction not found' });
          return;
        }

        json(res, 200, prediction);
        return;
      }

      if (method === 'POST' && url.pathname === '/predictions/accuracy') {
        const body = (await readBody(req)) as {
          vesselId?: string;
          actualTime?: string;
          thresholdHours?: number;
        };

        if (!body.vesselId || !body.actualTime) {
          json(res, 400, { error: 'vesselId and actualTime are required' });
          return;
        }

        const metric = service.evaluatePredictionAccuracy(
          body.vesselId,
          new Date(body.actualTime),
          Number(body.thresholdHours ?? 6)
        );
        json(res, 200, metric);
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'AI prediction service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startPredictionService(config: Partial<PredictionServerConfig> = {}) {
  return createPredictionServer(config);
}

if (require.main === module) {
  const server = startPredictionService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[ai-prediction] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './algorithm';
export * from './repository';
export * from './service';
