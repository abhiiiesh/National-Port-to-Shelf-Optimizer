import React from 'react';
import { fetchPerformance, fetchVessels } from '../../shared/api-client';

type BulletinSeverity = 'Critical' | 'Warning' | 'Info';

interface OperationalBulletin {
  id: string;
  title: string;
  message: string;
  severity: BulletinSeverity;
  incidentLink: string;
  acknowledged: boolean;
  timestamp: string;
}

const fallbackBulletins: OperationalBulletin[] = [
  {
    id: 'OPS-401',
    title: 'ULIP sync lag observed in west corridor',
    message: 'Sync delay exceeded 8 minutes on two terminal connectors.',
    severity: 'Warning',
    incidentLink: 'INC-ULIP-4098',
    acknowledged: false,
    timestamp: '2026-04-01 08:10 UTC',
  },
  {
    id: 'OPS-402',
    title: 'Auction lane saturation alert',
    message: 'East Coast Express lane has entered high-demand threshold.',
    severity: 'Critical',
    incidentLink: 'INC-AUC-7712',
    acknowledged: false,
    timestamp: '2026-04-01 08:16 UTC',
  },
  {
    id: 'OPS-403',
    title: 'Rail capacity expansion confirmed',
    message: 'Capacity expanded by 8% for next 72h planning horizon.',
    severity: 'Info',
    incidentLink: 'INC-CAP-2188',
    acknowledged: true,
    timestamp: '2026-04-01 07:40 UTC',
  },
];

export function NewsPage(): JSX.Element {
  const [dataSource, setDataSource] = React.useState<'mock' | 'live'>('mock');
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = React.useState<'All' | BulletinSeverity>('All');
  const [bulletins, setBulletins] = React.useState<OperationalBulletin[]>(fallbackBulletins);

  const hydrateOperationalNews = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [performance, vessels] = await Promise.all([fetchPerformance(), fetchVessels()]);
      const liveBulletins: OperationalBulletin[] = [
        {
          id: 'OPS-LIVE-1',
          title: 'Transit delay variance update',
          message: `${performance.delayedShipments} delayed shipments out of ${performance.totalShipments} in active window.`,
          severity: performance.delayedShipments > 15 ? 'Critical' : 'Warning',
          incidentLink: 'INC-LIVE-ETA',
          acknowledged: false,
          timestamp: '2026-04-01 08:20 UTC',
        },
        {
          id: 'OPS-LIVE-2',
          title: 'Vessel operations bulletin',
          message: `${vessels.length} vessels currently in active tracking scope.`,
          severity: 'Info',
          incidentLink: 'INC-LIVE-VES',
          acknowledged: false,
          timestamp: '2026-04-01 08:21 UTC',
        },
      ];
      setBulletins(liveBulletins);
      setDataSource('live');
      setMessage('Live operational bulletins are connected.');
    } catch (error) {
      setBulletins(fallbackBulletins);
      setDataSource('mock');
      setMessage(
        error instanceof Error
          ? `Live bulletin feed unavailable; using fallback communications. ${error.message}`
          : 'Live bulletin feed unavailable; using fallback communications.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void hydrateOperationalNews();
  }, [hydrateOperationalNews]);

  const filteredBulletins = bulletins.filter(
    (bulletin) => severityFilter === 'All' || bulletin.severity === severityFilter
  );

  const acknowledgeBulletin = (id: string): void => {
    setBulletins((current) =>
      current.map((bulletin) =>
        bulletin.id === id ? { ...bulletin, acknowledged: true } : bulletin
      )
    );
  };

  return (
    <section>
      <div className="page-hero">
        <div>
          <h2 className="page-heading">Operations News</h2>
          <p className="page-subheading">
            Severity-aware operational communications with acknowledgement and incident-linked
            bulletin context.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Communications source</div>
          <div className="hero-status-value">
            {dataSource === 'live' ? 'Live operational feed' : 'Fallback bulletin feed'}
          </div>
          <div className="kpi-trend up">
            {dataSource === 'live'
              ? 'Incident bulletin stream connected'
              : 'Fallback stream active while live feed is unavailable'}
          </div>
        </div>
      </div>

      <div className="tracking-toolbar-summary" style={{ marginBottom: '16px' }}>
        <span className={`tag ${dataSource === 'live' ? 'good' : ''}`}>
          Source: {dataSource === 'live' ? 'Live API' : 'Fallback'}
        </span>
        <select
          value={severityFilter}
          onChange={(event) => setSeverityFilter(event.target.value as 'All' | BulletinSeverity)}
        >
          <option value="All">All severities</option>
          <option value="Critical">Critical</option>
          <option value="Warning">Warning</option>
          <option value="Info">Info</option>
        </select>
        <button
          className="secondary-button"
          type="button"
          disabled={isLoading}
          onClick={() => void hydrateOperationalNews()}
        >
          {isLoading ? 'Refreshing…' : 'Refresh bulletins'}
        </button>
      </div>
      {message ? <div className="notice compact-notice">{message}</div> : null}

      <article className="card">
        <div className="stack-list">
          {filteredBulletins.map((bulletin) => (
            <div className="approval-card" key={bulletin.id}>
              <div className="card-header-row">
                <strong>{bulletin.title}</strong>
                <span
                  className={`badge ${
                    bulletin.severity === 'Critical'
                      ? 'critical'
                      : bulletin.severity === 'Warning'
                        ? 'warn'
                        : 'ok'
                  }`}
                >
                  {bulletin.severity}
                </span>
              </div>
              <p>{bulletin.message}</p>
              <div className="kpi-label">
                Incident: {bulletin.incidentLink} · {bulletin.timestamp}
              </div>
              <div className="approval-actions">
                <span className={`badge ${bulletin.acknowledged ? 'ok' : 'warn'}`}>
                  {bulletin.acknowledged ? 'Acknowledged' : 'Pending acknowledgement'}
                </span>
                <button
                  className="secondary-button"
                  type="button"
                  disabled={bulletin.acknowledged}
                  onClick={() => acknowledgeBulletin(bulletin.id)}
                >
                  {bulletin.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                </button>
              </div>
            </div>
          ))}
          {filteredBulletins.length === 0 ? (
            <div className="notice compact-notice">No bulletins for the selected severity.</div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
