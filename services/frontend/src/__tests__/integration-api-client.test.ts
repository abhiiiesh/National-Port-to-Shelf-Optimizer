import {
  fetchAuthValidation,
  fetchPerformance,
  fetchVessels,
  loginToAuthService,
  registerAuthUser,
} from '../shared/api-client';

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
      ok: true,
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
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/api/v1/vessels', {
      headers: undefined,
    });
  });

  it('maps performance endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        totalShipments: 120,
        delayedShipments: 10,
        avgTransitHours: 14.2,
      }),
    } as Response);

    const snapshot = await fetchPerformance();
    expect(snapshot.totalShipments).toBe(120);
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/api/v1/metrics/performance', {
      headers: undefined,
    });
  });

  it('throws when endpoint payload breaks contract', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: true }),
    } as Response);

    await expect(fetchPerformance()).rejects.toThrow('Contract validation failed');
  });

  it('maps auth validation endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        valid: true,
        userId: 'user-1',
        roles: ['ADMIN'],
      }),
    } as Response);

    const validation = await fetchAuthValidation();
    expect(validation.valid).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/auth/validate', {
      headers: undefined,
    });
  });

  it('maps auth login endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'token-1',
        refreshToken: 'refresh-1',
        expiresIn: 3600,
        userId: 'user-1',
        roles: ['ADMIN'],
      }),
    } as Response);

    const token = await loginToAuthService('admin', 'admin123');
    expect(token.userId).toBe('user-1');
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/auth/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ username: 'admin', password: 'admin123' }),
    });
  });

  it('maps auth register endpoint response through contract guards', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user-2',
        username: 'port_user',
        roles: ['PORT_OPERATOR'],
        createdAt: '2026-03-20T00:00:00.000Z',
        updatedAt: '2026-03-20T00:00:00.000Z',
      }),
    } as Response);

    const user = await registerAuthUser('port_user', 'temp123', ['PORT_OPERATOR']);
    expect(user.id).toBe('user-2');
    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/auth/register', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username: 'port_user',
        password: 'temp123',
        roles: ['PORT_OPERATOR'],
      }),
    });
  });
});
