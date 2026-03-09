import { fetchPerformance, fetchVessels } from '../shared/api-client';

describe('frontend integration tests: typed API client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.FRONTEND_API_BASE_URL = 'http://gateway.local';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('maps vessel endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [
        {
          vesselId: 'v-1',
          vesselName: 'Atlas',
          eta: '2026-03-10T12:00:00Z',
          status: 'ON_TIME',
        },
      ],
    } as Response);

    const vessels = await fetchVessels();
    expect(vessels[0].vesselId).toBe('v-1');
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/api/v1/vessels');
  });

  it('maps performance endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        totalShipments: 120,
        delayedShipments: 10,
        avgTransitHours: 14.2,
      }),
    } as Response);

    const snapshot = await fetchPerformance();
    expect(snapshot.totalShipments).toBe(120);
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/api/v1/metrics/performance');
  });

  it('throws when endpoint payload breaks contract', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ invalid: true }),
    } as Response);

    await expect(fetchPerformance()).rejects.toThrow('Contract validation failed');
  });
});
