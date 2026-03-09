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
