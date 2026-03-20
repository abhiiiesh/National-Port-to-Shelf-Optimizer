export const FRONTEND_ACCESS_TOKEN_STORAGE_KEY = 'port-to-shelf-access-token';

export const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY);
};
