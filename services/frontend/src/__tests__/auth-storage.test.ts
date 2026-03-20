import {
  FRONTEND_ACCESS_TOKEN_STORAGE_KEY,
  getStoredAccessToken,
} from '../config/session';

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

describe('frontend auth token storage', () => {
  const originalWindow = global.window;

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    } else {
      delete (global as typeof globalThis & { window?: unknown }).window;
    }
  });

  it('reads the access token from local storage when present', () => {
    global.window = createWindowMock() as Window & typeof globalThis;
    global.window.localStorage.setItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY, 'token-123');

    expect(getStoredAccessToken()).toBe('token-123');
  });

  it('returns null when no token is stored', () => {
    global.window = createWindowMock() as Window & typeof globalThis;

    expect(getStoredAccessToken()).toBeNull();
  });
});
