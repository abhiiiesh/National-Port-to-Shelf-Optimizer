import { createGateway } from '../index';

const validAuth = async () => ({ valid: true, userId: 'u1', roles: [] as any });

describe('API Gateway', () => {
  test('rate limiting enforcement returns 429 after threshold', async () => {
    const gateway = createGateway(
      { rateLimitWindowMs: 60_000, rateLimitMaxRequests: 2 },
      validAuth,
      async () => ({ status: 200, headers: {}, body: '{}' })
    );

    await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels',
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer ok' },
    });

    await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels',
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer ok' },
    });

    const third = await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels',
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer ok' },
    });

    expect(third.status).toBe(429);
    expect(JSON.parse(third.body).error).toBe('Too Many Requests');
  });

  test('protected route requires authorization header', async () => {
    const gateway = createGateway();

    const response = await gateway.handle({
      method: 'GET',
      path: '/api/v1/vessels',
      ip: '127.0.0.2',
      headers: {},
    });

    expect(response.status).toBe(401);
    expect(JSON.parse(response.body).error).toBe('Unauthorized');
  });

  test('validation errors follow standardized ErrorResponse format and metrics are tracked', async () => {
    const gateway = createGateway();

    const response = await gateway.handle({
      method: 'GET',
      path: '/api/v1/containers',
      ip: '127.0.0.20',
      headers: {},
    });

    const parsed = JSON.parse(response.body);
    expect(parsed).toMatchObject({
      error: 'Unauthorized',
      code: 'AUTH_HEADER_INVALID',
      path: '/api/v1/containers',
    });
    expect(typeof parsed.timestamp).toBe('string');

    const metrics = gateway.getErrorMetrics();
    expect(metrics['AUTH_HEADER_INVALID:/api/v1/containers']).toBeGreaterThanOrEqual(1);
  });



  test('cacheable GET endpoints return cached response within TTL', async () => {
    let calls = 0;
    const gateway = createGateway(
      { responseCacheTtlMs: 60_000 },
      validAuth,
      undefined,
      {
        getPerformanceMetrics: async () => {
          calls += 1;
          return { request: calls };
        },
      }
    );

    const req = { method: 'GET', path: '/api/v1/metrics/performance', ip: '127.0.0.4', headers: { authorization: 'Bearer ok' } };
    const first = await gateway.handle(req);
    const second = await gateway.handle(req);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toBe(1);
    expect(JSON.parse(second.body).request).toBe(1);
    expect(second.headers['x-cache']).toBe('HIT');
  });

  test('performance stats track latencies and cache counters', async () => {
    const gateway = createGateway(
      { responseCacheTtlMs: 60_000 },
      validAuth,
      undefined,
      {
        getReports: async () => [{ id: 'r1' }],
      }
    );

    const req = { method: 'GET', path: '/api/v1/reports', ip: '127.0.0.5', headers: { authorization: 'Bearer ok' } };
    await gateway.handle(req);
    await gateway.handle(req);

    const stats = gateway.getPerformanceStats();
    expect(stats.global.requestCount).toBeGreaterThanOrEqual(2);
    expect(stats.byRoute['GET /api/v1/reports'].requestCount).toBeGreaterThanOrEqual(2);
    expect(stats.cache.hits).toBeGreaterThanOrEqual(1);
  });

  test('OPTIONS request includes CORS headers', async () => {
    const gateway = createGateway({ corsOrigins: ['http://localhost:5173'] });

    const response = await gateway.handle({
      method: 'OPTIONS',
      path: '/health',
      ip: '127.0.0.3',
      headers: { origin: 'http://localhost:5173' },
    });

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
