import { createGateway, LocalApiHandlers } from '../index';

describe('Task 29 Checkpoint - API layer complete', () => {
  test('all core API endpoints respond correctly through gateway', async () => {
    const handlers: LocalApiHandlers = {
      registerVessel: async (body) => ({ ...(body as object), saved: true }),
      updateVesselPosition: async (id, body) => ({ id, ...(body as object) }),
      getVessel: async (id) => ({ id }),
      listVessels: async () => [{ id: 'V1' }],
      recordVesselArrival: async (id) => ({ id, arrived: true }),

      createContainer: async (body) => ({ ...(body as object), saved: true }),
      updateContainerTransportMode: async (id, body) => ({ id, ...(body as object) }),
      getContainerJourney: async (id) => [{ id, eventType: 'container.created' }],
      queryContainers: async () => [{ id: 'ABCD1234567' }],
      markContainerDelivered: async (id) => ({ id, status: 'DELIVERED' }),

      listAuctions: async () => [{ id: 'A1' }],
      getAuction: async (id) => ({ id }),
      submitAuctionBid: async (auctionId, body) => ({ auctionId, ...(body as object), accepted: true }),

      getPerformanceMetrics: async () => ({ onTimeRate: 0.95 }),
      getReports: async () => [{ id: 'R1' }],
    };

    const gateway = createGateway(
      {},
      async () => ({ valid: true, userId: 'u-1', roles: ['PORT_OPERATOR'] as any }),
      undefined,
      handlers
    );

    const headers = { authorization: 'Bearer valid' };
    const calls = [
      gateway.handle({ method: 'POST', path: '/api/v1/vessels', ip: '1.1.1.1', headers, body: JSON.stringify({ id: 'V1' }) }),
      gateway.handle({ method: 'PUT', path: '/api/v1/vessels/V1/position', ip: '1.1.1.1', headers, body: JSON.stringify({ lat: 1 }) }),
      gateway.handle({ method: 'GET', path: '/api/v1/vessels/V1', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'GET', path: '/api/v1/vessels', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'POST', path: '/api/v1/vessels/V1/arrival', ip: '1.1.1.1', headers, body: '{}' }),
      gateway.handle({ method: 'POST', path: '/api/v1/containers', ip: '1.1.1.1', headers, body: JSON.stringify({ id: 'ABCD1234567' }) }),
      gateway.handle({ method: 'PUT', path: '/api/v1/containers/ABCD1234567/transport-mode', ip: '1.1.1.1', headers, body: JSON.stringify({ nextMode: 'RAIL' }) }),
      gateway.handle({ method: 'GET', path: '/api/v1/containers/ABCD1234567/journey', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'GET', path: '/api/v1/containers', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'POST', path: '/api/v1/containers/ABCD1234567/delivered', ip: '1.1.1.1', headers, body: '{}' }),
      gateway.handle({ method: 'GET', path: '/api/v1/auctions', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'GET', path: '/api/v1/auctions/A1', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'POST', path: '/api/v1/auctions/A1/bids', ip: '1.1.1.1', headers, body: JSON.stringify({ bidAmount: 500 }) }),
      gateway.handle({ method: 'GET', path: '/api/v1/metrics/performance', ip: '1.1.1.1', headers }),
      gateway.handle({ method: 'GET', path: '/api/v1/reports', ip: '1.1.1.1', headers }),
    ];

    const responses = await Promise.all(calls);
    responses.forEach((response) => expect(response.status).toBeGreaterThanOrEqual(200));
    responses.forEach((response) => expect(response.status).toBeLessThan(300));
  });

  test('authentication/authorization is enforced for protected endpoints', async () => {
    const gateway = createGateway({}, async () => ({ valid: false }));

    const targets = [
      '/api/v1/vessels',
      '/api/v1/containers',
      '/api/v1/auctions',
      '/api/v1/metrics/performance',
      '/api/v1/reports',
    ];

    for (const path of targets) {
      const missingHeader = await gateway.handle({ method: 'GET', path, ip: '2.2.2.2', headers: {} });
      expect(missingHeader.status).toBe(401);

      const invalidToken = await gateway.handle({ method: 'GET', path, ip: '2.2.2.2', headers: { authorization: 'Bearer bad' } });
      expect(invalidToken.status).toBe(401);
    }
  });
});
