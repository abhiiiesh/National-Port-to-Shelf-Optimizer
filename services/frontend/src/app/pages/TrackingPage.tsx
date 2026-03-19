import { vesselRows } from '../mock-data';

export function TrackingPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Vessel & Container Tracking</h2>
      <div className="page-controls">
        <input placeholder="Search vessel / container" />
        <select defaultValue="all">
          <option value="all">All statuses</option>
          <option value="on-track">On Track</option>
          <option value="risk">Delay Risk</option>
        </select>
        <select defaultValue="all-routes">
          <option value="all-routes">All routes</option>
          <option value="mum-del">MUM → DEL</option>
          <option value="chn-kol">CHN → KOL</option>
        </select>
      </div>
      <article className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Vessel</th>
              <th>Route</th>
              <th>ETA</th>
              <th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {vesselRows.map((row) => (
              <tr key={row.vessel}>
                <td>{row.vessel}</td>
                <td>{row.route}</td>
                <td>{row.eta}</td>
                <td>{row.status === 'On Track' ? 'Low' : 'High'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
