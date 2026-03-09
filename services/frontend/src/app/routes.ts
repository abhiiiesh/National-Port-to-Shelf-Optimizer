export type UserRole = 'PORT_OPERATOR' | 'RETAILER' | 'LOGISTICS_PARTNER' | 'ADMIN';

export interface AppRoute {
  key: string;
  path: string;
  domain: 'tracking' | 'sloting' | 'auction' | 'analytics' | 'administration';
  allowedRoles: UserRole[];
  lazyModule: () => Promise<string>;
}

const lazy =
  (moduleName: string): (() => Promise<string>) =>
  () =>
    Promise.resolve(moduleName);

export const appRoutes: AppRoute[] = [
  {
    key: 'tracking-overview',
    path: '/tracking',
    domain: 'tracking',
    allowedRoles: ['PORT_OPERATOR', 'RETAILER', 'LOGISTICS_PARTNER', 'ADMIN'],
    lazyModule: lazy('features/tracking/overview'),
  },
  {
    key: 'slot-management',
    path: '/slots',
    domain: 'sloting',
    allowedRoles: ['PORT_OPERATOR', 'LOGISTICS_PARTNER', 'ADMIN'],
    lazyModule: lazy('features/slots/index'),
  },
  {
    key: 'auction-board',
    path: '/auctions',
    domain: 'auction',
    allowedRoles: ['PORT_OPERATOR', 'LOGISTICS_PARTNER', 'ADMIN'],
    lazyModule: lazy('features/auctions/index'),
  },
  {
    key: 'kpi-dashboard',
    path: '/analytics',
    domain: 'analytics',
    allowedRoles: ['PORT_OPERATOR', 'RETAILER', 'ADMIN'],
    lazyModule: lazy('features/analytics/dashboard'),
  },
  {
    key: 'admin-console',
    path: '/admin',
    domain: 'administration',
    allowedRoles: ['ADMIN'],
    lazyModule: lazy('features/admin/console'),
  },
];

export const unauthorizedFallbackPath = '/unauthorized';
export const notFoundFallbackPath = '/not-found';
