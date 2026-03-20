import React from 'react';
import { fetchAuthValidation } from '../../shared/api-client';
import {
  actionLabels,
  getRoleCapability,
  initialAccessRequests,
  initialAuditEntries,
  roleActionPolicies,
  roleAssignments,
  roleCapabilities,
  type AccessRequest,
  type AuditEntry,
  type UserRole,
} from '../access-control';

const requestableRoles = roleCapabilities
  .map((capability) => capability.role)
  .filter((role) => role !== 'ADMIN');

const buildAuditEntry = (
  request: AccessRequest,
  actorRole: UserRole,
  actor: string,
  outcome: AuditEntry['outcome']
): AuditEntry => ({
  id: `AUD-${Math.floor(Math.random() * 9000) + 1000}`,
  actor,
  actorRole,
  timestamp: '2026-03-19 12:00 UTC',
  tenant: request.tenant,
  targetUser: request.requesterName,
  oldRole: request.currentRole,
  newRole: request.requestedRole,
  reason: request.reason,
  outcome,
});

export function AccessControlPage({
  activeRole = 'ADMIN',
}: {
  activeRole?: UserRole;
}): JSX.Element {
  const [authSource, setAuthSource] = React.useState<'mock' | 'live'>('mock');
  const [authSummary, setAuthSummary] = React.useState<string>(
    'Live auth validation unavailable; governance workflow is using responsive mock fallback.'
  );
  const [requests, setRequests] = React.useState<AccessRequest[]>(initialAccessRequests);
  const [auditEntries, setAuditEntries] = React.useState<AuditEntry[]>(initialAuditEntries);
  const [formState, setFormState] = React.useState({
    requesterName: '',
    team: '',
    currentRole: 'OPERATIONS_MANAGER' as UserRole,
    requestedRole: 'PORT_ADMIN' as UserRole,
    tenant: 'port-to-shelf-india',
    reason: '',
  });

  const isAdminApprover = activeRole === 'ADMIN';
  const pendingRequests = requests.filter((request) => request.status === 'Pending Approval');

  React.useEffect(() => {
    let isMounted = true;

    const hydrateAuthValidation = async (): Promise<void> => {
      try {
        const validation = await fetchAuthValidation();
        if (!isMounted) {
          return;
        }

        setAuthSource('live');
        setAuthSummary(
          validation.valid
            ? `Live auth validation active for ${validation.userId ?? 'current session'} · roles: ${(validation.roles ?? []).join(', ') || 'none reported'}`
            : 'Live auth validation reached the backend, but the current session is not valid.'
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setAuthSource('mock');
        setAuthSummary(
          error instanceof Error
            ? `Live auth validation unavailable; governance workflow is using responsive mock fallback. ${error.message}`
            : 'Live auth validation unavailable; governance workflow is using responsive mock fallback.'
        );
      }
    };

    void hydrateAuthValidation();

    return () => {
      isMounted = false;
    };
  }, []);

  const submitRequest = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const request: AccessRequest = {
      requestId: `REQ-${Math.floor(Math.random() * 900) + 300}`,
      requesterName: formState.requesterName,
      team: formState.team,
      currentRole: formState.currentRole,
      requestedRole: formState.requestedRole,
      requestedBy: activeRole,
      status: 'Pending Approval',
      reason: formState.reason,
      tenant: formState.tenant,
      submittedAt: '2026-03-19 11:55 UTC',
    };

    setRequests((current) => [request, ...current]);
    setAuditEntries((current) => [
      buildAuditEntry(request, activeRole, formState.requesterName || 'Unknown', 'Requested'),
      ...current,
    ]);
    setFormState({
      requesterName: '',
      team: '',
      currentRole: 'OPERATIONS_MANAGER',
      requestedRole: 'PORT_ADMIN',
      tenant: 'port-to-shelf-india',
      reason: '',
    });
  };

  const reviewRequest = (requestId: string, outcome: 'Approved' | 'Rejected'): void => {
    if (!isAdminApprover) {
      return;
    }

    const existingRequest = requests.find((request) => request.requestId === requestId);

    if (!existingRequest) {
      return;
    }

    const reviewedRequest: AccessRequest = {
      ...existingRequest,
      status: outcome === 'Approved' ? 'Approved' : 'Rejected',
    };

    setRequests((current) =>
      current.map((request) => (request.requestId === requestId ? reviewedRequest : request))
    );
    setAuditEntries((current) => [
      buildAuditEntry(reviewedRequest, activeRole, 'Platform Admin', outcome),
      ...current,
    ]);
  };

  return (
    <section>
      <div className="page-hero access-control-hero">
        <div>
          <h2 className="page-heading">Access Control & Role Governance</h2>
          <p className="page-subheading">
            Manage maker-checker access requests, review auditable role changes, and keep tracking
            and auction actions configurable by role.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Approval model</div>
          <div className="hero-status-value">Maker-checker workflow enabled</div>
          <div className="kpi-trend up">
            {authSource === 'live'
              ? authSummary
              : isAdminApprover
                ? 'You can approve or reject requests as Platform Admin.'
                : 'You can submit requests, but approval is restricted to Platform Admin.'}
          </div>
        </div>
      </div>

      <div className="notice">
        Approval authority is <strong>ADMIN only</strong>. Port Admin users can create requests but
        cannot finalize approvals.
      </div>

      <div className="tracking-toolbar-summary" style={{ marginBottom: '16px' }}>
        <span className={`tag ${authSource === 'live' ? 'good' : ''}`}>
          Source: {authSource === 'live' ? 'Live auth service' : 'Mock governance fallback'}
        </span>
        <span className="tag">{authSummary}</span>
      </div>

      <div className="access-grid">
        <article className="card">
          <h3>Submit Role Assignment Request</h3>
          <form className="governance-form" onSubmit={submitRequest}>
            <input
              required
              placeholder="Requester name"
              value={formState.requesterName}
              onChange={(event) =>
                setFormState((current) => ({ ...current, requesterName: event.target.value }))
              }
            />
            <input
              required
              placeholder="Team / function"
              value={formState.team}
              onChange={(event) =>
                setFormState((current) => ({ ...current, team: event.target.value }))
              }
            />
            <select
              value={formState.currentRole}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  currentRole: event.target.value as UserRole,
                }))
              }
            >
              {requestableRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleCapability(role).label}
                </option>
              ))}
            </select>
            <select
              value={formState.requestedRole}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  requestedRole: event.target.value as UserRole,
                }))
              }
            >
              {requestableRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleCapability(role).label}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Tenant"
              value={formState.tenant}
              onChange={(event) =>
                setFormState((current) => ({ ...current, tenant: event.target.value }))
              }
            />
            <textarea
              required
              placeholder="Reason for request"
              value={formState.reason}
              onChange={(event) =>
                setFormState((current) => ({ ...current, reason: event.target.value }))
              }
              rows={4}
            />
            <button className="primary-button" type="submit">
              Submit request
            </button>
          </form>
        </article>

        <article className="card">
          <div className="card-header-row">
            <div>
              <h3>Pending Approval Queue</h3>
              <div className="kpi-label">Admin-only review queue for role changes</div>
            </div>
            <span className="tag">Pending: {pendingRequests.length}</span>
          </div>
          <div className="stack-list">
            {pendingRequests.map((request) => (
              <div className="approval-card" key={request.requestId}>
                <div className="card-header-row">
                  <div>
                    <strong>{request.requesterName}</strong>
                    <div className="kpi-label">
                      {request.requestId} · {request.team} · {request.tenant}
                    </div>
                  </div>
                  <span className="badge warn">{request.status}</span>
                </div>
                <p>
                  <strong>{getRoleCapability(request.currentRole).label}</strong> →{' '}
                  <strong>{getRoleCapability(request.requestedRole).label}</strong>
                </p>
                <p>{request.reason}</p>
                <div className="approval-actions">
                  <button
                    className="primary-button"
                    disabled={!isAdminApprover}
                    type="button"
                    onClick={() => reviewRequest(request.requestId, 'Approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="secondary-button"
                    disabled={!isAdminApprover}
                    type="button"
                    onClick={() => reviewRequest(request.requestId, 'Rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            {pendingRequests.length === 0 ? (
              <div className="notice compact-notice">
                No pending requests currently need review.
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <div className="access-grid lower-access-grid">
        <article className="card">
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
                  <td>{getRoleCapability(assignment.role).label}</td>
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

        <article className="card">
          <h3>Action Policy Matrix</h3>
          <div className="stack-list">
            {roleActionPolicies.map((policy) => (
              <div className="policy-card" key={policy.role}>
                <strong>{getRoleCapability(policy.role).label}</strong>
                <div className="kpi-label">
                  Tracking:{' '}
                  {policy.trackingActions.map((action) => actionLabels[action]).join(', ') ||
                    'None'}
                </div>
                <div className="kpi-label">
                  Auctions:{' '}
                  {policy.auctionActions.map((action) => actionLabels[action]).join(', ') || 'None'}
                </div>
                <div className={`badge ${policy.canApproveAssignments ? 'ok' : 'neutral'}`}>
                  {policy.canApproveAssignments ? 'Can approve assignments' : 'Approval disabled'}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card" style={{ marginTop: '16px' }}>
        <div className="card-header-row">
          <div>
            <h3>Audit History</h3>
            <div className="kpi-label">
              Standard governance fields: actor, timestamp, tenant, old role, new role, reason,
              outcome
            </div>
          </div>
          <span className="tag good">{auditEntries.length} events</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Timestamp</th>
              <th>Tenant</th>
              <th>Target User</th>
              <th>Role Change</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {auditEntries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  {entry.actor}
                  <div className="kpi-label">{getRoleCapability(entry.actorRole).label}</div>
                </td>
                <td>{entry.timestamp}</td>
                <td>{entry.tenant}</td>
                <td>{entry.targetUser}</td>
                <td>
                  {getRoleCapability(entry.oldRole).label} →{' '}
                  {getRoleCapability(entry.newRole).label}
                  <div className="kpi-label">{entry.reason}</div>
                </td>
                <td>
                  <span
                    className={`badge ${entry.outcome === 'Approved' ? 'ok' : entry.outcome === 'Rejected' ? 'critical' : 'warn'}`}
                  >
                    {entry.outcome}
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
