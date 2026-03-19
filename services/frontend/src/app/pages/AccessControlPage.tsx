import { roleAssignments, roleCapabilities } from '../access-control';

export function AccessControlPage(): JSX.Element {
  return (
    <section>
      <h2 className="page-heading">Access Control & Role Governance</h2>
      <div className="notice">
        Platform admins can assign operational roles, review escalations, and govern feature access
        by stakeholder group.
      </div>

      <div className="grid kpis" style={{ marginTop: '16px' }}>
        {roleCapabilities.map((capability) => (
          <article className="card" key={capability.role}>
            <h3>{capability.label}</h3>
            <div className="kpi-label">{capability.description}</div>
            <ul>
              {capability.permissions.map((permission) => (
                <li key={permission}>{permission}</li>
              ))}
            </ul>
            <div className="kpi-trend up">Default landing route: {capability.defaultRoute}</div>
          </article>
        ))}
      </div>

      <article className="card" style={{ marginTop: '16px' }}>
        <h3>Current User Assignments</h3>
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Team</th>
              <th>Assigned Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {roleAssignments.map((assignment) => (
              <tr key={assignment.name}>
                <td>{assignment.name}</td>
                <td>{assignment.team}</td>
                <td>{assignment.role}</td>
                <td>
                  <span className={`badge ${assignment.status === 'Active' ? 'ok' : 'warn'}`}>
                    {assignment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
