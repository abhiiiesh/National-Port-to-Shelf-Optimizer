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
