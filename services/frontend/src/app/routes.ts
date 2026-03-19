import type { UserRole } from './access-control';

export type AppDomain =
  | 'dashboard'
  | 'tracking'
  | 'sloting'
  | 'auction'
  | 'analytics'
  | 'communications'
  | 'administration';

export interface AppRoute {
  key: string;
  path: string;
  domain: AppDomain;
  allowedRoles: UserRole[];
  lazyModule: () => Promise<string>;
}

const lazy =
  (moduleName: string): (() => Promise<string>) =>
  () =>
    Promise.resolve(moduleName);

export const appRoutes: AppRoute[] = [
  {
    key: 'operations-dashboard',
    path: '/dashboard',
    domain: 'dashboard',
    allowedRoles: [
      'OPERATIONS_MANAGER',
      'PORT_ADMIN',
      'AUCTION_OPERATOR',
      'EXECUTIVE_STAKEHOLDER',
      'ADMIN',
    ],
    lazyModule: lazy('features/dashboard/operations'),
  },
  {
    key: 'tracking-overview',
    path: '/tracking',
    domain: 'tracking',
    allowedRoles: ['OPERATIONS_MANAGER', 'PORT_ADMIN', 'ADMIN'],
    lazyModule: lazy('features/tracking/overview'),
  },
  {
    key: 'slot-management',
    path: '/slots',
    domain: 'sloting',
    allowedRoles: ['OPERATIONS_MANAGER', 'PORT_ADMIN', 'ADMIN'],
    lazyModule: lazy('features/slots/index'),
  },
  {
    key: 'auction-board',
    path: '/auctions',
    domain: 'auction',
    allowedRoles: ['AUCTION_OPERATOR', 'OPERATIONS_MANAGER', 'ADMIN'],
    lazyModule: lazy('features/auctions/index'),
  },
  {
    key: 'reports-analytics',
    path: '/reports',
    domain: 'analytics',
    allowedRoles: ['EXECUTIVE_STAKEHOLDER', 'OPERATIONS_MANAGER', 'PORT_ADMIN', 'ADMIN'],
    lazyModule: lazy('features/analytics/dashboard'),
  },
  {
    key: 'ops-news',
    path: '/news',
    domain: 'communications',
    allowedRoles: [
      'OPERATIONS_MANAGER',
      'PORT_ADMIN',
      'AUCTION_OPERATOR',
      'EXECUTIVE_STAKEHOLDER',
      'ADMIN',
    ],
    lazyModule: lazy('features/news/ops-feed'),
  },
  {
    key: 'admin-console',
    path: '/access-control',
    domain: 'administration',
    allowedRoles: ['ADMIN', 'PORT_ADMIN'],
    lazyModule: lazy('features/admin/access-control'),
  },
];

export const unauthorizedFallbackPath = '/unauthorized';
export const notFoundFallbackPath = '/not-found';
