import {
  FRONTEND_ACCESS_TOKEN_STORAGE_KEY,
  FRONTEND_SIDEBAR_COLLAPSED_STORAGE_KEY,
  getStoredAccessToken,
  getStoredSidebarCollapsed,
  setStoredSidebarCollapsed,
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

  it('persists and reads the sidebar collapsed preference', () => {
    global.window = createWindowMock() as Window & typeof globalThis;

    setStoredSidebarCollapsed(true);

    expect(
      global.window.localStorage.getItem(FRONTEND_SIDEBAR_COLLAPSED_STORAGE_KEY)
    ).toBe('true');
    expect(getStoredSidebarCollapsed()).toBe(true);
  });
});
