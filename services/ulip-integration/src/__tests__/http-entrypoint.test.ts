import { createUlipIntegrationServer } from '../index';

describe('ulip-integration http entrypoint', () => {
  it('serves health endpoint', async () => {
    const server = createUlipIntegrationServer({ port: 0 });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'degraded', service: 'ulip-integration' });

    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve(undefined)))
    );
  });
});
