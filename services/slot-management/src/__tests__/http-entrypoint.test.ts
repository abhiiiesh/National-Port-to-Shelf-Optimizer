import { createSlotManagementServer } from '../index';

describe('slot-management http entrypoint', () => {
  it('serves health endpoint', async () => {
    const server = createSlotManagementServer({ port: 0 });
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ status: 'ok', service: 'slot-management' });

    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve(undefined)))
    );
  });
});
