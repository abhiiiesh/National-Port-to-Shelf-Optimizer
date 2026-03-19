import React from 'react';
import { trackingRecords, type TrackingRecord } from '../mock-data';

const statusOptions = ['All statuses', 'On Track', 'Delay Risk', 'Escalated'] as const;
const modeOptions = ['All modes', 'Rail', 'Road', 'Inland'] as const;
const priorityOptions = ['All priorities', 'High', 'Medium', 'Low'] as const;

const matchesOption = (value: string, selected: string, allLabel: string): boolean =>
  selected === allLabel || value === selected;

const badgeClassForStatus = (status: TrackingRecord['status']): string => {
  if (status === 'On Track') {
    return 'ok';
  }

  if (status === 'Delay Risk') {
    return 'warn';
  }

  return 'critical';
};

export function TrackingPage(): JSX.Element {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] =
    React.useState<(typeof statusOptions)[number]>('All statuses');
  const [modeFilter, setModeFilter] = React.useState<(typeof modeOptions)[number]>('All modes');
  const [priorityFilter, setPriorityFilter] =
    React.useState<(typeof priorityOptions)[number]>('All priorities');
  const [selectedRecordId, setSelectedRecordId] = React.useState(trackingRecords[0]?.id ?? '');

  const filteredRecords = React.useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return trackingRecords.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [record.id, record.containerId, record.vessel, record.route, record.terminal, record.owner]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);

      return (
        matchesQuery &&
        matchesOption(record.status, statusFilter, 'All statuses') &&
        matchesOption(record.mode, modeFilter, 'All modes') &&
        matchesOption(record.priority, priorityFilter, 'All priorities')
      );
    });
  }, [modeFilter, priorityFilter, query, statusFilter]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ?? filteredRecords[0] ?? null;

  React.useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    if (selectedRecord.id !== selectedRecordId) {
      setSelectedRecordId(selectedRecord.id);
    }
  }, [selectedRecord, selectedRecordId]);

  return (
    <section>
      <div className="page-hero tracking-hero">
        <div>
          <h2 className="page-heading">Vessel & Container Tracking</h2>
          <p className="page-subheading">
            Search live movements, narrow exception queues with filters, and inspect a shipment’s
            operational timeline before taking action.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Tracking milestone</div>
          <div className="hero-status-value">
            Search, filters, sticky grid, drawer, and timeline live
          </div>
          <div className="kpi-trend up">Mock-first UX is now ready for API adapter wiring</div>
        </div>
      </div>

      <div className="tracking-toolbar card">
        <div className="page-controls tracking-controls">
          <input
            aria-label="Search tracking records"
            placeholder="Search by tracking ID, container, vessel, route, terminal, owner"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as (typeof statusOptions)[number])
            }
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={modeFilter}
            onChange={(event) => setModeFilter(event.target.value as (typeof modeOptions)[number])}
          >
            {modeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as (typeof priorityOptions)[number])
            }
          >
            {priorityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="tracking-toolbar-summary">
          <span className="tag">Visible records: {filteredRecords.length}</span>
          <span className="tag">
            High priority: {filteredRecords.filter((record) => record.priority === 'High').length}
          </span>
        </div>
      </div>

      <div className="tracking-layout">
        <article className="card tracking-table-card">
          <div className="card-header-row">
            <div>
              <h3>Shipment Watchlist</h3>
              <div className="kpi-label">
                Select a row to inspect detail, SLA risk, and milestone progression
              </div>
            </div>
            <span className="tag good">Sticky header enabled</span>
          </div>

          <div className="table-scroll">
            <table className="table tracking-table">
              <thead>
                <tr>
                  <th>Tracking ID</th>
                  <th>Container</th>
                  <th>Vessel</th>
                  <th>Route</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>SLA</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={selectedRecord?.id === record.id ? 'selected-row' : ''}
                    onClick={() => setSelectedRecordId(record.id)}
                  >
                    <td>{record.id}</td>
                    <td>{record.containerId}</td>
                    <td>{record.vessel}</td>
                    <td>{record.route}</td>
                    <td>{record.eta}</td>
                    <td>
                      <span className={`badge ${badgeClassForStatus(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                    <td>{record.mode}</td>
                    <td>{record.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="notice compact-notice">
              No tracking records matched the current search and filter criteria.
            </div>
          ) : null}
        </article>

        <aside className="card tracking-drawer">
          {selectedRecord ? (
            <>
              <div className="card-header-row">
                <div>
                  <h3>{selectedRecord.containerId}</h3>
                  <div className="kpi-label">
                    {selectedRecord.id} · {selectedRecord.vessel}
                  </div>
                </div>
                <span className={`badge ${badgeClassForStatus(selectedRecord.status)}`}>
                  {selectedRecord.status}
                </span>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <span>Route</span>
                  <strong>{selectedRecord.route}</strong>
                </div>
                <div className="detail-item">
                  <span>ETA</span>
                  <strong>{selectedRecord.eta}</strong>
                </div>
                <div className="detail-item">
                  <span>Terminal</span>
                  <strong>{selectedRecord.terminal}</strong>
                </div>
                <div className="detail-item">
                  <span>Owner</span>
                  <strong>{selectedRecord.owner}</strong>
                </div>
                <div className="detail-item">
                  <span>Mode</span>
                  <strong>{selectedRecord.mode}</strong>
                </div>
                <div className="detail-item">
                  <span>Priority</span>
                  <strong>{selectedRecord.priority}</strong>
                </div>
              </div>

              <div className="drawer-section">
                <div className="section-label">Delay / exception context</div>
                <p>{selectedRecord.delayReason}</p>
              </div>

              <div className="drawer-section">
                <div className="section-label">Assigned next action</div>
                <div className="action-summary">{selectedRecord.assignedAction}</div>
              </div>

              <div className="drawer-section">
                <div className="section-label">Shipment status timeline</div>
                <div className="milestone-list">
                  {selectedRecord.milestones.map((milestone) => (
                    <div className={`milestone-item ${milestone.status}`} key={milestone.code}>
                      <div className="milestone-dot" />
                      <div>
                        <strong>{milestone.label}</strong>
                        <div className="kpi-label">
                          {milestone.code} · {milestone.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="notice">
              Select a tracking record to open the shipment detail drawer.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
