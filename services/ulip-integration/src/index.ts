import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { ULIPIntegrationService, HttpClient, AuthConfig } from './service';

export interface UlipServerConfig {
  port: number;
}

const defaultConfig: UlipServerConfig = {
  port: Number(process.env.ULIP_SERVICE_PORT || process.env.PORT || 3008),
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

const stubHttpClient: HttpClient = {
  async post<T>(_url: string, body: unknown): Promise<T> {
    const payload = body as Record<string, unknown>;

    if (String(_url).includes('token')) {
      return {
        accessToken: 'stub-ulip-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
      } as T;
    }

    return payload as T;
  },
};

function createDefaultAuthConfig(): AuthConfig {
  return {
    clientId: process.env.ULIP_CLIENT_ID || 'dev-client-id',
    clientSecret: process.env.ULIP_CLIENT_SECRET || 'dev-client-secret',
    tokenEndpoint: process.env.ULIP_TOKEN_ENDPOINT || 'https://ulip.example/oauth/token',
    defaultScope: ['port.read', 'rail.read', 'road.read'],
  };
}

export function createUlipIntegrationServer(
  config: Partial<UlipServerConfig> = {},
  service = new ULIPIntegrationService(createDefaultAuthConfig(), stubHttpClient)
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, {
          status: service.isHealthy() ? 'ok' : 'degraded',
          service: 'ulip-integration',
        });
        return;
      }

      if (method === 'POST' && url.pathname === '/auth') {
        const token = await service.authenticate();
        json(res, 200, token);
        return;
      }

      if (method === 'GET' && url.pathname === '/ports') {
        const portId = url.searchParams.get('portId');
        if (!portId) {
          json(res, 400, { error: 'portId is required' });
          return;
        }

        const portData = await service.queryPortData(portId);
        json(res, 200, portData);
        return;
      }

      if (method === 'GET' && url.pathname === '/rail/capacity') {
        const origin = url.searchParams.get('origin');
        const destination = url.searchParams.get('destination');
        if (!origin || !destination) {
          json(res, 400, { error: 'origin and destination are required' });
          return;
        }

        const capacity = await service.queryRailCapacity(
          { origin, destination },
          new Date(url.searchParams.get('date') || new Date().toISOString())
        );
        json(res, 200, capacity);
        return;
      }

      if (method === 'GET' && url.pathname === '/road/trucks') {
        const location = url.searchParams.get('location');
        if (!location) {
          json(res, 400, { error: 'location is required' });
          return;
        }

        const trucks = await service.queryTruckAvailability(
          location,
          new Date(url.searchParams.get('date') || new Date().toISOString())
        );
        json(res, 200, trucks);
        return;
      }

      if (method === 'POST' && url.pathname === '/events/pickup-request') {
        const body = (await readBody(req)) as { containerId?: string; portId?: string };
        if (!body.containerId || !body.portId) {
          json(res, 400, { error: 'containerId and portId are required' });
          return;
        }

        await service.publishContainerPickupRequest(body.containerId, body.portId);
        json(res, 202, { accepted: true });
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'ULIP integration service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startUlipIntegrationService(config: Partial<UlipServerConfig> = {}) {
  return createUlipIntegrationServer(config);
}

if (require.main === module) {
  const server = startUlipIntegrationService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[ulip-integration] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './service';
