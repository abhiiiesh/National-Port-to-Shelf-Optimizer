import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Position, VesselRegistration } from '@port-to-shelf/shared-types';
import { VesselTrackingService } from './service';

export interface VesselTrackingServerConfig {
  port: number;
}

const defaultConfig: VesselTrackingServerConfig = {
  port: Number(process.env.VESSEL_SERVICE_PORT || process.env.PORT || 3001),
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

function parsePosition(input: unknown): Position {
  const body = (input || {}) as Record<string, unknown>;
  return {
    latitude: Number(body.latitude ?? 0),
    longitude: Number(body.longitude ?? 0),
    timestamp: body.timestamp ? new Date(String(body.timestamp)) : new Date(),
  };
}

export function createVesselTrackingServer(
  config: Partial<VesselTrackingServerConfig> = {},
  service = new VesselTrackingService()
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, { status: 'ok', service: 'vessel-tracking' });
        return;
      }

      if (method === 'GET' && url.pathname === '/vessels') {
        json(res, 200, service.listActiveVessels());
        return;
      }

      if (method === 'POST' && url.pathname === '/vessels') {
        const body = (await readBody(req)) as VesselRegistration;
        const created = await service.registerVessel({
          ...body,
          initialPosition: parsePosition(body.initialPosition),
        });
        json(res, 201, created);
        return;
      }

      const vesselMatch = url.pathname.match(/^\/vessels\/([^/]+)$/);
      if (method === 'GET' && vesselMatch) {
        const vessel = service.getVessel(vesselMatch[1]);
        if (!vessel) {
          json(res, 404, { error: 'Vessel not found' });
          return;
        }

        json(res, 200, vessel);
        return;
      }

      const positionMatch = url.pathname.match(/^\/vessels\/([^/]+)\/position$/);
      if (method === 'POST' && positionMatch) {
        const body = await readBody(req);
        const updated = await service.updatePosition(positionMatch[1], parsePosition(body));
        json(res, 200, updated);
        return;
      }

      const arrivalMatch = url.pathname.match(/^\/vessels\/([^/]+)\/arrival$/);
      if (method === 'POST' && arrivalMatch) {
        const body = (await readBody(req)) as { timestamp?: string };
        const updated = await service.recordArrival(
          arrivalMatch[1],
          body.timestamp ? new Date(body.timestamp) : new Date()
        );
        json(res, 200, updated);
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'Vessel service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startVesselTrackingService(config: Partial<VesselTrackingServerConfig> = {}) {
  return createVesselTrackingServer(config);
}

if (require.main === module) {
  const server = startVesselTrackingService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[vessel-tracking] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './repository';
export * from './service';
