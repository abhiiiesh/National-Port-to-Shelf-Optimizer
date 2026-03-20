import type { FrontendAuctionFeed } from '../../config/contracts';
import { auctionRecords, type AuctionRecord } from '../../app/mock-data';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatWindow = (startTime: string, endTime: string): string => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'Window pending';
  }

  const formatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });

  return `${formatter.format(start).replace(',', ' ·')} - ${formatter.format(end).replace(',', ' ·')}`;
};

const toAuctionStatus = (status: FrontendAuctionFeed['status']): AuctionRecord['status'] => {
  if (status === 'CLOSED' || status === 'CANCELLED') {
    return 'Closed';
  }

  return 'Active';
};

const regionByPort: Record<string, AuctionRecord['region']> = {
  INMUM: 'West',
  INNSA: 'South',
  INCCU: 'East',
  INDEL: 'North',
};

const corridorByDestination = (destination: string): AuctionRecord['corridor'] => {
  if (destination.includes('DEL')) {
    return 'DFCC East';
  }

  if (destination.includes('HYD')) {
    return 'NH44';
  }

  if (destination.includes('CCU')) {
    return 'East Coast Express';
  }

  return 'NW-1';
};

const bidStatusLabel = (
  status: FrontendAuctionFeed['bids'][number]['status']
): AuctionRecord['bidHistory'][number]['status'] => {
  if (status === 'ACCEPTED') {
    return 'Leading';
  }

  if (status === 'OUTBID') {
    return 'Outbid';
  }

  return 'Pending Review';
};

export const mergeAuctionRecords = (feeds: FrontendAuctionFeed[]): AuctionRecord[] => {
  if (feeds.length === 0) {
    return auctionRecords;
  }

  return feeds.map((feed, index) => {
    const template = auctionRecords[index % auctionRecords.length];
    const primarySlot = feed.slots[0];
    const highestBidValue = feed.bids.reduce(
      (current, bid) => Math.max(current, bid.bidAmount),
      primarySlot?.minimumBid ?? 0
    );

    return {
      ...template,
      id: feed.id,
      lane: primarySlot ? `${primarySlot.origin} -> ${primarySlot.destination}` : template.lane,
      region: regionByPort[feed.portId] ?? template.region,
      corridor: primarySlot ? corridorByDestination(primarySlot.destination) : template.corridor,
      highestBid: formatCurrency(highestBidValue),
      bids: feed.bids.length,
      status: toAuctionStatus(feed.status),
      reservePrice: formatCurrency(primarySlot?.minimumBid ?? 0),
      slotWindow: formatWindow(feed.startTime, feed.endTime),
      operator: `Live Auction Desk · ${feed.portId}`,
      note:
        feed.bids.length > 0
          ? `Live auction feed active with ${feed.bids.length} bids received for the current slot window.`
          : 'Live auction feed active; waiting for the first valid bid submission.',
      bidHistory: feed.bids
        .slice()
        .sort((left, right) => right.bidAmount - left.bidAmount)
        .map((bid) => ({
          bidder: bid.retailerId,
          amount: formatCurrency(bid.bidAmount),
          timestamp: bid.timestamp,
          status: bidStatusLabel(bid.status),
        })),
    };
  });
};
