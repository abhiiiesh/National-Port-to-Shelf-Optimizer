export const FRONTEND_ACCESS_TOKEN_STORAGE_KEY = 'port-to-shelf-access-token';
export const FRONTEND_SIDEBAR_COLLAPSED_STORAGE_KEY = 'port-to-shelf-sidebar-collapsed';

export const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY);
};

export const setStoredAccessToken = (token: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY, token);
};

export const clearStoredAccessToken = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(FRONTEND_ACCESS_TOKEN_STORAGE_KEY);
};

export const getStoredSidebarCollapsed = (): boolean | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(FRONTEND_SIDEBAR_COLLAPSED_STORAGE_KEY);
  if (value === null) {
    return null;
  }

  return value === 'true';
};

export const setStoredSidebarCollapsed = (collapsed: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(FRONTEND_SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
};
