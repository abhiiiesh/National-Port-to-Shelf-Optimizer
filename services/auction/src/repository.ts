import { Auction, Bid } from '@port-to-shelf/shared-types';

export interface AuctionTransactionRecord {
  transactionId: string;
  type: 'bid.submitted' | 'bid.updated' | 'auction.closed';
  timestamp: Date;
  auctionId: string;
  bidId?: string;
  retailerId?: string;
  containerId?: string;
}

export interface AuctionRepositoryBackup {
  auctions: Auction[];
  bids: Bid[];
  transactions: AuctionTransactionRecord[];
}

export class AuctionRepository {
  private readonly auctions = new Map<string, Auction>();

  create(auction: Auction): Auction {
    this.auctions.set(auction.id, auction);
    return auction;
  }

  update(auction: Auction): Auction {
    if (!this.auctions.has(auction.id)) {
      throw new Error(`Auction ${auction.id} not found`);
    }

    this.auctions.set(auction.id, auction);
    return auction;
  }

  findById(id: string): Auction | undefined {
    return this.auctions.get(id);
  }

  list(): Auction[] {
    return Array.from(this.auctions.values());
  }
}

export class BidRepository {
  private readonly bids = new Map<string, Bid>();
  private readonly transactions: AuctionTransactionRecord[] = [];

  create(bid: Bid): Bid {
    this.bids.set(bid.id, bid);
    this.transactions.push({
      transactionId: `txn-${bid.id}`,
      type: 'bid.submitted',
      timestamp: bid.timestamp,
      auctionId: bid.auctionId,
      bidId: bid.id,
      retailerId: bid.retailerId,
      containerId: bid.containerId,
    });
    return bid;
  }

  update(bid: Bid): Bid {
    if (!this.bids.has(bid.id)) {
      throw new Error(`Bid ${bid.id} not found`);
    }

    this.bids.set(bid.id, bid);
    this.transactions.push({
      transactionId: `txn-update-${bid.id}-${Date.now()}`,
      type: 'bid.updated',
      timestamp: new Date(),
      auctionId: bid.auctionId,
      bidId: bid.id,
      retailerId: bid.retailerId,
      containerId: bid.containerId,
    });
    return bid;
  }

  listByAuction(auctionId: string): Bid[] {
    return Array.from(this.bids.values()).filter((bid) => bid.auctionId === auctionId);
  }

  recordAuctionClose(auctionId: string): void {
    this.transactions.push({
      transactionId: `txn-close-${auctionId}-${Date.now()}`,
      type: 'auction.closed',
      timestamp: new Date(),
      auctionId,
    });
  }

  listTransactions(): AuctionTransactionRecord[] {
    return [...this.transactions];
  }

  executeTransaction<T>(operation: () => T): T {
    const bidSnapshot = new Map(this.bids);
    const transactionSnapshot = [...this.transactions];

    try {
      return operation();
    } catch (error) {
      this.bids.clear();
      bidSnapshot.forEach((bid, id) => this.bids.set(id, bid));
      this.transactions.length = 0;
      this.transactions.push(...transactionSnapshot);
      throw error;
    }
  }

  createBackup(auctions: Auction[]): AuctionRepositoryBackup {
    return {
      auctions: auctions.map((auction) => ({ ...auction, slots: [...auction.slots], bids: [...auction.bids] })),
      bids: Array.from(this.bids.values()).map((bid) => ({ ...bid })),
      transactions: [...this.transactions],
    };
  }

  restoreBackup(snapshot: AuctionRepositoryBackup): void {
    this.bids.clear();
    snapshot.bids.forEach((bid) => this.bids.set(bid.id, { ...bid }));
    this.transactions.length = 0;
    this.transactions.push(...snapshot.transactions);
  }
}
