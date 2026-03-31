import React from 'react';
import { auctionRecords, type AuctionRecord } from '../mock-data';
import { fetchAuctions, submitAuctionAction } from '../../shared/api-client';
import { mergeAuctionRecords } from '../../features/auctions/records';
import { getRoleCapability, roleActionPolicies, type UserRole } from '../access-control';

type AuctionTab = 'All' | 'Active' | 'Closing' | 'Closed';

const auctionTabs: AuctionTab[] = ['All', 'Active', 'Closing', 'Closed'];
const regions = ['All regions', 'North', 'South', 'East', 'West'] as const;
const corridors = ['All corridors', 'DFCC East', 'NH44', 'NW-1', 'East Coast Express'] as const;
const operatorActions = ['Create Auction', 'Pause', 'Close', 'Award', 'Reject Bid'] as const;
const auctionActionMap = {
  'Create Auction': 'create-auction',
  Pause: 'pause-auction',
  Close: 'close-auction',
  Award: 'award-auction',
  'Reject Bid': 'reject-bid',
} as const;

const badgeToneForAuction = (status: AuctionRecord['status']): string => {
  if (status === 'Active') {
    return 'ok';
  }

  if (status === 'Closing') {
    return 'warn';
  }

  return 'neutral';
};

export function AuctionsPage({
  activeRole = 'AUCTION_OPERATOR',
}: {
  activeRole?: UserRole;
}): JSX.Element {
  const [records, setRecords] = React.useState<AuctionRecord[]>(auctionRecords);
  const [dataSource, setDataSource] = React.useState<'mock' | 'live'>('mock');
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadMessage, setLoadMessage] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<AuctionTab>('All');
  const [regionFilter, setRegionFilter] = React.useState<(typeof regions)[number]>('All regions');
  const [corridorFilter, setCorridorFilter] =
    React.useState<(typeof corridors)[number]>('All corridors');
  const [selectedAuctionId, setSelectedAuctionId] = React.useState(auctionRecords[0]?.id ?? '');
  const [activityLog, setActivityLog] = React.useState<string[]>([
    'Auction Desk initialized operator workspace.',
  ]);
  const [actionBusy, setActionBusy] = React.useState(false);
  const policy = roleActionPolicies.find((entry) => entry.role === activeRole);
  const allowedAuctionActions = policy?.auctionActions ?? [];

  const hydrateLiveAuctions = React.useCallback(async () => {
    setIsLoading(true);
    setLoadMessage(null);

    try {
      const feeds = await fetchAuctions();
      const mergedRecords = mergeAuctionRecords(feeds);
      setRecords(mergedRecords);
      setDataSource('live');
      setSelectedAuctionId(mergedRecords[0]?.id ?? '');
      setLoadMessage(`Live auction feed connected · ${mergedRecords.length} auctions synced.`);
    } catch (error) {
      setRecords(auctionRecords);
      setDataSource('mock');
      setSelectedAuctionId(auctionRecords[0]?.id ?? '');
      setLoadMessage(
        error instanceof Error
          ? `Live auction feed unavailable, showing responsive mock fallback. ${error.message}`
          : 'Live auction feed unavailable, showing responsive mock fallback.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void hydrateLiveAuctions();
  }, [hydrateLiveAuctions]);

  const filteredAuctions = React.useMemo(() => {
    return records.filter((auction) => {
      const matchesTab = tab === 'All' || auction.status === tab;
      const matchesRegion = regionFilter === 'All regions' || auction.region === regionFilter;
      const matchesCorridor =
        corridorFilter === 'All corridors' || auction.corridor === corridorFilter;

      return matchesTab && matchesRegion && matchesCorridor;
    });
  }, [corridorFilter, records, regionFilter, tab]);

  const selectedAuction =
    filteredAuctions.find((auction) => auction.id === selectedAuctionId) ??
    filteredAuctions[0] ??
    null;

  React.useEffect(() => {
    if (selectedAuction && selectedAuction.id !== selectedAuctionId) {
      setSelectedAuctionId(selectedAuction.id);
    }
  }, [selectedAuction, selectedAuctionId]);

  const runAction = async (action: (typeof operatorActions)[number]): Promise<void> => {
    if (!selectedAuction) {
      return;
    }

    setActionBusy(true);
    try {
      const result = await submitAuctionAction(selectedAuction.id, auctionActionMap[action]);
      setDataSource('live');
      setLoadMessage(`Live auction action accepted · ${result.message}`);
      setActivityLog((current) => [
        `${action} accepted for ${selectedAuction.id} · ${result.status} · ${result.operationId}`,
        ...current,
      ]);
    } catch (error) {
      setDataSource('mock');
      setLoadMessage(
        error instanceof Error
          ? `Live auction action unavailable; logged locally. ${error.message}`
          : 'Live auction action unavailable; logged locally.'
      );
      setActivityLog((current) => [
        `${action} logged locally for ${selectedAuction.id} · mock fallback`,
        ...current,
      ]);
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section>
      <div className="page-hero auctions-hero">
        <div>
          <h2 className="page-heading">Dynamic Slot Auctions</h2>
          <p className="page-subheading">
            Manage auction lifecycles with simplified status tabs, corridor and region filters, live
            bid inspection, and operator actions from a single responsive board.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Auction milestone</div>
          <div className="hero-status-value">Operator workflow board is now live</div>
          <div className="kpi-trend up">
            {dataSource === 'live'
              ? 'Auction API adapter is active with dynamic operator data'
              : 'Mock fallback stays available when live auction data is unavailable'}
          </div>
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
          <button
            className="secondary-button"
            type="button"
            onClick={() => void hydrateLiveAuctions()}
            disabled={isLoading}
          >
            {isLoading ? 'Refreshing…' : 'Refresh live feed'}
          </button>
          <span className={`tag ${dataSource === 'live' ? 'good' : ''}`}>
            Source: {dataSource === 'live' ? 'Live API' : 'Mock fallback'}
          </span>
          <span className="tag">Visible auctions: {filteredAuctions.length}</span>
        </div>
        {loadMessage ? <div className="notice compact-notice">{loadMessage}</div> : null}
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
                  {operatorActions.map((action) => {
                    const mappedAction = auctionActionMap[action];
                    const canRunAction = allowedAuctionActions.includes(mappedAction);

                    return (
                      <button
                        className="secondary-button"
                        key={action}
                        type="button"
                        disabled={actionBusy || !canRunAction}
                        title={
                          canRunAction
                            ? `Run ${action}`
                            : `${getRoleCapability(activeRole).label} cannot run ${action} actions`
                        }
                        onClick={() => void runAction(action)}
                      >
                        {actionBusy ? 'Submitting…' : action}
                      </button>
                    );
                  })}
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
            <div className="kpi-label">
              Dynamic operator activity log for the current session across responsive layouts
            </div>
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
