import {
  createAccessRequest,
  fetchAuthValidation,
  fetchPerformance,
  fetchVessels,
  loginToAuthService,
  reviewAccessRequest,
  registerAuthUser,
} from '../shared/api-client';
describe('frontend integration tests: typed API client', () => {
  const originalFetch = global.fetch;
  const originalWindow = (global as typeof global & { window?: unknown }).window;

  beforeEach(() => {
    process.env.FRONTEND_API_BASE_URL = 'http://gateway.local';
    const storage = new Map<string, string>();
    (global as typeof global & { window: Window }).window = {
      localStorage: {
        getItem: (key: string): string | null => storage.get(key) ?? null,
        setItem: (key: string, value: string): void => {
          storage.set(key, value);
        },
        removeItem: (key: string): void => {
          storage.delete(key);
        },
        clear: (): void => {
          storage.clear();
        },
        key: (index: number): string | null => Array.from(storage.keys())[index] ?? null,
        get length(): number {
          return storage.size;
        },
      },
    } as unknown as Window;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    (global as typeof global & { window?: unknown }).window = originalWindow;
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

  it('creates access requests through governance adapter endpoints', async () => {
    (window.localStorage as Storage).setItem('port-to-shelf-access-token', 'token-ops');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requestId: 'REQ-450',
        requesterName: 'Aarav Singh',
        team: 'Port Operations',
        currentRole: 'OPERATIONS_MANAGER',
        requestedRole: 'PORT_ADMIN',
        requestedBy: 'PORT_ADMIN',
        status: 'Pending Approval',
        reason: 'Needs temporary berth controls.',
        tenant: 'port-to-shelf-india',
        submittedAt: '2026-03-31 08:10 UTC',
      }),
    } as Response);

    const request = await createAccessRequest({
      requestId: 'REQ-450',
      requesterName: 'Aarav Singh',
      team: 'Port Operations',
      currentRole: 'OPERATIONS_MANAGER',
      requestedRole: 'PORT_ADMIN',
      requestedBy: 'PORT_ADMIN',
      status: 'Pending Approval',
      reason: 'Needs temporary berth controls.',
      tenant: 'port-to-shelf-india',
      submittedAt: '2026-03-31 08:10 UTC',
    });
    expect(request.requestId).toBe('REQ-450');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://gateway.local/api/v1/access-control/requests',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer token-ops',
        }),
      })
    );
  });

  it('reviews access requests through governance adapter endpoints', async () => {
    (window.localStorage as Storage).setItem('port-to-shelf-access-token', 'token-ops');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requestId: 'REQ-450',
        requesterName: 'Aarav Singh',
        team: 'Port Operations',
        currentRole: 'OPERATIONS_MANAGER',
        requestedRole: 'PORT_ADMIN',
        requestedBy: 'PORT_ADMIN',
        status: 'Approved',
        reason: 'Needs temporary berth controls.',
        tenant: 'port-to-shelf-india',
        submittedAt: '2026-03-31 08:10 UTC',
      }),
    } as Response);

    const request = await reviewAccessRequest('REQ-450', 'Approved');
    expect(request.status).toBe('Approved');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://gateway.local/api/v1/access-control/requests/REQ-450/review',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          authorization: 'Bearer token-ops',
        }),
      })
    );
  });
});
