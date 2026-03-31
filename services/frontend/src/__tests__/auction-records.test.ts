import { mergeAuctionRecords } from '../features/auctions/records';

describe('auction record adapter', () => {
  it('falls back to mock auction records when the live payload is empty', () => {
    const records = mergeAuctionRecords([]);

    expect(records.length).toBeGreaterThan(0);
    expect(records[0].id.startsWith('AUC-')).toBe(true);
  });

  it('maps live auction feeds into operator-friendly auction records', () => {
    const records = mergeAuctionRecords([
      {
        id: 'auction-live-1',
        vesselId: 'vessel-1',
        portId: 'INMUM',
        startTime: '2026-03-20T10:00:00Z',
        endTime: '2026-03-20T12:00:00Z',
        status: 'ACTIVE',
        slots: [
          {
            id: 'slot-1',
            origin: 'INMUM',
            destination: 'INDEL',
            departureTime: '2026-03-20T13:00:00Z',
            minimumBid: 42000,
            capacity: 2,
          },
        ],
        bids: [
          {
            id: 'bid-1',
            retailerId: 'Retailer A',
            containerId: 'CONT-1',
            bidAmount: 48000,
            timestamp: '2026-03-20T10:15:00Z',
            status: 'ACCEPTED',
          },
        ],
      },
    ]);

    expect(records[0]).toMatchObject({
      id: 'auction-live-1',
      lane: 'INMUM -> INDEL',
      region: 'West',
      corridor: 'DFCC East',
      bids: 1,
      status: 'Active',
    });
    expect(records[0].highestBid).toContain('48,000');
  });
});
