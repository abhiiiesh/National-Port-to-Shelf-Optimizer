import {
  activityFeed,
  corridorHealth,
  dashboardAlerts,
  kpiCards,
  newsItems,
  quickActions,
  vesselRows,
} from '../mock-data';

export function DashboardPage(): JSX.Element {
  return (
    <section>
      <div className="page-hero">
        <div>
          <h2 className="page-heading">Operations Dashboard</h2>
          <p className="page-subheading">
            Monitor multimodal flow, triage operational alerts, and launch response actions from a
            single command surface.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Network posture</div>
          <div className="hero-status-value">Stable with 2 active interventions</div>
          <div className="kpi-trend up">Last orchestration refresh 4 minutes ago</div>
        </div>
      </div>

      <div className="grid kpis">
        {kpiCards.map((kpi) => (
          <article className="card" key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className={`kpi-trend ${kpi.tone}`}>{kpi.trend}</div>
          </article>
        ))}
      </div>

      <div className="section-grid dashboard-grid">
        <article className="card">
          <div className="card-header-row">
            <div>
              <h3>Live Vessel & Container Watch</h3>
              <div className="kpi-label">Priority arrivals, handoff risk, and ETA watchlist</div>
            </div>
            <span className="tag">4 active watches</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Vessel</th>
                <th>Route</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {vesselRows.map((row) => (
                <tr key={row.vessel}>
                  <td>{row.vessel}</td>
                  <td>{row.route}</td>
                  <td>{row.eta}</td>
                  <td>
                    <span className={`badge ${row.status === 'On Track' ? 'ok' : 'warn'}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <aside className="grid dashboard-side-rail">
          <article className="card">
            <h3>Quick Actions</h3>
            <div className="stack-list">
              {quickActions.map((action) => (
                <button className="action-tile" key={action.title} type="button">
                  <strong>{action.title}</strong>
                  <span>{action.detail}</span>
                </button>
              ))}
            </div>
          </article>

          <article className="card">
            <h3>Throughput Progress</h3>
            <div className="kpi-label">Container handoff completion</div>
            <div className="progress">
              <span style={{ width: '82%' }} />
            </div>
            <div className="kpi-trend up">82% complete in current cycle</div>
          </article>
        </aside>
      </div>

      <div className="section-grid dashboard-lower-grid">
        <article className="card">
          <div className="card-header-row">
            <div>
              <h3>Operational Alerts</h3>
              <div className="kpi-label">
                Triage critical issues before SLA breach windows are hit
              </div>
            </div>
            <span className="tag good">3 monitored</span>
          </div>
          <div className="stack-list">
            {dashboardAlerts.map((alert) => (
              <div className={`alert-card ${alert.severity}`} key={alert.title}>
                <div className="alert-card-header">
                  <strong>{alert.title}</strong>
                  <span className="badge neutral">{alert.owner}</span>
                </div>
                <p>{alert.detail}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h3>Ops Activity Feed</h3>
          <div className="timeline-list">
            {activityFeed.map((entry) => (
              <div className="timeline-item" key={`${entry.time}-${entry.actor}`}>
                <div className="timeline-time">{entry.time}</div>
                <div>
                  <strong>{entry.actor}</strong>
                  <p>{entry.action}</p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="section-grid dashboard-lower-grid">
        <article className="card">
          <h3>Corridor Health Summary</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Corridor</th>
                <th>Utilization</th>
                <th>ETA Variance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {corridorHealth.map((row) => (
                <tr key={row.corridor}>
                  <td>{row.corridor}</td>
                  <td>{row.utilization}%</td>
                  <td>{row.etaVariance}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === 'Healthy'
                          ? 'ok'
                          : row.status === 'Watch'
                            ? 'warn'
                            : 'critical'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="card">
          <h3>Ops News</h3>
          <ul className="news-list">
            {newsItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="notice compact-notice">
            Next recommended step: validate container exception routing before the 12:30 dispatch
            cut.
          </div>
        </article>
      </div>
    </section>
  );
}
