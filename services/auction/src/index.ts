import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { AuctionCreation, BidSubmission } from '@port-to-shelf/shared-types';
import { AuctionService } from './service';

export interface AuctionServerConfig {
  port: number;
}

const defaultConfig: AuctionServerConfig = {
  port: Number(process.env.AUCTION_SERVICE_PORT || process.env.PORT || 3003),
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

export function createAuctionServer(
  config: Partial<AuctionServerConfig> = {},
  service = new AuctionService()
) {
  const cfg = { ...defaultConfig, ...config };

  const server = createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        json(res, 200, { status: 'ok', service: 'auction' });
        return;
      }

      if (method === 'GET' && url.pathname === '/auctions') {
        json(
          res,
          200,
          service.listActiveAuctions(url.searchParams.get('destination') || undefined)
        );
        return;
      }

      if (method === 'POST' && url.pathname === '/auctions') {
        const body = (await readBody(req)) as AuctionCreation;
        const auction = await service.createAuction({
          ...body,
          startTime: new Date(body.startTime),
          endTime: new Date(body.endTime),
          slots: body.slots.map((slot) => ({
            ...slot,
            departureTime: new Date(slot.departureTime),
          })),
        });
        json(res, 201, auction);
        return;
      }

      if (method === 'POST' && url.pathname === '/ownership') {
        const body = (await readBody(req)) as { containerId?: string; retailerId?: string };
        if (!body.containerId || !body.retailerId) {
          json(res, 400, { error: 'containerId and retailerId are required' });
          return;
        }

        service.registerContainerOwnership(body.containerId, body.retailerId);
        json(res, 200, { registered: true });
        return;
      }

      const auctionMatch = url.pathname.match(/^\/auctions\/([^/]+)$/);
      if (method === 'GET' && auctionMatch) {
        const auction = service.getAuction(auctionMatch[1]);
        if (!auction) {
          json(res, 404, { error: 'Auction not found' });
          return;
        }

        json(res, 200, auction);
        return;
      }

      const bidMatch = url.pathname.match(/^\/auctions\/([^/]+)\/bids$/);
      if (method === 'POST' && bidMatch) {
        const body = (await readBody(req)) as Omit<BidSubmission, 'auctionId'>;
        const bid = await service.submitBid({ ...body, auctionId: bidMatch[1] });
        json(res, 201, bid);
        return;
      }

      const closeMatch = url.pathname.match(/^\/auctions\/([^/]+)\/close$/);
      if (method === 'POST' && closeMatch) {
        const result = await service.closeAuction(closeMatch[1]);
        json(res, 200, result);
        return;
      }

      json(res, 404, { error: 'Not Found' });
    } catch (error) {
      json(res, 500, {
        error: 'Auction service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return server.listen(cfg.port);
}

export function startAuctionService(config: Partial<AuctionServerConfig> = {}) {
  return createAuctionServer(config);
}

if (require.main === module) {
  const server = startAuctionService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[auction] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './repository';
export * from './service';
