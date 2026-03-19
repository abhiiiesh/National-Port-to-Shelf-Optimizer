export const kpiCards = [
  { label: 'Vessels in Transit', value: '12', trend: '+4% vs yesterday', tone: 'up' as const },
  {
    label: 'Container Delay Risk',
    value: '4',
    trend: '2 high-priority alerts',
    tone: 'warn' as const,
  },
  { label: 'Open Auctions', value: '3', trend: '1 ending in < 30 min', tone: 'warn' as const },
  {
    label: 'Rail Slot Utilization',
    value: '78%',
    trend: '+6% throughput this week',
    tone: 'up' as const,
  },
];

export const vesselRows = [
  { vessel: 'MV Saraswati', route: 'MUM -> DEL', eta: '12 Mar, 17:10', status: 'On Track' },
  { vessel: 'MV Horizon Star', route: 'CHN -> KOL', eta: '12 Mar, 19:30', status: 'Delay Risk' },
  { vessel: 'MV Pacific Arc', route: 'KOC -> MUM', eta: '12 Mar, 21:05', status: 'On Track' },
  { vessel: 'MV Atlas Prime', route: 'VIZ -> CHN', eta: '13 Mar, 00:20', status: 'Delay Risk' },
];

export interface TrackingMilestone {
  code: string;
  label: string;
  time: string;
  status: 'completed' | 'active' | 'upcoming';
}

export interface TrackingRecord {
  id: string;
  containerId: string;
  vessel: string;
  route: string;
  eta: string;
  status: 'On Track' | 'Delay Risk' | 'Escalated';
  mode: 'Rail' | 'Road' | 'Inland';
  terminal: string;
  owner: string;
  sla: 'Healthy' | 'Watch' | 'Breach Risk';
  priority: 'High' | 'Medium' | 'Low';
  delayReason: string;
  assignedAction: string;
  milestones: TrackingMilestone[];
}

export const trackingRecords: TrackingRecord[] = [
  {
    id: 'TRK-401',
    containerId: 'CONT-9A114',
    vessel: 'MV Saraswati',
    route: 'MUM -> DEL',
    eta: '12 Mar, 17:10',
    status: 'On Track',
    mode: 'Rail',
    terminal: 'JNPT West',
    owner: 'National Ops',
    sla: 'Healthy',
    priority: 'Low',
    delayReason: 'No current exception; rail handoff confirmed.',
    assignedAction: 'Monitor for final inland dispatch confirmation.',
    milestones: [
      { code: 'ARR', label: 'Port Arrival', time: '11 Mar, 22:30', status: 'completed' },
      { code: 'CLR', label: 'Customs Cleared', time: '12 Mar, 01:10', status: 'completed' },
      { code: 'RAIL', label: 'Rail Slot Assigned', time: '12 Mar, 08:25', status: 'active' },
      { code: 'DC', label: 'Delhi DC Gate-in', time: '12 Mar, 17:10', status: 'upcoming' },
    ],
  },
  {
    id: 'TRK-402',
    containerId: 'CONT-3K882',
    vessel: 'MV Horizon Star',
    route: 'CHN -> KOL',
    eta: '12 Mar, 19:30',
    status: 'Delay Risk',
    mode: 'Road',
    terminal: 'Chennai South',
    owner: 'Port Command',
    sla: 'Watch',
    priority: 'High',
    delayReason: 'Berth congestion increased dwell estimate by 42 minutes.',
    assignedAction: 'Move to alternate trucking lane and notify receiving warehouse.',
    milestones: [
      { code: 'ARR', label: 'Port Arrival', time: '12 Mar, 03:20', status: 'completed' },
      { code: 'BER', label: 'Berth Queue', time: '12 Mar, 07:45', status: 'completed' },
      { code: 'GATE', label: 'Gate-out Clearance', time: '12 Mar, 13:05', status: 'active' },
      { code: 'DC', label: 'Kolkata DC Arrival', time: '12 Mar, 19:30', status: 'upcoming' },
    ],
  },
  {
    id: 'TRK-403',
    containerId: 'CONT-7M231',
    vessel: 'MV Pacific Arc',
    route: 'KOC -> MUM',
    eta: '12 Mar, 21:05',
    status: 'On Track',
    mode: 'Inland',
    terminal: 'Kochi Inland Jetty',
    owner: 'Inland Ops',
    sla: 'Healthy',
    priority: 'Medium',
    delayReason: 'No critical issue; weather watch cleared.',
    assignedAction: 'Hold standard monitoring until Mumbai gate-in confirmation.',
    milestones: [
      { code: 'ARR', label: 'Port Arrival', time: '12 Mar, 02:10', status: 'completed' },
      { code: 'ULD', label: 'Unload Complete', time: '12 Mar, 06:55', status: 'completed' },
      { code: 'BGE', label: 'Inland Barge Departure', time: '12 Mar, 11:20', status: 'active' },
      { code: 'DC', label: 'Mumbai Cross-Dock', time: '12 Mar, 21:05', status: 'upcoming' },
    ],
  },
  {
    id: 'TRK-404',
    containerId: 'CONT-1Z604',
    vessel: 'MV Atlas Prime',
    route: 'VIZ -> CHN',
    eta: '13 Mar, 00:20',
    status: 'Escalated',
    mode: 'Rail',
    terminal: 'Vizag East',
    owner: 'Exception Desk',
    sla: 'Breach Risk',
    priority: 'High',
    delayReason: 'Cold-chain sensor anomaly requires manual inspection before departure.',
    assignedAction: 'Escalate to reefer support and secure replacement slot within 30 minutes.',
    milestones: [
      { code: 'ARR', label: 'Port Arrival', time: '12 Mar, 04:50', status: 'completed' },
      { code: 'CHK', label: 'Inspection Hold', time: '12 Mar, 09:40', status: 'completed' },
      { code: 'ESC', label: 'Exception Escalation', time: '12 Mar, 11:15', status: 'active' },
      { code: 'DC', label: 'Chennai Handoff', time: '13 Mar, 00:20', status: 'upcoming' },
    ],
  },
];

export const auctions = [
  { id: 'AUC-101', lane: 'MUM -> DEL', highestBid: '₹ 48,000', bids: 7, status: 'Open' },
  { id: 'AUC-102', lane: 'CHN -> HYD', highestBid: '₹ 31,500', bids: 5, status: 'Open' },
  { id: 'AUC-103', lane: 'KOL -> BLR', highestBid: '₹ 52,900', bids: 9, status: 'Closing Soon' },
];

export const slotPlans = [
  { mode: 'Rail', corridor: 'DFCC East', available: 34, utilization: 78 },
  { mode: 'Road', corridor: 'NH44', available: 52, utilization: 64 },
  { mode: 'Inland', corridor: 'NW-1', available: 18, utilization: 81 },
];

export const reports = [
  { name: 'Transit SLA Report', period: 'Daily', updated: '12 Mar, 12:10' },
  { name: 'Auction Efficiency', period: 'Weekly', updated: '12 Mar, 11:40' },
  { name: 'Slot Utilization Summary', period: 'Daily', updated: '12 Mar, 11:20' },
];

export const newsItems = [
  'ULIP sync completed for all west-coast terminals.',
  'Rail capacity expanded by 8% for next 72 hours.',
  'Two auction corridors marked as high demand.',
];

export const dashboardAlerts = [
  {
    title: 'High-risk reefer containers need reassignment',
    detail: '2 containers exceed cold-chain dwell threshold in the west corridor.',
    severity: 'critical' as const,
    owner: 'Port Command',
  },
  {
    title: 'Auction lane closing in 18 minutes',
    detail: 'KOL -> BLR lane has 9 active bids and pending approval on final reserve.',
    severity: 'warning' as const,
    owner: 'Auction Desk',
  },
  {
    title: 'ULIP feed recovered after intermittent delay',
    detail: 'Last successful sync was 4 minutes ago; monitor for repeat degradation.',
    severity: 'info' as const,
    owner: 'Integration Ops',
  },
];

export const quickActions = [
  {
    title: 'Open exception queue',
    detail: 'Review delayed containers and approve recovery actions.',
  },
  { title: 'Launch slot auction', detail: 'Create a new market event for constrained corridors.' },
  {
    title: 'Export executive report',
    detail: 'Generate the current daily SLA and throughput pack.',
  },
];

export const activityFeed = [
  {
    time: '11:52',
    actor: 'System',
    action: 'Recomputed berth ETA predictions for 12 inbound vessels.',
  },
  {
    time: '11:38',
    actor: 'Auction Desk',
    action: 'Raised reserve price on KOL -> BLR lane due to demand spike.',
  },
  {
    time: '11:21',
    actor: 'Port Command',
    action: 'Approved reassignment for reefer containers at MUM terminal.',
  },
  {
    time: '10:58',
    actor: 'Rail Ops',
    action: "Added 8 additional DFCC East slots for tonight's departure window.",
  },
];

export const corridorHealth = [
  { corridor: 'West Coast to North DC', utilization: 86, etaVariance: '+14 min', status: 'Watch' },
  {
    corridor: 'South Port to Inland Rail',
    utilization: 72,
    etaVariance: '-4 min',
    status: 'Healthy',
  },
  { corridor: 'East Coast Express', utilization: 91, etaVariance: '+21 min', status: 'Critical' },
];
