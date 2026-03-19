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

export interface AccessRequest {
  requestId: string;
  requesterName: string;
  team: string;
  currentRole: UserRole;
  requestedRole: UserRole;
  requestedBy: UserRole;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  reason: string;
  tenant: string;
  submittedAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  actorRole: UserRole;
  timestamp: string;
  tenant: string;
  targetUser: string;
  oldRole: UserRole;
  newRole: UserRole;
  reason: string;
  outcome: 'Approved' | 'Rejected' | 'Requested';
}

export type GovernedAction =
  | 'reroute'
  | 'escalate'
  | 'hold'
  | 'release'
  | 'assign-slot'
  | 'create-auction'
  | 'pause-auction'
  | 'close-auction'
  | 'award-auction'
  | 'reject-bid';

export interface RoleActionPolicy {
  role: UserRole;
  trackingActions: GovernedAction[];
  auctionActions: GovernedAction[];
  canApproveAssignments: boolean;
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
    description:
      'Controls port operations, berth readiness, and submits governance change requests.',
    permissions: [
      'Port tracking control',
      'Capacity overrides',
      'Role assignment request creation',
    ],
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
    description: 'Maintains policy, security, role mappings, and approves access-control changes.',
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

export const initialAccessRequests: AccessRequest[] = [
  {
    requestId: 'REQ-201',
    requesterName: 'Meera Kulkarni',
    team: 'Auction Desk',
    currentRole: 'AUCTION_OPERATOR',
    requestedRole: 'PORT_ADMIN',
    requestedBy: 'PORT_ADMIN',
    status: 'Pending Approval',
    reason: 'Temporary berth coordination coverage during regional leave window.',
    tenant: 'port-to-shelf-india',
    submittedAt: '2026-03-19 09:10 UTC',
  },
  {
    requestId: 'REQ-202',
    requesterName: 'Arun Iyer',
    team: 'Executive Office',
    currentRole: 'EXECUTIVE_STAKEHOLDER',
    requestedRole: 'OPERATIONS_MANAGER',
    requestedBy: 'PORT_ADMIN',
    status: 'Pending Approval',
    reason: 'Requested temporary drill-down access for disruption review board.',
    tenant: 'port-to-shelf-india',
    submittedAt: '2026-03-19 10:00 UTC',
  },
];

export const initialAuditEntries: AuditEntry[] = [
  {
    id: 'AUD-3001',
    actor: 'System Bootstrap',
    actorRole: 'ADMIN',
    timestamp: '2026-03-18 17:40 UTC',
    tenant: 'port-to-shelf-india',
    targetUser: 'Rajiv Menon',
    oldRole: 'OPERATIONS_MANAGER',
    newRole: 'PORT_ADMIN',
    reason: 'Initial governance seed aligned with terminal command structure.',
    outcome: 'Approved',
  },
  {
    id: 'AUD-3002',
    actor: 'Anika Sharma',
    actorRole: 'PORT_ADMIN',
    timestamp: '2026-03-19 09:10 UTC',
    tenant: 'port-to-shelf-india',
    targetUser: 'Meera Kulkarni',
    oldRole: 'AUCTION_OPERATOR',
    newRole: 'PORT_ADMIN',
    reason: 'Submitted temporary cross-functional access request.',
    outcome: 'Requested',
  },
];

export const roleActionPolicies: RoleActionPolicy[] = [
  {
    role: 'OPERATIONS_MANAGER',
    trackingActions: ['reroute', 'escalate', 'hold', 'release', 'assign-slot'],
    auctionActions: ['create-auction', 'pause-auction', 'close-auction'],
    canApproveAssignments: false,
  },
  {
    role: 'PORT_ADMIN',
    trackingActions: ['reroute', 'escalate', 'hold', 'release', 'assign-slot'],
    auctionActions: ['create-auction', 'pause-auction', 'close-auction', 'award-auction'],
    canApproveAssignments: false,
  },
  {
    role: 'AUCTION_OPERATOR',
    trackingActions: ['escalate', 'hold'],
    auctionActions: [
      'create-auction',
      'pause-auction',
      'close-auction',
      'award-auction',
      'reject-bid',
    ],
    canApproveAssignments: false,
  },
  {
    role: 'EXECUTIVE_STAKEHOLDER',
    trackingActions: ['escalate'],
    auctionActions: [],
    canApproveAssignments: false,
  },
  {
    role: 'ADMIN',
    trackingActions: ['reroute', 'escalate', 'hold', 'release', 'assign-slot'],
    auctionActions: [
      'create-auction',
      'pause-auction',
      'close-auction',
      'award-auction',
      'reject-bid',
    ],
    canApproveAssignments: true,
  },
];

export const actionLabels: Record<GovernedAction, string> = {
  reroute: 'Reroute',
  escalate: 'Escalate',
  hold: 'Hold',
  release: 'Release',
  'assign-slot': 'Assign Slot',
  'create-auction': 'Create Auction',
  'pause-auction': 'Pause Auction',
  'close-auction': 'Close Auction',
  'award-auction': 'Award Auction',
  'reject-bid': 'Reject Bid',
};

export const getRoleCapability = (role: UserRole): RoleCapability =>
  roleCapabilities.find((capability) => capability.role === role) ?? roleCapabilities[0];

export const normalizeUserRole = (role: UserRole): UserRole => legacyRoleMap[role] ?? role;
