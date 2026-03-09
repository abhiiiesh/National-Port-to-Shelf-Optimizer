export interface DashboardLink {
  name: string;
  url: string;
}

export interface RunbookLink {
  alertCode: string;
  url: string;
}

export const frontendDashboardLinks: DashboardLink[] = [
  { name: 'Frontend Error Overview', url: '/dashboards/frontend-errors' },
  { name: 'Frontend Latency Overview', url: '/dashboards/frontend-latency' },
  { name: 'Gateway Correlation View', url: '/dashboards/gateway-correlation' },
];

export const frontendRunbooks: RunbookLink[] = [
  { alertCode: 'HIGH_ERROR_RATE', url: '/runbooks/frontend/high-error-rate' },
  { alertCode: 'HIGH_INTERACTION_LATENCY', url: '/runbooks/frontend/high-interaction-latency' },
];

export const resolveRunbookForAlert = (alertCode: string): RunbookLink | null =>
  frontendRunbooks.find((item) => item.alertCode === alertCode) ?? null;
