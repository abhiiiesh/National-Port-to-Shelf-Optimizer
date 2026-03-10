import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import {
  ContainerQuery,
  ContainerRegistration,
  Location,
  LocationType,
  TransportMode,
} from '@port-to-shelf/shared-types';
import { ContainerTrackingService } from './service';

export interface ContainerTrackingServerConfig {
  port: number;
}

const defaultConfig: ContainerTrackingServerConfig = {
  port: Number(process.env.CONTAINER_SERVICE_PORT || process.env.PORT || 3002),
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

function toLocation(body: Record<string, unknown>): Location {
  return {
    id: String(body.id || 'UNKNOWN'),
    name: String(body.name || 'Unknown'),
    type: (body.type as LocationType) || LocationType.PORT,
    coordinates: {
      latitude: Number((body.position as Record<string, unknown> | undefined)?.latitude ?? 0),
      longitude: Number((body.position as Record<string, unknown> | undefined)?.longitude ?? 0),
      timestamp: new Date(
        String(
          (body.position as Record<string, unknown> | undefined)?.timestamp ||
            new Date().toISOString()
        )
      ),
      speed: Number((body.position as Record<string, unknown> | undefined)?.speed ?? 0),
      heading: Number((body.position as Record<string, unknown> | undefined)?.heading ?? 0),
    },
  };
}

export function createContainerTrackingServer(
  config: Partial<ContainerTrackingServerConfig> = {},
  service = new ContainerTrackingService()
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, { status: 'ok', service: 'container-tracking' });
        return;
      }

      if (method === 'POST' && url.pathname === '/containers') {
        const body = (await readBody(req)) as ContainerRegistration;
        const container = await service.createContainer(body);
        json(res, 201, container);
        return;
      }

      if (method === 'GET' && url.pathname === '/containers') {
        const query: ContainerQuery = {
          ownerId: url.searchParams.get('ownerId') || undefined,
          status: (url.searchParams.get('status') as ContainerQuery['status']) || undefined,
          currentMode: (url.searchParams.get('mode') as TransportMode) || undefined,
        };
        json(res, 200, service.queryContainers(query));
        return;
      }

      const journeyMatch = url.pathname.match(/^\/containers\/([^/]+)\/journey$/);
      if (method === 'GET' && journeyMatch) {
        json(res, 200, service.getContainerJourney(journeyMatch[1]));
        return;
      }

      const modeMatch = url.pathname.match(/^\/containers\/([^/]+)\/mode$/);
      if (method === 'POST' && modeMatch) {
        const body = (await readBody(req)) as {
          mode?: TransportMode;
          location?: Record<string, unknown>;
          timestamp?: string;
        };
        if (!body.mode || !body.location) {
          json(res, 400, { error: 'mode and location required' });
          return;
        }

        const container = await service.updateTransportMode(
          modeMatch[1],
          body.mode,
          toLocation(body.location),
          body.timestamp ? new Date(body.timestamp) : new Date()
        );

        json(res, 200, container);
        return;
      }

      const deliveredMatch = url.pathname.match(/^\/containers\/([^/]+)\/delivered$/);
      if (method === 'POST' && deliveredMatch) {
        const body = (await readBody(req)) as {
          location?: Record<string, unknown>;
          timestamp?: string;
        };
        if (!body.location) {
          json(res, 400, { error: 'location required' });
          return;
        }

        const container = await service.markDelivered(
          deliveredMatch[1],
          toLocation(body.location),
          body.timestamp ? new Date(body.timestamp) : new Date()
        );
        json(res, 200, container);
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'Container service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startContainerTrackingService(config: Partial<ContainerTrackingServerConfig> = {}) {
  return createContainerTrackingServer(config);
}

if (require.main === module) {
  const server = startContainerTrackingService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[container-tracking] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './repository';
export * from './service';
