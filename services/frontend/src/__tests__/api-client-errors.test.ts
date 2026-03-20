import { fetchVessels } from '../shared/api-client';
import { FRONTEND_ACCESS_TOKEN_STORAGE_KEY } from '../config/session';

const createWindowMock = () => {
  const storage = new Map<string, string>();

  return {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      clear: () => {
        storage.clear();
      },
    },
  };
};

describe('frontend API client errors', () => {
  const originalFetch = global.fetch;
  const originalWindow = global.window;

  beforeEach(() => {
    process.env.FRONTEND_API_BASE_URL = 'http://gateway.local';
    global.window = createWindowMock() as Window & typeof globalThis;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      delete (global as typeof globalThis & { window?: unknown }).window;
    }
  });

  it('forwards stored bearer tokens to the gateway', async () => {
    global.window.localStorage.setItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY, 'abc123');
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

    await fetchVessels();

    expect(global.fetch).toHaveBeenCalledWith('http://gateway.local/api/v1/vessels', {
      headers: {
        authorization: 'Bearer abc123',
      },
    });
  });

  it('surfaces API error envelopes with actionable messages', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        code: 'AUTH_HEADER_INVALID',
        message: 'Missing or invalid authorization header',
      }),
    } as Response);

    await expect(fetchVessels()).rejects.toThrow(
      'AUTH_HEADER_INVALID: Missing or invalid authorization header'
    );
  });
});
