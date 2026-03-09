import { createGateway, LocalApiHandlers } from '../index';

describe('Task 28 API endpoints and REST controllers', () => {
  test('vessel/container/auction/metrics endpoint flow works', async () => {
    const vessels = new Map<string, any>();
    const containers = new Map<string, any>();
    const journeys = new Map<string, any[]>();
    const auctions = new Map<string, any>();

    const handlers: LocalApiHandlers = {
      registerVessel: async (body: any) => {
        vessels.set(body.id, { ...body, status: 'ACTIVE' });
        return vessels.get(body.id);
      },
      updateVesselPosition: async (id: string, body: any) => {
        const v = { ...(vessels.get(id) ?? { id }), position: body };
        vessels.set(id, v);
        return v;
      },
      getVessel: async (id: string) => vessels.get(id),
      listVessels: async () => Array.from(vessels.values()),
      recordVesselArrival: async (id: string) => {
        const v = { ...(vessels.get(id) ?? { id }), arrived: true };
        vessels.set(id, v);
        return v;
      },

      createContainer: async (body: any) => {
        containers.set(body.id, body);
        journeys.set(body.id, [{ eventType: 'container.created' }]);
        return body;
      },
      updateContainerTransportMode: async (id: string, body: any) => {
        const c = { ...(containers.get(id) ?? { id }), currentMode: body.nextMode };
        containers.set(id, c);
        journeys.set(id, [...(journeys.get(id) ?? []), { eventType: 'container.mode.changed' }]);
        return c;
      },
      getContainerJourney: async (id: string) => journeys.get(id) ?? [],
      queryContainers: async () => Array.from(containers.values()),
      markContainerDelivered: async (id: string) => {
        const c = { ...(containers.get(id) ?? { id }), status: 'DELIVERED' };
        containers.set(id, c);
        journeys.set(id, [...(journeys.get(id) ?? []), { eventType: 'container.delivered' }]);
        return c;
      },

      listAuctions: async () => Array.from(auctions.values()),
      getAuction: async (id: string) => auctions.get(id),
      submitAuctionBid: async (auctionId: string, body: any) => ({ auctionId, ...body, accepted: true }),

      getPerformanceMetrics: async () => ({ onTimeRate: 0.91 }),
      getReports: async () => [{ id: 'report-1', score: 90 }],
    };

    const gateway = createGateway(
      {},
      async () => ({ valid: true, userId: 'u-1', roles: ['PORT_OPERATOR'] as any }),
      undefined,
      handlers
    );

    const authHeaders = { authorization: 'Bearer valid' };

    let response = await gateway.handle({ method: 'POST', path: '/api/v1/vessels', ip: '10.0.0.1', headers: authHeaders, body: JSON.stringify({ id: 'V1', imo: '1234567' }) });
    expect(response.status).toBe(201);

    response = await gateway.handle({ method: 'PUT', path: '/api/v1/vessels/V1/position', ip: '10.0.0.1', headers: authHeaders, body: JSON.stringify({ lat: 10, lng: 20 }) });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/vessels/V1', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/vessels', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'POST', path: '/api/v1/vessels/V1/arrival', ip: '10.0.0.1', headers: authHeaders, body: '{}' });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'POST', path: '/api/v1/containers', ip: '10.0.0.1', headers: authHeaders, body: JSON.stringify({ id: 'ABCD1234567' }) });
    expect(response.status).toBe(201);

    response = await gateway.handle({ method: 'PUT', path: '/api/v1/containers/ABCD1234567/transport-mode', ip: '10.0.0.1', headers: authHeaders, body: JSON.stringify({ nextMode: 'RAIL' }) });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/containers/ABCD1234567/journey', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/containers', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'POST', path: '/api/v1/containers/ABCD1234567/delivered', ip: '10.0.0.1', headers: authHeaders, body: '{}' });
    expect(response.status).toBe(200);

    auctions.set('A1', { id: 'A1', status: 'ACTIVE' });
    response = await gateway.handle({ method: 'GET', path: '/api/v1/auctions', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/auctions/A1', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'POST', path: '/api/v1/auctions/A1/bids', ip: '10.0.0.1', headers: authHeaders, body: JSON.stringify({ bidAmount: 500 }) });
    expect(response.status).toBe(201);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/metrics/performance', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);

    response = await gateway.handle({ method: 'GET', path: '/api/v1/reports', ip: '10.0.0.1', headers: authHeaders });
    expect(response.status).toBe(200);
  });

  test('authentication and authorization enforced on all task-28 endpoints', async () => {
    const gateway = createGateway({}, async () => ({ valid: false }));

    const endpoints = [
      { method: 'POST', path: '/api/v1/vessels' },
      { method: 'PUT', path: '/api/v1/vessels/V1/position' },
      { method: 'GET', path: '/api/v1/vessels/V1' },
      { method: 'GET', path: '/api/v1/vessels' },
      { method: 'POST', path: '/api/v1/vessels/V1/arrival' },
      { method: 'POST', path: '/api/v1/containers' },
      { method: 'PUT', path: '/api/v1/containers/C1/transport-mode' },
      { method: 'GET', path: '/api/v1/containers/C1/journey' },
      { method: 'GET', path: '/api/v1/containers' },
      { method: 'POST', path: '/api/v1/containers/C1/delivered' },
      { method: 'GET', path: '/api/v1/auctions' },
      { method: 'GET', path: '/api/v1/auctions/A1' },
      { method: 'POST', path: '/api/v1/auctions/A1/bids' },
      { method: 'GET', path: '/api/v1/metrics/performance' },
      { method: 'GET', path: '/api/v1/reports' },
    ];

    for (const endpoint of endpoints) {
      const missingHeader = await gateway.handle({ method: endpoint.method, path: endpoint.path, ip: '10.0.0.2', headers: {} });
      expect(missingHeader.status).toBe(401);

      const invalidToken = await gateway.handle({ method: endpoint.method, path: endpoint.path, ip: '10.0.0.3', headers: { authorization: 'Bearer invalid' } });
      expect(invalidToken.status).toBe(401);
    }
  });
});
