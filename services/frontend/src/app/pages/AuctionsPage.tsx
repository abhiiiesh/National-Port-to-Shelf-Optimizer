import React from 'react';
import { auctionRecords, type AuctionRecord } from '../mock-data';

type AuctionTab = 'All' | 'Active' | 'Closing' | 'Closed';

const auctionTabs: AuctionTab[] = ['All', 'Active', 'Closing', 'Closed'];
const regions = ['All regions', 'North', 'South', 'East', 'West'] as const;
const corridors = ['All corridors', 'DFCC East', 'NH44', 'NW-1', 'East Coast Express'] as const;
const operatorActions = ['Create Auction', 'Pause', 'Close', 'Award', 'Reject Bid'] as const;

const badgeToneForAuction = (status: AuctionRecord['status']): string => {
  if (status === 'Active') {
    return 'ok';
  }

  if (status === 'Closing') {
    return 'warn';
  }

  return 'neutral';
};

export function AuctionsPage(): JSX.Element {
  const [tab, setTab] = React.useState<AuctionTab>('All');
  const [regionFilter, setRegionFilter] = React.useState<(typeof regions)[number]>('All regions');
  const [corridorFilter, setCorridorFilter] =
    React.useState<(typeof corridors)[number]>('All corridors');
  const [selectedAuctionId, setSelectedAuctionId] = React.useState(auctionRecords[0]?.id ?? '');
  const [activityLog, setActivityLog] = React.useState<string[]>([
    'Auction Desk initialized operator workspace.',
  ]);

  const filteredAuctions = React.useMemo(() => {
    return auctionRecords.filter((auction) => {
      const matchesTab = tab === 'All' || auction.status === tab;
      const matchesRegion = regionFilter === 'All regions' || auction.region === regionFilter;
      const matchesCorridor =
        corridorFilter === 'All corridors' || auction.corridor === corridorFilter;

      return matchesTab && matchesRegion && matchesCorridor;
    });
  }, [corridorFilter, regionFilter, tab]);

  const selectedAuction =
    filteredAuctions.find((auction) => auction.id === selectedAuctionId) ??
    filteredAuctions[0] ??
    null;

  React.useEffect(() => {
    if (selectedAuction && selectedAuction.id !== selectedAuctionId) {
      setSelectedAuctionId(selectedAuction.id);
    }
  }, [selectedAuction, selectedAuctionId]);

  const runAction = (action: (typeof operatorActions)[number]): void => {
    if (!selectedAuction) {
      return;
    }

    setActivityLog((current) => [
      `${action} triggered for ${selectedAuction.id} · ${selectedAuction.lane}`,
      ...current,
    ]);
  };

  return (
    <section>
      <div className="page-hero auctions-hero">
        <div>
          <h2 className="page-heading">Dynamic Slot Auctions</h2>
          <p className="page-subheading">
            Manage auction lifecycles with simplified status tabs, corridor and region filters, live
            bid inspection, and operator actions from a single board.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Auction milestone</div>
          <div className="hero-status-value">Operator workflow board is now live</div>
          <div className="kpi-trend up">Ready for API adapter replacement after UX sign-off</div>
        </div>
      </div>

      <div className="card auctions-toolbar">
        <div className="tab-row">
          {auctionTabs.map((item) => (
            <button
              key={item}
              type="button"
              className={`tab-button ${tab === item ? 'active' : ''}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="page-controls auction-filters">
          <select
            value={regionFilter}
            onChange={(event) => setRegionFilter(event.target.value as (typeof regions)[number])}
          >
            {regions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={corridorFilter}
            onChange={(event) =>
              setCorridorFilter(event.target.value as (typeof corridors)[number])
            }
          >
            {corridors.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="tag">Visible auctions: {filteredAuctions.length}</span>
        </div>
      </div>

      <div className="auction-layout">
        <article className="card auction-board-card">
          <div className="auction-board-grid">
            {filteredAuctions.map((auction) => (
              <button
                className={`auction-summary-card ${selectedAuction?.id === auction.id ? 'selected' : ''}`}
                key={auction.id}
                type="button"
                onClick={() => setSelectedAuctionId(auction.id)}
              >
                <div className="card-header-row">
                  <strong>{auction.id}</strong>
                  <span className={`badge ${badgeToneForAuction(auction.status)}`}>
                    {auction.status}
                  </span>
                </div>
                <div>{auction.lane}</div>
                <div className="kpi-label">
                  {auction.region} · {auction.corridor}
                </div>
                <div className="auction-metrics">
                  <div>
                    <span>Highest bid</span>
                    <strong>{auction.highestBid}</strong>
                  </div>
                  <div>
                    <span>Bids</span>
                    <strong>{auction.bids}</strong>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {filteredAuctions.length === 0 ? (
            <div className="notice compact-notice">
              No auctions match the current status, region, and corridor filters.
            </div>
          ) : null}
        </article>

        <aside className="card auction-detail-card">
          {selectedAuction ? (
            <>
              <div className="card-header-row">
                <div>
                  <h3>{selectedAuction.id}</h3>
                  <div className="kpi-label">
                    {selectedAuction.lane} · {selectedAuction.region} · {selectedAuction.corridor}
                  </div>
                </div>
                <span className={`badge ${badgeToneForAuction(selectedAuction.status)}`}>
                  {selectedAuction.status}
                </span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>Reserve</span>
                  <strong>{selectedAuction.reservePrice}</strong>
                </div>
                <div className="detail-item">
                  <span>Highest bid</span>
                  <strong>{selectedAuction.highestBid}</strong>
                </div>
                <div className="detail-item">
                  <span>Slot window</span>
                  <strong>{selectedAuction.slotWindow}</strong>
                </div>
                <div className="detail-item">
                  <span>Operator</span>
                  <strong>{selectedAuction.operator}</strong>
                </div>
              </div>

              <div className="drawer-section">
                <div className="section-label">Bid detail note</div>
                <p>{selectedAuction.note}</p>
              </div>

              <div className="drawer-section">
                <div className="section-label">Operator actions</div>
                <div className="action-button-grid">
                  {operatorActions.map((action) => (
                    <button
                      className="secondary-button"
                      key={action}
                      type="button"
                      onClick={() => runAction(action)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="drawer-section">
                <div className="section-label">Bid history</div>
                <div className="stack-list">
                  {selectedAuction.bidHistory.map((bid) => (
                    <div className="approval-card" key={`${bid.bidder}-${bid.timestamp}`}>
                      <div className="card-header-row">
                        <strong>{bid.bidder}</strong>
                        <span
                          className={`badge ${bid.status === 'Leading' ? 'ok' : bid.status === 'Outbid' ? 'warn' : 'neutral'}`}
                        >
                          {bid.status}
                        </span>
                      </div>
                      <div>{bid.amount}</div>
                      <div className="kpi-label">{bid.timestamp}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="notice">
              Select an auction to inspect bid details and operator actions.
            </div>
          )}
        </aside>
      </div>

      <article className="card" style={{ marginTop: '16px' }}>
        <div className="card-header-row">
          <div>
            <h3>Recent Auction Actions</h3>
            <div className="kpi-label">Dynamic operator activity log for the current session</div>
          </div>
          <span className="tag good">{activityLog.length} events</span>
        </div>
        <div className="stack-list">
          {activityLog.map((entry) => (
            <div className="policy-card" key={entry}>
              {entry}
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
