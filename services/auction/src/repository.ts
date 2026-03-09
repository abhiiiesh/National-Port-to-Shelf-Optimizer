import { Auction, Bid } from '@port-to-shelf/shared-types';

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

  create(bid: Bid): Bid {
    this.bids.set(bid.id, bid);
    return bid;
  }

  update(bid: Bid): Bid {
    if (!this.bids.has(bid.id)) {
      throw new Error(`Bid ${bid.id} not found`);
    }

    this.bids.set(bid.id, bid);
    return bid;
  }

  listByAuction(auctionId: string): Bid[] {
    return Array.from(this.bids.values()).filter((bid) => bid.auctionId === auctionId);
  }
}
