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
