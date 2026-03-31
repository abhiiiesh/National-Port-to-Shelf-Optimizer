import React from 'react';
import { slotPlans } from '../mock-data';
import { fetchSlotRecommendations, submitSlotOverride } from '../../shared/api-client';
import { getRoleCapability, roleActionPolicies, type UserRole } from '../access-control';

type SlotRecommendation = {
  id: string;
  mode: 'Rail' | 'Road' | 'Inland';
  corridor: string;
  available: number;
  utilization: number;
  recommendedAllocation: number;
  priorityReason: string;
  status: 'HEALTHY' | 'WATCH' | 'CONSTRAINED';
};

const mockRecommendations: SlotRecommendation[] = slotPlans.map((slot, index) => ({
  id: `SLOT-${index + 1}`,
  mode: slot.mode as SlotRecommendation['mode'],
  corridor: slot.corridor,
  available: slot.available,
  utilization: slot.utilization,
  recommendedAllocation: Math.max(1, Math.floor(slot.available * 0.55)),
  priorityReason:
    slot.utilization > 80
      ? 'High utilization corridor; prioritize constrained capacity protection.'
      : 'Balanced lane health; maintain planned recommendation.',
  status: slot.utilization > 85 ? 'CONSTRAINED' : slot.utilization > 70 ? 'WATCH' : 'HEALTHY',
}));

const statusTone = (status: SlotRecommendation['status']): 'ok' | 'warn' | 'critical' => {
  if (status === 'HEALTHY') {
    return 'ok';
  }

  if (status === 'WATCH') {
    return 'warn';
  }

  return 'critical';
};

export function SlotsPage({
  activeRole = 'OPERATIONS_MANAGER',
}: {
  activeRole?: UserRole;
}): JSX.Element {
  const [recommendations, setRecommendations] =
    React.useState<SlotRecommendation[]>(mockRecommendations);
  const [dataSource, setDataSource] = React.useState<'mock' | 'live'>('mock');
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState(mockRecommendations[0]?.id ?? '');
  const [overrideAllocation, setOverrideAllocation] = React.useState(10);
  const [overrideReason, setOverrideReason] = React.useState('Operational prioritization update.');
  const policy = roleActionPolicies.find((entry) => entry.role === activeRole);
  const canOverrideSlot = (policy?.trackingActions ?? []).includes('assign-slot');

  const hydrateRecommendations = React.useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const liveRecommendations = await fetchSlotRecommendations();
      setRecommendations(liveRecommendations);
      setSelectedId(liveRecommendations[0]?.id ?? '');
      setDataSource('live');
      setMessage(
        `Live slot recommendations connected · ${liveRecommendations.length} lanes synced.`
      );
    } catch (error) {
      setRecommendations(mockRecommendations);
      setSelectedId(mockRecommendations[0]?.id ?? '');
      setDataSource('mock');
      setMessage(
        error instanceof Error
          ? `Live slot recommendations unavailable; showing mock planner fallback. ${error.message}`
          : 'Live slot recommendations unavailable; showing mock planner fallback.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void hydrateRecommendations();
  }, [hydrateRecommendations]);

  const selectedRecommendation =
    recommendations.find((recommendation) => recommendation.id === selectedId) ??
    recommendations[0] ??
    null;

  const runOverride = async (): Promise<void> => {
    if (!selectedRecommendation || !canOverrideSlot) {
      return;
    }

    setActionBusy(true);
    try {
      const result = await submitSlotOverride(
        selectedRecommendation.id,
        overrideAllocation,
        overrideReason
      );
      setDataSource('live');
      setMessage(`Live override accepted · ${result.message}`);
      setRecommendations((current) =>
        current.map((recommendation) =>
          recommendation.id === selectedRecommendation.id
            ? {
                ...recommendation,
                recommendedAllocation: overrideAllocation,
                priorityReason: `Override applied · ${overrideReason}`,
              }
            : recommendation
        )
      );
    } catch (error) {
      setDataSource('mock');
      setMessage(
        error instanceof Error
          ? `Live override unavailable; applied locally. ${error.message}`
          : 'Live override unavailable; applied locally.'
      );
      setRecommendations((current) =>
        current.map((recommendation) =>
          recommendation.id === selectedRecommendation.id
            ? {
                ...recommendation,
                recommendedAllocation: overrideAllocation,
                priorityReason: `Local override applied · ${overrideReason}`,
              }
            : recommendation
        )
      );
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <section>
      <div className="page-hero">
        <div>
          <h2 className="page-heading">Slot Planning</h2>
          <p className="page-subheading">
            Move from static slot summaries to a recommendation-driven planning workflow with
            governed override actions.
          </p>
        </div>
        <div className="hero-status-card">
          <div className="kpi-label">Slot planning status</div>
          <div className="hero-status-value">Recommendation planner active</div>
          <div className="kpi-trend up">
            {dataSource === 'live'
              ? 'Live recommendation adapter connected'
              : 'Mock planner fallback active while live endpoint is unavailable'}
          </div>
        </div>
      </div>

      <div className="tracking-toolbar-summary" style={{ marginBottom: '16px' }}>
        <span className={`tag ${dataSource === 'live' ? 'good' : ''}`}>
          Source: {dataSource === 'live' ? 'Live API' : 'Mock fallback'}
        </span>
        <span className="tag">Recommendations: {recommendations.length}</span>
        <button
          className="secondary-button"
          type="button"
          disabled={isLoading}
          onClick={() => void hydrateRecommendations()}
        >
          {isLoading ? 'Refreshing…' : 'Refresh recommendations'}
        </button>
      </div>
      {message ? <div className="notice compact-notice">{message}</div> : null}

      <div className="access-grid">
        <article className="card">
          <h3>Recommendation Board</h3>
          <div className="stack-list">
            {recommendations.map((recommendation) => (
              <button
                key={recommendation.id}
                type="button"
                className={`auction-summary-card ${selectedRecommendation?.id === recommendation.id ? 'selected' : ''}`}
                onClick={() => setSelectedId(recommendation.id)}
              >
                <div className="card-header-row">
                  <strong>{recommendation.mode}</strong>
                  <span className={`badge ${statusTone(recommendation.status)}`}>
                    {recommendation.status}
                  </span>
                </div>
                <div>{recommendation.corridor}</div>
                <div className="kpi-label">Available: {recommendation.available} slots</div>
                <div className="kpi-label">Utilization: {recommendation.utilization}%</div>
                <div className="kpi-label">
                  Recommended allocation: {recommendation.recommendedAllocation}
                </div>
              </button>
            ))}
          </div>
        </article>

        <article className="card">
          <h3>Override Planner</h3>
          {selectedRecommendation ? (
            <>
              <div className="detail-grid">
                <div className="detail-item">
                  <span>Selected lane</span>
                  <strong>{selectedRecommendation.corridor}</strong>
                </div>
                <div className="detail-item">
                  <span>Mode</span>
                  <strong>{selectedRecommendation.mode}</strong>
                </div>
                <div className="detail-item">
                  <span>Current recommendation</span>
                  <strong>{selectedRecommendation.recommendedAllocation} slots</strong>
                </div>
                <div className="detail-item">
                  <span>Role policy</span>
                  <strong>
                    {canOverrideSlot
                      ? 'Override permitted'
                      : `${getRoleCapability(activeRole).label} cannot assign slots`}
                  </strong>
                </div>
              </div>

              <div className="drawer-section">
                <div className="section-label">Priority explanation</div>
                <p>{selectedRecommendation.priorityReason}</p>
              </div>

              <div className="governance-form">
                <input
                  type="number"
                  min={1}
                  value={overrideAllocation}
                  onChange={(event) => setOverrideAllocation(Number(event.target.value))}
                />
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(event) => setOverrideReason(event.target.value)}
                />
                <button
                  className="primary-button"
                  type="button"
                  disabled={actionBusy || !canOverrideSlot}
                  title={
                    canOverrideSlot
                      ? 'Submit slot override'
                      : `${getRoleCapability(activeRole).label} does not have slot override permission`
                  }
                  onClick={() => void runOverride()}
                >
                  {actionBusy ? 'Submitting…' : 'Apply override'}
                </button>
              </div>
            </>
          ) : (
            <div className="notice">Select a recommendation to inspect and apply override.</div>
          )}
        </article>
      </div>
    </section>
  );
}
