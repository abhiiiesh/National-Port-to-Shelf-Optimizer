import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { CapacityInfo, SlotCreationRequest, TransportMode } from '@port-to-shelf/shared-types';
import { SlotManagementService } from './service';

export interface SlotManagementServerConfig {
  port: number;
}

const defaultConfig: SlotManagementServerConfig = {
  port: Number(process.env.SLOT_SERVICE_PORT || process.env.PORT || 3004),
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

export function createSlotManagementServer(
  config: Partial<SlotManagementServerConfig> = {},
  service = new SlotManagementService()
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, { status: 'ok', service: 'slot-management' });
        return;
      }

      if (method === 'GET' && url.pathname === '/slots') {
        json(res, 200, service.listSlots());
        return;
      }

      if (method === 'POST' && url.pathname === '/capacity') {
        const body = (await readBody(req)) as CapacityInfo;
        const result = service.updateCapacity(body);
        json(res, 200, result);
        return;
      }

      if (method === 'GET' && url.pathname === '/capacity') {
        const mode = url.searchParams.get('mode') as TransportMode;
        const origin = url.searchParams.get('origin') || '';
        const destination = url.searchParams.get('destination') || '';
        if (!mode || !origin || !destination) {
          json(res, 400, { error: 'mode, origin and destination are required' });
          return;
        }

        json(res, 200, {
          availableCapacity: service.getAvailableCapacity(mode, origin, destination),
        });
        return;
      }

      if (method === 'POST' && url.pathname === '/slots') {
        const body = (await readBody(req)) as SlotCreationRequest & {
          highPriorityContainers?: number;
        };
        const slots = service.createSlots(
          {
            ...body,
            predictedArrival: new Date(body.predictedArrival),
          },
          { highPriorityContainers: body.highPriorityContainers }
        );
        json(res, 201, slots);
        return;
      }

      const reserveMatch = url.pathname.match(/^\/slots\/([^/]+)\/reserve$/);
      if (method === 'POST' && reserveMatch) {
        const body = (await readBody(req)) as { containerId?: string; ttlMinutes?: number };
        if (!body.containerId) {
          json(res, 400, { error: 'containerId is required' });
          return;
        }

        const reservation = await service.reserveSlot(
          reserveMatch[1],
          body.containerId,
          body.ttlMinutes || 60
        );
        json(res, 201, reservation);
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'Slot management service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startSlotManagementService(config: Partial<SlotManagementServerConfig> = {}) {
  return createSlotManagementServer(config);
}

if (require.main === module) {
  const server = startSlotManagementService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[slot-management] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './repository';
export * from './service';
