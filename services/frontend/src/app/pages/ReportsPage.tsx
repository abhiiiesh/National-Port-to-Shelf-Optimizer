import { reports } from '../mock-data';

export function ReportsPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Reports & Analytics</h2>
      <article className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Frequency</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.name}>
                <td>{report.name}</td>
                <td>{report.period}</td>
                <td>{report.updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
