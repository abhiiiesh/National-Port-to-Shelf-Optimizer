import { vesselRows } from '../mock-data';

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
