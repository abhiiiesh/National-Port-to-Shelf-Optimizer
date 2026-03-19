import { kpiCards, newsItems, vesselRows } from '../mock-data';

export function DashboardPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Operations Dashboard</h2>
      <div className="grid kpis">
        {kpiCards.map((kpi) => (
          <article className="card" key={kpi.label}>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className={`kpi-trend ${kpi.tone}`}>{kpi.trend}</div>
          </article>
        ))}
      </div>

      <div className="section-grid">
        <article className="card">
          <h3>Live Vessel & Container Watch</h3>
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

        <aside className="grid">
          <article className="card">
            <h3>Throughput Progress</h3>
            <div className="kpi-label">Container handoff completion</div>
            <div className="progress">
              <span style={{ width: '82%' }} />
            </div>
            <div className="kpi-trend up">82% complete in current cycle</div>
          </article>
          <article className="card">
            <h3>Ops News</h3>
            <ul>
              {newsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </aside>
      </div>

      <div className="notice">
        Alert: 2 high-risk containers need reassignment within next 45 minutes.
      </div>
    </section>
  );
}
