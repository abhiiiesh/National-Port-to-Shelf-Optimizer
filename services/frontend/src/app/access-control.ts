export type UserRole =
  | 'OPERATIONS_MANAGER'
  | 'PORT_ADMIN'
  | 'AUCTION_OPERATOR'
  | 'EXECUTIVE_STAKEHOLDER'
  | 'ADMIN'
  | 'PORT_OPERATOR'
  | 'RETAILER'
  | 'LOGISTICS_PARTNER';

const legacyRoleMap: Record<string, UserRole> = {
  PORT_OPERATOR: 'OPERATIONS_MANAGER',
  RETAILER: 'EXECUTIVE_STAKEHOLDER',
  LOGISTICS_PARTNER: 'AUCTION_OPERATOR',
};

export interface RoleCapability {
  role: UserRole;
  label: string;
  description: string;
  permissions: string[];
  defaultRoute: string;
}

export interface UserAssignment {
  name: string;
  team: string;
  role: UserRole;
  status: 'Active' | 'Pending Review' | 'Escalated';
}

export const roleCapabilities: RoleCapability[] = [
  {
    role: 'OPERATIONS_MANAGER',
    label: 'Operations Manager',
    description: 'Monitors flow health, resolves exceptions, and coordinates multimodal movement.',
    permissions: [
      'Dashboard overview',
      'Tracking filters',
      'Slot recommendations',
      'Incident actions',
    ],
    defaultRoute: '/dashboard',
  },
  {
    role: 'PORT_ADMIN',
    label: 'Port Admin',
    description: 'Controls port operations, berth readiness, and assignment governance.',
    permissions: ['Port tracking control', 'Capacity overrides', 'Role assignment approvals'],
    defaultRoute: '/tracking',
  },
  {
    role: 'AUCTION_OPERATOR',
    label: 'Auction Operator',
    description: 'Runs slot auctions, validates bid activity, and finalizes awards.',
    permissions: ['Auction board', 'Bid oversight', 'Award confirmations'],
    defaultRoute: '/auctions',
  },
  {
    role: 'EXECUTIVE_STAKEHOLDER',
    label: 'Executive Stakeholder',
    description: 'Reviews network performance, risks, and executive summaries.',
    permissions: ['Reports & analytics', 'Operations news', 'KPI summaries'],
    defaultRoute: '/reports',
  },
  {
    role: 'ADMIN',
    label: 'Platform Admin',
    description: 'Maintains policy, security, role mappings, and environment governance.',
    permissions: ['Access control', 'Environment policy', 'All operational views'],
    defaultRoute: '/access-control',
  },
];

export const roleAssignments: UserAssignment[] = [
  { name: 'Anika Sharma', team: 'National Ops', role: 'OPERATIONS_MANAGER', status: 'Active' },
  { name: 'Rajiv Menon', team: 'Port Command', role: 'PORT_ADMIN', status: 'Active' },
  {
    name: 'Meera Kulkarni',
    team: 'Auction Desk',
    role: 'AUCTION_OPERATOR',
    status: 'Pending Review',
  },
  { name: 'Arun Iyer', team: 'Executive Office', role: 'EXECUTIVE_STAKEHOLDER', status: 'Active' },
  { name: 'Platform Governance', team: 'Digital Core', role: 'ADMIN', status: 'Escalated' },
];

export const getRoleCapability = (role: UserRole): RoleCapability =>
  roleCapabilities.find((capability) => capability.role === role) ?? roleCapabilities[0];

export const normalizeUserRole = (role: UserRole): UserRole => legacyRoleMap[role] ?? role;
