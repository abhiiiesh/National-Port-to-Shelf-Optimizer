import {
  Auction,
  AuctionCreation,
  AuctionResult,
  AuctionStatus,
  Bid,
  BidStatus,
  BidSubmission,
  BidWinner,
  BookingConfirmation,
  DomainEvent,
  Slot,
} from '@port-to-shelf/shared-types';
import { AuctionRepository, BidRepository } from './repository';

export interface EventPublisher {
  publish(event: DomainEvent): Promise<boolean>;
}

export interface EventSubscriber {
  subscribe(topic: string, consumerGroup: string, handler: (event: DomainEvent) => Promise<void>): unknown;
}

export class AuctionService {
  private readonly containerOwner = new Map<string, string>();

  constructor(
    private readonly auctionRepository = new AuctionRepository(),
    private readonly bidRepository = new BidRepository(),
    private readonly publisher?: EventPublisher
  ) {}

  registerContainerOwnership(containerId: string, retailerId: string): void {
    this.containerOwner.set(containerId, retailerId);
  }

  async createAuction(input: AuctionCreation): Promise<Auction> {
    const slots: Slot[] = input.slots.map((slot, idx) => ({ ...slot, id: `slot-${Date.now()}-${idx}` }));
    const auction: Auction = {
      id: `auction-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vesselId: input.vesselId,
      portId: input.portId,
      slots,
      startTime: input.startTime,
      endTime: input.endTime,
      status: AuctionStatus.ACTIVE,
      bids: [],
    };

    this.auctionRepository.create(auction);
    await this.publish({
      eventId: `${auction.id}-created`,
      eventType: 'auction.created',
      timestamp: new Date(),
      source: 'auction-service',
      version: 1,
      payload: { auctionId: auction.id, slotCount: auction.slots.length },
    });

    return auction;
  }

  async submitBid(submission: BidSubmission): Promise<Bid> {
    const auction = this.mustGetAuction(submission.auctionId);
    if (auction.status !== AuctionStatus.ACTIVE || auction.endTime.getTime() < Date.now()) {
      throw new Error('Cannot bid on inactive or expired auction');
    }

    const slot = auction.slots.find((entry) => entry.id === submission.slotId);
    if (!slot) {
      throw new Error(`Slot ${submission.slotId} not found in auction`);
    }

    if (submission.bidAmount < slot.minimumBid) {
      throw new Error('Bid amount below minimum bid');
    }

    const owner = this.containerOwner.get(submission.containerId);
    if (!owner || owner !== submission.retailerId) {
      throw new Error('Container ownership validation failed');
    }

    const bid: Bid = {
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      auctionId: submission.auctionId,
      slotId: submission.slotId,
      retailerId: submission.retailerId,
      containerId: submission.containerId,
      bidAmount: submission.bidAmount,
      timestamp: new Date(),
      status: BidStatus.SUBMITTED,
    };

    this.bidRepository.executeTransaction(() => {
      this.bidRepository.create(bid);
      auction.bids.push(bid);
      this.auctionRepository.update(auction);
    });

    await this.publish({
      eventId: `${bid.id}-submitted`,
      eventType: 'bid.submitted',
      timestamp: new Date(),
      source: 'auction-service',
      version: 1,
      payload: { auctionId: bid.auctionId, bidId: bid.id, amount: bid.bidAmount },
    });

    await this.publish({
      eventId: `${bid.id}-placed`,
      eventType: 'auction.bid.placed',
      timestamp: new Date(),
      source: 'auction-service',
      version: 1,
      payload: { auctionId: bid.auctionId, bidId: bid.id, slotId: bid.slotId },
    });

    return bid;
  }

  async closeAuction(auctionId: string): Promise<AuctionResult> {
    const auction = this.mustGetAuction(auctionId);
    const bids = this.bidRepository.listByAuction(auctionId);

    const winners: BidWinner[] = [];

    for (const slot of auction.slots) {
      const slotBids = bids.filter((bid) => bid.slotId === slot.id).sort((a, b) => b.bidAmount - a.bidAmount);
      const accepted = slotBids.slice(0, slot.capacity);

      for (const acceptedBid of accepted) {
        acceptedBid.status = BidStatus.ACCEPTED;
        this.bidRepository.update(acceptedBid);
        winners.push({
          slotId: slot.id,
          bid: acceptedBid,
          booking: this.createBooking(slot, acceptedBid),
        });
      }

      for (const rejectedBid of slotBids.slice(slot.capacity)) {
        rejectedBid.status = winners.some((winner) => winner.slotId === slot.id) ? BidStatus.OUTBID : BidStatus.REJECTED;
        this.bidRepository.update(rejectedBid);
      }
    }

    auction.status = AuctionStatus.CLOSED;
    auction.bids = this.bidRepository.listByAuction(auctionId);
    this.auctionRepository.update(auction);
    this.bidRepository.recordAuctionClose(auctionId);

    const result: AuctionResult = {
      auctionId,
      winners,
      closedAt: new Date(),
    };

    await this.publish({
      eventId: `${auctionId}-closed`,
      eventType: 'auction.closed',
      timestamp: result.closedAt,
      source: 'auction-service',
      version: 1,
      payload: { auctionId, winnerCount: winners.length },
    });

    return result;
  }

  getAuction(auctionId: string): Auction | undefined {
    return this.auctionRepository.findById(auctionId);
  }

  getTransactionLog() {
    return this.bidRepository.listTransactions();
  }

  createBackupSnapshot() {
    return this.bidRepository.createBackup(this.auctionRepository.list());
  }

  restoreBackupSnapshot(snapshot: ReturnType<BidRepository['createBackup']>): void {
    this.bidRepository.restoreBackup(snapshot);
    snapshot.auctions.forEach((auction) => {
      if (this.auctionRepository.findById(auction.id)) {
        this.auctionRepository.update({ ...auction, slots: [...auction.slots], bids: [...auction.bids] });
      } else {
        this.auctionRepository.create({ ...auction, slots: [...auction.slots], bids: [...auction.bids] });
      }
    });
  }

  listActiveAuctions(destination?: string): Auction[] {
    return this.auctionRepository
      .list()
      .filter((auction) => auction.status === AuctionStatus.ACTIVE)
      .filter((auction) => !destination || auction.slots.some((slot) => slot.destination === destination));
  }

  bindToEventBus(subscriber: EventSubscriber): void {
    subscriber.subscribe('slot.reserved', 'auction-service', async (event) => {
      const payload = event.payload as { slotId: string; containerId: string };
      const now = new Date();

      await this.createAuction({
        vesselId: 'unknown-vessel',
        portId: 'UNKNOWN',
        slots: [
          {
            transportMode: 'TRUCK' as any,
            origin: 'UNKNOWN',
            destination: 'UNKNOWN',
            departureTime: now,
            capacity: 1,
            minimumBid: 100,
          },
        ],
        startTime: now,
        endTime: new Date(now.getTime() + 60 * 60 * 1000),
      });

      if (payload?.containerId) {
        this.registerContainerOwnership(payload.containerId, 'unknown-retailer');
      }
    });
  }

  private createBooking(slot: Slot, bid: Bid): BookingConfirmation {
    return {
      bookingId: `booking-${bid.id}`,
      containerId: bid.containerId,
      transportMode: slot.transportMode,
      route: { origin: slot.origin, destination: slot.destination },
      scheduledDeparture: slot.departureTime,
      estimatedArrival: new Date(slot.departureTime.getTime() + 6 * 60 * 60 * 1000),
      cost: bid.bidAmount,
      status: 'CONFIRMED',
    };
  }

  private mustGetAuction(auctionId: string): Auction {
    const auction = this.auctionRepository.findById(auctionId);
    if (!auction) {
      throw new Error(`Auction ${auctionId} not found`);
    }

    return auction;
  }

  private async publish(event: DomainEvent): Promise<void> {
    if (!this.publisher) {
      return;
    }

    await this.publisher.publish(event);
  }
}
