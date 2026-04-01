import React from 'react';
import { reports } from '../mock-data';
import { fetchAuctions, fetchPerformance, fetchVessels } from '../../shared/api-client';

const scheduledReports = [
  {
    name: 'Executive SLA Digest',
    period: 'Daily · 08:00 UTC',
    owner: 'Operations Intelligence',
    status: 'Scheduled',
  },
  {
    name: 'Auction Conversion Pack',
    period: 'Weekly · Monday',
    owner: 'Auction Governance',
    status: 'Scheduled',
  },
  {
    name: 'Capacity Risk Bulletin',
    period: 'Daily · 17:00 UTC',
    owner: 'Port Command',
    status: 'Draft',
  },
] as const;

export function ReportsPage(): JSX.Element {
  const [dataSource, setDataSource] = React.useState<'mock' | 'live'>('mock');
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [kpi, setKpi] = React.useState({
    totalShipments: 0,
    delayedShipments: 0,
    avgTransitHours: 0,
    liveVessels: 0,
    liveAuctions: 0,
  });

  const hydrateReports = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [performance, vessels, auctions] = await Promise.all([
        fetchPerformance(),
        fetchVessels(),
        fetchAuctions(),
      ]);
      setKpi({
        totalShipments: performance.totalShipments,
        delayedShipments: performance.delayedShipments,
        avgTransitHours: performance.avgTransitHours,
        liveVessels: vessels.length,
        liveAuctions: auctions.length,
      });
      setDataSource('live');
      setMessage('Live analytics feeds connected for executive reporting.');
    } catch (error) {
      setDataSource('mock');
      setKpi({
        totalShipments: 124,
        delayedShipments: 9,
        avgTransitHours: 13.8,
        liveVessels: 12,
        liveAuctions: 4,
      });
      setMessage(
        error instanceof Error
          ? `Live analytics unavailable; using decision-support fallback. ${error.message}`
          : 'Live analytics unavailable; using decision-support fallback.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void hydrateReports();
  }, [hydrateReports]);

  return (
    <section>
      <div className="page-hero">
        <div>
          <h2 className="page-heading">Reports & Analytics</h2>
          <p className="page-subheading">
            Decision-ready analytics with live KPI rollups, scheduled executive reporting, and
            export-ready operational summaries.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Analytics source</div>
          <div className="hero-status-value">
            {dataSource === 'live' ? 'Live operational feeds' : 'Mock decision-support fallback'}
          </div>
          <div className="kpi-trend up">
            {dataSource === 'live'
              ? 'Reports are backed by live API aggregates'
              : 'Fallback data shown while live reporting adapters are unavailable'}
          </div>
        </div>
      </div>

      <div className="tracking-toolbar-summary" style={{ marginBottom: '16px' }}>
        <span className={`tag ${dataSource === 'live' ? 'good' : ''}`}>
          Source: {dataSource === 'live' ? 'Live API' : 'Fallback'}
        </span>
        <button
          className="secondary-button"
          type="button"
          disabled={isLoading}
          onClick={() => void hydrateReports()}
        >
          {isLoading ? 'Refreshing…' : 'Refresh analytics'}
        </button>
      </div>
      {message ? <div className="notice compact-notice">{message}</div> : null}

      <div className="grid kpis" style={{ marginBottom: '16px' }}>
        <article className="card">
          <div className="kpi-label">Total shipments</div>
          <div className="kpi-value">{kpi.totalShipments}</div>
          <div className="kpi-trend up">Current reporting window</div>
        </article>
        <article className="card">
          <div className="kpi-label">Delayed shipments</div>
          <div className="kpi-value">{kpi.delayedShipments}</div>
          <div className="kpi-trend warn">Requires exception review</div>
        </article>
        <article className="card">
          <div className="kpi-label">Average transit hours</div>
          <div className="kpi-value">{kpi.avgTransitHours.toFixed(1)}</div>
          <div className="kpi-trend up">Across active corridors</div>
        </article>
        <article className="card">
          <div className="kpi-label">Live feeds in scope</div>
          <div className="kpi-value">
            {kpi.liveVessels} vessels · {kpi.liveAuctions} auctions
          </div>
          <div className="kpi-trend up">Tracking + auction analytics</div>
        </article>
      </div>

      <div className="access-grid">
        <article className="card">
          <h3>Operational Reports Catalog</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Report</th>
                <th>Frequency</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.name}>
                  <td>{report.name}</td>
                  <td>{report.period}</td>
                  <td>{report.updated}</td>
                  <td>
                    <button className="secondary-button" type="button">
                      Export CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Scheduled Reporting Workflows</h3>
          <div className="stack-list">
            {scheduledReports.map((workflow) => (
              <div className="policy-card" key={workflow.name}>
                <div className="card-header-row">
                  <strong>{workflow.name}</strong>
                  <span className={`badge ${workflow.status === 'Scheduled' ? 'ok' : 'warn'}`}>
                    {workflow.status}
                  </span>
                </div>
                <div className="kpi-label">{workflow.period}</div>
                <div className="kpi-label">Owner: {workflow.owner}</div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card" style={{ marginTop: '16px' }}>
        <h3>Executive Summary</h3>
        <p>
          Delayed shipment ratio is{' '}
          <strong>
            {kpi.totalShipments > 0
              ? `${((kpi.delayedShipments / kpi.totalShipments) * 100).toFixed(1)}%`
              : '0.0%'}
          </strong>
          . Use this view to trigger escalation and export daily governance packs.
        </p>
      </article>
    </section>
  );
}
